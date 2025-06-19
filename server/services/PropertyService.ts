import crypto from 'crypto';
import { IPFSService } from './IPFSService.js';

export interface PropertyNFT {
  tokenId: number;
  contractAddress: string;
  propertyAddress: string;
  owner: string;
  metadata: PropertyMetadata;
  conditionScore: number;
  lastInspection?: Date;
  ipfsMetadata: string;
  blockNumber?: number;
  mintedAt: Date;
}

export interface PropertyMetadata {
  legalDescription: string;
  squareFootage: number;
  propertyType: string;
  yearBuilt: number;
  marketValue: number;
  assessedValue?: number;
  features: string[];
  images: string[];
  documents: string[];
}

export interface ConditionHistory {
  timestamp: Date;
  conditionScore: number;
  inspectionType: string;
  inspector: string;
  ipfsReport: string;
  notes: string;
  improvements?: PropertyImprovement[];
}

export interface PropertyImprovement {
  timestamp: Date;
  improvementType: string;
  costEstimate: number;
  conditionImpact: number;
  reportedBy: string;
  verified: boolean;
  rewardAmount: number;
  beforeImages?: string[];
  afterImages?: string[];
}

export interface ChittyCashReward {
  amount: number;
  reason: string;
  propertyId: number;
  earnedBy: string;
  timestamp: Date;
  transactionHash: string;
}

export class PropertyService {
  private ipfsService: IPFSService;
  private nextTokenId: number = 1;
  private BASE_CONDITION_SCORE = 70;
  private MAX_CONDITION_SCORE = 100;
  private CHITTY_CASH_MULTIPLIER = 10;

  constructor() {
    this.ipfsService = new IPFSService();
  }

