import crypto from 'crypto';

export interface LegalCase {
  id: string;
  caseNumber: string;
  jurisdiction: string;
  status: 'active' | 'closed' | 'pending' | 'appealed';
  title: string;
  description?: string;
  plaintiffs: Party[];
  defendants: Party[];
  attorneys: Attorney[];
  evidenceIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  courtDates: CourtDate[];
  documents: CaseDocument[];
  complianceStatus: ComplianceStatus;
}

export interface Party {
  name: string;
  type: 'individual' | 'corporation' | 'government';
  address?: string;
  contactInfo?: ContactInfo;
  role: 'plaintiff' | 'defendant' | 'witness' | 'expert';
}

export interface Attorney {
  name: string;
  barNumber: string;
  firm?: string;
  contactInfo: ContactInfo;
  role: 'lead' | 'associate' | 'co-counsel';
  admittedBars: string[];
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export interface CourtDate {
  date: Date;
  type: 'hearing' | 'trial' | 'motion' | 'settlement';
  judge?: string;
  courtroom?: string;
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  notes?: string;
}

export interface CaseDocument {
  id: string;
  title: string;
  type: 'pleading' | 'motion' | 'order' | 'exhibit' | 'correspondence';
  filedDate: Date;
  filedBy: string;
  ipfsHash: string;
  blockchainHash?: string;
  status: 'draft' | 'filed' | 'served' | 'responded';
}

export interface ComplianceStatus {
  cookCountyCompliant: boolean;
  retentionCompliant: boolean;
  auditTrailComplete: boolean;
  lastAuditDate: Date;
  complianceScore: number; // 0-100
  issues: string[];
}

export class CaseService {
  private cases: Map<string, LegalCase> = new Map();
  private COOK_COUNTY_RETENTION = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in milliseconds

