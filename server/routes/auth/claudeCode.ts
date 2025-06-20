import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { env } from '../../config/environment';

const router = Router();

// Claude Code OAuth configuration
const CLAUDE_CODE_CONFIG = {
  clientId: env.CLAUDE_CLIENT_ID || '',
  clientSecret: env.CLAUDE_CLIENT_SECRET || '',
  redirectUri: `${env.CLIENT_URL}/auth/callback`,
  tokenEndpoint: 'https://claude.ai/oauth/token',
  userEndpoint: 'https://claude.ai/api/user',
};

// Validation schemas
const callbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

const claudeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().optional(),
  subscription_tier: z.string().optional(),
});

/**
 * Handle Claude Code OAuth callback
 */
router.post('/callback', async (req, res) => {
  try {
    const { code } = callbackSchema.parse(req.body);

    // Exchange code for access token
    const tokenResponse = await axios.post(CLAUDE_CODE_CONFIG.tokenEndpoint, {
      grant_type: 'authorization_code',
      code,
      client_id: CLAUDE_CODE_CONFIG.clientId,
      client_secret: CLAUDE_CODE_CONFIG.clientSecret,
      redirect_uri: CLAUDE_CODE_CONFIG.redirectUri,
    });

    const { access_token } = tokenResponse.data;

    // Fetch user information from Claude
    const userResponse = await axios.get(CLAUDE_CODE_CONFIG.userEndpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const claudeUser = claudeUserSchema.parse(userResponse.data);

    // Check if user exists
    let user = await db.query.users.findFirst({
      where: eq(users.email, claudeUser.email),
    });

    if (!user) {
      // Create new user with Claude Code authentication
      const registrationNumber = `REG${Date.now().toString().slice(-8)}`;
      const barNumber = `BAR${Math.random().toString().slice(2, 8)}`;

      [user] = await db
        .insert(users)
        .values({
          email: claudeUser.email,
          name: claudeUser.name,
          password_hash: '', // No password for OAuth users
          registration_number: registrationNumber,
          bar_number: barNumber,
          role: 'attorney',
          is_active: true,
          two_factor_enabled: false,
          claude_user_id: claudeUser.id,
          subscription_tier: claudeUser.subscription_tier || 'free',
          auth_provider: 'claude_code',
          last_login: new Date(),
        })
        .returning();
    } else {
      // Update existing user
      await db
        .update(users)
        .set({
          last_login: new Date(),
          claude_user_id: claudeUser.id,
          subscription_tier: claudeUser.subscription_tier || user.subscription_tier,
        })
        .where(eq(users.id, user.id));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        authProvider: 'claude_code',
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        registration_number: user.registration_number,
        bar_number: user.bar_number,
        subscription_tier: user.subscription_tier,
        auth_provider: 'claude_code',
      },
    });
  } catch (error) {
    console.error('Claude Code authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Validate Anthropic API Key
 */
router.post('/api-key', async (req, res) => {
  try {
    const { apiKey } = z.object({ apiKey: z.string().startsWith('sk-ant-') }).parse(req.body);

    // Validate API key with Anthropic
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      // API key is valid, create or update user
      const email = `api-${apiKey.slice(7, 15)}@chittychain.com`;
      
      let user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        // Create new API key user
        const registrationNumber = `REG${Date.now().toString().slice(-8)}`;
        const barNumber = `API${apiKey.slice(-6)}`;

        [user] = await db
          .insert(users)
          .values({
            email,
            name: 'API Key User',
            password_hash: '',
            registration_number: registrationNumber,
            bar_number: barNumber,
            role: 'api_user',
            is_active: true,
            two_factor_enabled: false,
            api_key_hash: apiKey, // In production, hash this
            auth_provider: 'api_key',
            subscription_tier: 'api',
            last_login: new Date(),
          })
          .returning();
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          authProvider: 'api_key',
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'API key validated successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription_tier: 'api',
          auth_provider: 'api_key',
        },
      });
    }
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided Anthropic API key is invalid or expired',
    });
  }
});

/**
 * Get Claude Code authorization URL
 */
router.get('/authorize-url', (req, res) => {
  const authUrl = `https://claude.ai/authorize?client_id=${CLAUDE_CODE_CONFIG.clientId}&redirect_uri=${encodeURIComponent(CLAUDE_CODE_CONFIG.redirectUri)}&response_type=code&scope=read:user`;
  
  res.json({ authUrl });
});

export default router;