  public async mintPropertyNFT(
    propertyAddress: string,
    owner: string,
    metadata: PropertyMetadata
  ): Promise<PropertyNFT> {
    try {
      // Store metadata in IPFS
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const ipfsHash = await this.ipfsService.addFile(metadataBuffer);
      
      const tokenId = this.nextTokenId++;
      
      const propertyNFT: PropertyNFT = {
        tokenId,
        contractAddress: '0x742d35Cc6634C0532925a3b6a1c7b6f6c2f8932a', // Mock contract address
        propertyAddress,
        owner,
        metadata,
        conditionScore: this.BASE_CONDITION_SCORE,
        ipfsMetadata: ipfsHash,
        mintedAt: new Date(),
      };

      return propertyNFT;
    } catch (error) {
      throw new Error(`Failed to mint property NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async updateConditionScore(
    tokenId: number,
    newScore: number,
    inspectionType: string,
    inspector: string,
    notes: string,
    reportData?: any
  ): Promise<{
    oldScore: number;
    newScore: number;
    improvement: number;
    rewardAmount: number;
  }> {
    try {
      if (newScore < 0 || newScore > this.MAX_CONDITION_SCORE) {
        throw new Error('Invalid condition score');
      }

      // In a real implementation, this would fetch from database
      const oldScore = this.BASE_CONDITION_SCORE; // Mock current score
      const improvement = newScore - oldScore;
      
      // Store inspection report in IPFS if provided
      let ipfsReport = '';
      if (reportData) {
        const reportBuffer = Buffer.from(JSON.stringify(reportData));
        ipfsReport = await this.ipfsService.addFile(reportBuffer);
      }

      // Create condition history record
      const conditionRecord: ConditionHistory = {
        timestamp: new Date(),
        conditionScore: newScore,
        inspectionType,
        inspector,
        ipfsReport,
        notes,
      };

      // Calculate ChittyCash reward for improvement
      let rewardAmount = 0;
      if (improvement > 0) {
        rewardAmount = improvement * this.CHITTY_CASH_MULTIPLIER;
      }

      return {
        oldScore,
        newScore,
        improvement,
        rewardAmount,
      };
    } catch (error) {
      throw new Error(`Failed to update condition score: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async recordImprovement(
    tokenId: number,
    improvementType: string,
    costEstimate: number,
    expectedConditionImpact: number,
    reportedBy: string,
    beforeImages?: Buffer[],
    afterImages?: Buffer[]
  ): Promise<PropertyImprovement> {
    try {
      // Store images in IPFS if provided
      const beforeImageHashes: string[] = [];
      const afterImageHashes: string[] = [];

      if (beforeImages) {
        for (const image of beforeImages) {
          const hash = await this.ipfsService.addFile(image);
          beforeImageHashes.push(hash);
        }
      }

      if (afterImages) {
        for (const image of afterImages) {
          const hash = await this.ipfsService.addFile(image);
          afterImageHashes.push(hash);
        }
      }

      const improvement: PropertyImprovement = {
        timestamp: new Date(),
        improvementType,
        costEstimate,
        conditionImpact: expectedConditionImpact,
        reportedBy,
        verified: false,
        rewardAmount: 0,
        beforeImages: beforeImageHashes,
        afterImages: afterImageHashes,
      };

      return improvement;
    } catch (error) {
      throw new Error(`Failed to record improvement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async verifyImprovement(
    tokenId: number,
    improvementIndex: number,
    actualConditionImpact: number,
    verifiedBy: string
  ): Promise<{
    improvement: PropertyImprovement;
    rewardAmount: number;
  }> {
    try {
      // In a real implementation, this would update the database
      // For now, we calculate the reward and return mock data
      
      const rewardAmount = actualConditionImpact * this.CHITTY_CASH_MULTIPLIER * 2; // Bonus for verified improvements
      
      const verifiedImprovement: PropertyImprovement = {
        timestamp: new Date(),
        improvementType: 'verified-improvement',
        costEstimate: 0,
        conditionImpact: actualConditionImpact,
        reportedBy: verifiedBy,
        verified: true,
        rewardAmount,
      };

      return {
        improvement: verifiedImprovement,
        rewardAmount,
      };
    } catch (error) {
      throw new Error(`Failed to verify improvement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public calculateCleanPlateReward(baselineScore: number, checkoutScore: number): ChittyCashReward {
    const improvement = checkoutScore - baselineScore;
    let rewardAmount = 0;
    let reason = '';

    if (improvement >= 0.5) {
      rewardAmount = 50;
      reason = 'Clean Plate Champion - Property Angel Status';
    } else if (improvement >= 0.2) {
      rewardAmount = 25;
      reason = 'Good Guest - Responsible Traveler';
    } else if (improvement >= 0) {
      rewardAmount = 10;
      reason = 'Respectful Guest - No Damage Bonus';
    } else {
      // Penalty for condition loss
      rewardAmount = Math.abs(improvement) * -100; // $1 per 0.01 point lost
      reason = 'Condition Loss Fee';
    }

    return {
      amount: rewardAmount,
      reason,
      propertyId: 0, // Would be set by caller
      earnedBy: '', // Would be set by caller
      timestamp: new Date(),
      transactionHash: crypto.randomBytes(32).toString('hex'),
    };
  }

  public async calculatePropertyValue(
    tokenId: number,
    conditionScore: number,
    marketValue: number
  ): Promise<number> {
    try {
      // Adjust market value based on condition score
      let adjustedValue = marketValue;

      if (conditionScore >= 80) {
        adjustedValue = Math.floor(marketValue * 1.1); // +10% for excellent condition
      } else if (conditionScore < 60) {
        adjustedValue = Math.floor(marketValue * 0.85); // -15% for poor condition
      }

      return adjustedValue;
    } catch (error) {
      throw new Error(`Failed to calculate property value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async scan3DProperty(
    tokenId: number,
    scanType: 'lidar' | 'photogrammetry' | 'manual_photo',
    scanData: Buffer
  ): Promise<{
    scanHash: string;
    ipfsHash: string;
    conditionAnalysis: any;
  }> {
    try {
      // Calculate hash of scan data
      const scanHash = crypto.createHash('sha256').update(scanData).digest('hex');
      
      // Store scan in IPFS
      const ipfsHash = await this.ipfsService.addFile(scanData);
      
      // Mock condition analysis based on scan
      const conditionAnalysis = {
        overallScore: 85,
        cleanliness: 88,
        organization: 82,
        maintenance: 87,
        safety: 90,
        defectsDetected: [
          {
            type: 'minor_scratch',
            location: 'living_room_wall',
            severity: 'low',
            coordinates: { x: 150, y: 200, z: 10 },
          },
        ],
        improvements: [
          {
            suggestion: 'Touch up paint on living room wall',
            estimatedCost: 50,
            conditionImpact: 3,
          },
        ],
        scanMetadata: {
          timestamp: new Date().toISOString(),
          scanType,
          resolution: 'high',
          accuracy: '±2cm',
        },
      };

      return {
        scanHash,
        ipfsHash,
        conditionAnalysis,
      };
    } catch (error) {
      throw new Error(`Failed to scan property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getPropertyStats(): Promise<{
    totalProperties: number;
    averageConditionScore: number;
    totalChittyCashEarned: number;
    propertiesImproved: number;
    averageImprovement: number;
  }> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock statistics
      return {
        totalProperties: 8429,
        averageConditionScore: 78.5,
        totalChittyCashEarned: 234750,
        propertiesImproved: 1247,
        averageImprovement: 12.3,
      };
    } catch (error) {
      throw new Error(`Failed to get property stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getOwnerProperties(owner: string): Promise<PropertyNFT[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return empty array
      return [];
    } catch (error) {
      throw new Error(`Failed to get owner properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getConditionHistory(tokenId: number): Promise<ConditionHistory[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock history
      return [
        {
          timestamp: new Date(),
          conditionScore: 85,
          inspectionType: 'routine',
          inspector: '0x123...456',
          ipfsReport: 'Qm...',
          notes: 'Property in excellent condition',
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get condition history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