  public async createCase(caseData: {
    caseNumber: string;
    jurisdiction: string;
    title: string;
    description?: string;
    plaintiffs: Party[];
    defendants: Party[];
    attorneys: Attorney[];
    createdBy: string;
  }): Promise<LegalCase> {
    try {
      // Validate case number format for Cook County
      if (caseData.jurisdiction === 'cook_county' && !this.validateCookCountyCaseNumber(caseData.caseNumber)) {
        throw new Error('Invalid Cook County case number format');
      }

      if (this.cases.has(caseData.caseNumber)) {
        throw new Error('Case number already exists');
      }

      const legalCase: LegalCase = {
        id: crypto.randomUUID(),
        caseNumber: caseData.caseNumber,
        jurisdiction: caseData.jurisdiction,
        status: 'active',
        title: caseData.title,
        description: caseData.description,
        plaintiffs: caseData.plaintiffs,
        defendants: caseData.defendants,
        attorneys: caseData.attorneys,
        evidenceIds: [],
        createdBy: caseData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        courtDates: [],
        documents: [],
        complianceStatus: {
          cookCountyCompliant: true,
          retentionCompliant: true,
          auditTrailComplete: true,
          lastAuditDate: new Date(),
          complianceScore: 100,
          issues: [],
        },
      };

      this.cases.set(caseData.caseNumber, legalCase);
      return legalCase;
    } catch (error) {
      throw new Error(`Failed to create case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async bindArtifactToCase(
    caseNumber: string,
    artifactId: string,
    artifactType: 'evidence' | 'document' | 'witness_statement',
    bindingNotes?: string
  ): Promise<void> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      if (artifactType === 'evidence') {
        if (!legalCase.evidenceIds.includes(artifactId)) {
          legalCase.evidenceIds.push(artifactId);
        }
      }

      legalCase.updatedAt = new Date();
      
      // Update compliance status
      await this.updateComplianceStatus(caseNumber);
    } catch (error) {
      throw new Error(`Failed to bind artifact to case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async isolateCaseData(caseNumber: string): Promise<{
    isolatedData: any;
    isolationHash: string;
    timestamp: Date;
  }> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      // Create isolated data snapshot
      const isolatedData = {
        case: { ...legalCase },
        isolationReason: 'Data isolation for legal proceedings',
        isolatedBy: 'system',
        originalHash: crypto.createHash('sha256').update(JSON.stringify(legalCase)).digest('hex'),
      };

      const isolationHash = crypto.createHash('sha256')
        .update(JSON.stringify(isolatedData))
        .digest('hex');

      return {
        isolatedData,
        isolationHash,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to isolate case data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async addCourtDate(
    caseNumber: string,
    courtDate: Omit<CourtDate, 'status'>
  ): Promise<void> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      const newCourtDate: CourtDate = {
        ...courtDate,
        status: 'scheduled',
      };

      legalCase.courtDates.push(newCourtDate);
      legalCase.updatedAt = new Date();
    } catch (error) {
      throw new Error(`Failed to add court date: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async addDocument(
    caseNumber: string,
    document: Omit<CaseDocument, 'id' | 'filedDate' | 'status'>
  ): Promise<CaseDocument> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      const newDocument: CaseDocument = {
        id: crypto.randomUUID(),
        ...document,
        filedDate: new Date(),
        status: 'draft',
      };

      legalCase.documents.push(newDocument);
      legalCase.updatedAt = new Date();

      return newDocument;
    } catch (error) {
      throw new Error(`Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async updateCaseStatus(
    caseNumber: string,
    status: LegalCase['status'],
    notes?: string
  ): Promise<void> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      legalCase.status = status;
      legalCase.updatedAt = new Date();

      // Update compliance status when case status changes
      await this.updateComplianceStatus(caseNumber);
    } catch (error) {
      throw new Error(`Failed to update case status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getCase(caseNumber: string): Promise<LegalCase | undefined> {
    return this.cases.get(caseNumber);
  }

  public async getCasesByAttorney(attorneyBarNumber: string): Promise<LegalCase[]> {
    const results: LegalCase[] = [];
    
    for (const legalCase of this.cases.values()) {
      const hasAttorney = legalCase.attorneys.some(attorney => attorney.barNumber === attorneyBarNumber);
      if (hasAttorney) {
        results.push(legalCase);
      }
    }
    
    return results;
  }

  public async searchCases(query: {
    jurisdiction?: string;
    status?: string;
    plaintiff?: string;
    defendant?: string;
    attorney?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<LegalCase[]> {
    const results: LegalCase[] = [];
    
    for (const legalCase of this.cases.values()) {
      let matches = true;

      if (query.jurisdiction && legalCase.jurisdiction !== query.jurisdiction) {
        matches = false;
      }

      if (query.status && legalCase.status !== query.status) {
        matches = false;
      }

      if (query.plaintiff) {
        const hasPlaintiff = legalCase.plaintiffs.some(p => 
          p.name.toLowerCase().includes(query.plaintiff!.toLowerCase())
        );
        if (!hasPlaintiff) matches = false;
      }

      if (query.defendant) {
        const hasDefendant = legalCase.defendants.some(d => 
          d.name.toLowerCase().includes(query.defendant!.toLowerCase())
        );
        if (!hasDefendant) matches = false;
      }

      if (query.attorney) {
        const hasAttorney = legalCase.attorneys.some(a => 
          a.name.toLowerCase().includes(query.attorney!.toLowerCase())
        );
        if (!hasAttorney) matches = false;
      }

      if (query.dateRange) {
        const caseDate = legalCase.createdAt;
        if (caseDate < query.dateRange.start || caseDate > query.dateRange.end) {
          matches = false;
        }
      }

      if (matches) {
        results.push(legalCase);
      }
    }
    
    return results;
  }

  public async generateCookCountyReport(caseNumber: string): Promise<{
    case: LegalCase;
    complianceReport: ComplianceStatus;
    retentionStatus: string;
    auditSummary: any;
  }> {
    try {
      const legalCase = this.cases.get(caseNumber);
      if (!legalCase) {
        throw new Error('Case not found');
      }

      const retentionStatus = this.checkRetentionCompliance(legalCase);
      
      const auditSummary = {
        totalDocuments: legalCase.documents.length,
        totalEvidence: legalCase.evidenceIds.length,
        courtDatesScheduled: legalCase.courtDates.filter(d => d.status === 'scheduled').length,
        courtDatesCompleted: legalCase.courtDates.filter(d => d.status === 'completed').length,
        lastActivity: legalCase.updatedAt,
        caseAge: Math.floor((Date.now() - legalCase.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
      };

      return {
        case: legalCase,
        complianceReport: legalCase.complianceStatus,
        retentionStatus,
        auditSummary,
      };
    } catch (error) {
      throw new Error(`Failed to generate Cook County report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateComplianceStatus(caseNumber: string): Promise<void> {
    const legalCase = this.cases.get(caseNumber);
    if (!legalCase) return;

    const issues: string[] = [];
    let complianceScore = 100;

    // Check Cook County specific requirements
    if (legalCase.jurisdiction === 'cook_county') {
      if (!this.validateCookCountyCaseNumber(legalCase.caseNumber)) {
        issues.push('Invalid Cook County case number format');
        complianceScore -= 20;
      }
    }

    // Check retention compliance
    const retentionStatus = this.checkRetentionCompliance(legalCase);
    if (retentionStatus !== 'compliant') {
      issues.push('Retention policy violation');
      complianceScore -= 15;
    }

    // Check audit trail completeness
    if (legalCase.evidenceIds.length === 0 && legalCase.documents.length === 0) {
      issues.push('No evidence or documents attached');
      complianceScore -= 10;
    }

    legalCase.complianceStatus = {
      cookCountyCompliant: legalCase.jurisdiction !== 'cook_county' || issues.length === 0,
      retentionCompliant: retentionStatus === 'compliant',
      auditTrailComplete: issues.length === 0,
      lastAuditDate: new Date(),
      complianceScore: Math.max(0, complianceScore),
      issues,
    };
  }

  private validateCookCountyCaseNumber(caseNumber: string): boolean {
    // Cook County case number format: CC-YYYY-NNNNNN
    const cookCountyPattern = /^CC-\d{4}-\d{6}$/;
    return cookCountyPattern.test(caseNumber);
  }

  private checkRetentionCompliance(legalCase: LegalCase): string {
    const caseAge = Date.now() - legalCase.createdAt.getTime();
    
    if (legalCase.status === 'closed') {
      if (caseAge > this.COOK_COUNTY_RETENTION) {
        return 'retention_expired';
      }
    }
    
    return 'compliant';
  }

  public async getCaseStats(): Promise<{
    totalCases: number;
    activeCases: number;
    closedCases: number;
    cookCountyCases: number;
    complianceRate: number;
    averageCaseAge: number;
  }> {
    const allCases = Array.from(this.cases.values());
    const activeCases = allCases.filter(c => c.status === 'active').length;
    const closedCases = allCases.filter(c => c.status === 'closed').length;
    const cookCountyCases = allCases.filter(c => c.jurisdiction === 'cook_county').length;
    
    const compliantCases = allCases.filter(c => c.complianceStatus.cookCountyCompliant).length;
    const complianceRate = allCases.length > 0 ? (compliantCases / allCases.length) * 100 : 100;
    
    const totalAge = allCases.reduce((sum, c) => {
      return sum + (Date.now() - c.createdAt.getTime());
    }, 0);
    const averageCaseAge = allCases.length > 0 ? 
      Math.floor(totalAge / allCases.length / (1000 * 60 * 60 * 24)) : 0; // days

    return {
      totalCases: allCases.length,
      activeCases,
      closedCases,
      cookCountyCases,
      complianceRate,
      averageCaseAge,
    };
  }
}
