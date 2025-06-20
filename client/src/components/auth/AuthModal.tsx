import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, Shield, Key, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { toast } = useToast();

  const handleAnthropicLogin = async () => {
    setIsLoading(true);
    try {
      // Implement Anthropic API key login
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "API Key Validated",
        description: "Welcome to ChittyChain Elite Access",
      });
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid API key provided",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaudeCodeLogin = () => {
    // Redirect to Claude Code OAuth flow
    window.location.href = `https://claude.ai/authorize?client_id=${process.env.VITE_CLAUDE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&response_type=code&scope=read:user`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="border-0 bg-gradient-to-b from-gray-900 to-black p-8 shadow-2xl">
              <div className="mb-8 text-center">
                <motion.div
                  className="inline-flex p-3 mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Shield className="w-8 h-8 text-amber-500" />
                </motion.div>
                <h2 className="text-2xl font-serif text-white">ChittyChain Access</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Elite Legal Evidence Management
                </p>
              </div>

              <Tabs defaultValue="traditional" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
                  <TabsTrigger 
                    value="traditional" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-amber-600/20"
                  >
                    Traditional
                  </TabsTrigger>
                  <TabsTrigger 
                    value="advanced"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-violet-600/20"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="traditional" className="space-y-4">
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="legal@firm.com"
                          className="pl-10 bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          "Access ChittyChain"
                        )}
                      </Button>
                    </motion.div>

                    <div className="text-center">
                      <button
                        type="button"
                        className="text-sm text-gray-400 hover:text-amber-500 transition-colors"
                        onClick={() => setShowQR(true)}
                      >
                        Set up two-factor authentication
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleClaudeCodeLogin}
                        className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Continue with Claude Code
                      </Button>
                    </motion.div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="px-2 text-gray-600 bg-black">or</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="text-gray-300">Anthropic API Key</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="sk-ant-api03-..."
                          className="pl-10 bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500/50 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleAnthropicLogin}
                        className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium"
                        disabled={isLoading}
                      >
                        Authenticate with API Key
                      </Button>
                    </motion.div>
                  </div>

                  <p className="text-xs text-center text-gray-500">
                    API keys provide programmatic access to ChittyChain's legal infrastructure
                  </p>
                </TabsContent>
              </Tabs>

              <div className="mt-8 pt-6 border-t border-gray-900">
                <p className="text-xs text-center text-gray-600">
                  By accessing ChittyChain, you agree to our{' '}
                  <a href="#" className="text-amber-500 hover:text-amber-400">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-amber-500 hover:text-amber-400">Privacy Policy</a>
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}