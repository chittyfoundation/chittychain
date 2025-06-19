import { db } from '../storage.js';
import { property_nfts } from '@shared/schema.js';
import { eq, count, desc } from 'drizzle-orm';

export class PropertyService {
  async getPropertyStats() {
    try {
      // Get total properties
      const totalProperties = await db
        .select({ count: count() })
        .from(property_nfts);

      // Get active properties
      const activeProperties = await db
        .select({ count: count() })
        .from(property_nfts)
        .where(eq(property_nfts.active, true));

      // Get recent properties
      const recentProperties = await db
        .select()
        .from(property_nfts)
        .orderBy(desc(property_nfts.mintedAt))
        .limit(5);

      // Calculate total value (sum of all property values)
      const properties = await db.select().from(property_nfts);
      const totalValue = properties.reduce((sum, p) => {
        const metadata = JSON.parse(p.metadata || '{}');
        return sum + (metadata.value || 0);
      }, 0);

      return {
        total: totalProperties[0]?.count || 0,
        active: activeProperties[0]?.count || 0,
        totalValue,
        recentProperties: recentProperties.map(p => ({
          tokenId: p.tokenId,
          propertyAddress: p.propertyAddress,
          owner: p.owner,
          mintedAt: p.mintedAt
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get property stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validatePropertyOwnership(tokenId, claimedOwner) {
    try {
      const [property] = await db
        .select()
        .from(property_nfts)
        .where(eq(property_nfts.tokenId, tokenId))
        .limit(1);

      if (!property) {
        return false;
      }

      return property.owner === claimedOwner;
    } catch (error) {
      throw new Error(`Failed to validate property ownership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transferProperty(tokenId, fromOwner, toOwner) {
    try {
      // Validate current ownership
      const isOwner = await this.validatePropertyOwnership(tokenId, fromOwner);
      if (!isOwner) {
        throw new Error('Current owner does not match');
      }

      // Update ownership
      await db
        .update(property_nfts)
        .set({ 
          owner: toOwner,
          updatedAt: new Date()
        })
        .where(eq(property_nfts.tokenId, tokenId));

      return true;
    } catch (error) {
      throw new Error(`Failed to transfer property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyHistory(tokenId) {
    try {
      const [property] = await db
        .select()
        .from(property_nfts)
        .where(eq(property_nfts.tokenId, tokenId))
        .limit(1);

      if (!property) {
        return null;
      }

      // In production, this would query a separate history table
      const metadata = JSON.parse(property.metadata || '{}');
      
      return {
        tokenId: property.tokenId,
        currentOwner: property.owner,
        propertyAddress: property.propertyAddress,
        mintedAt: property.mintedAt,
        transferHistory: metadata.transferHistory || [],
        blockNumber: property.blockNumber
      };
    } catch (error) {
      throw new Error(`Failed to get property history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePropertyMetadata(propertyData) {
    return {
      address: propertyData.address,
      city: propertyData.city,
      state: propertyData.state,
      zipCode: propertyData.zipCode,
      propertyType: propertyData.propertyType,
      squareFeet: propertyData.squareFeet,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      yearBuilt: propertyData.yearBuilt,
      value: propertyData.value,
      legalDescription: propertyData.legalDescription,
      parcelNumber: propertyData.parcelNumber,
      timestamp: new Date().toISOString()
    };
  }
}