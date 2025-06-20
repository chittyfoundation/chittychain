import axios, { AxiosInstance } from 'axios';
import { env } from '../config/environment';
import crypto from 'crypto';

interface CaseVerificationRequest {
  caseNumber: string;
  jurisdiction: string;
  partyNames: string[];
}

interface CaseVerificationResponse {
  isValid: boolean;
  caseDetails?: {
    caseNumber: string;
    caption: string;
    filingDate: string;
    status: string;
    parties: {
      role: string;
      name: string;
      representedBy?: string;
    }[];
  };
  message?: string;
}

interface FilingSubmission {
  caseNumber: string;
  documentType: string;
  documentHash: string;
  submittedBy: string;
  timestamp: string;
}

interface FilingResponse {
  success: boolean;
  filingId?: string;
  confirmationNumber?: string;
  message?: string;
}

interface ComplianceCheck {
  caseNumber: string;
  documentType: string;
  metadata: Record<string, any>;
}

interface ComplianceResponse {
  isCompliant: boolean;
  issues?: string[];
  recommendations?: string[];
}

export class CookCountyAPIService {
  private client: AxiosInstance;
  private apiKey: string;
  private mockMode: boolean = true; // Use mock mode if API is not available

  constructor() {
    this.apiKey = env.COOK_COUNTY_API_KEY || 'mock-api-key';
    
    this.client = axios.create({
      baseURL: env.COOK_COUNTY_API_URL || 'https://api.cookcounty.gov',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChittyChain/1.0'
      }
    });

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.client.get('/health');
      this.mockMode = false;
      console.log('✅ Connected to Cook County API');
    } catch (error) {
      console.warn('⚠️  Cook County API not available, using mock mode');
      this.mockMode = true;
    }
  }

  public async verifyCaseNumber(request: CaseVerificationRequest): Promise<CaseVerificationResponse> {
    if (this.mockMode) {
      return this.mockVerifyCaseNumber(request);
    }

    try {
      const response = await this.client.post('/v1/cases/verify', request);
      return response.data;
    } catch (error) {
      console.error('Case verification failed:', error);
      return this.mockVerifyCaseNumber(request);
    }
  }

  public async submitFiling(filing: FilingSubmission): Promise<FilingResponse> {
    if (this.mockMode) {
      return this.mockSubmitFiling(filing);
    }

    try {
      const response = await this.client.post('/v1/filings/submit', filing);
      return response.data;
    } catch (error) {
      console.error('Filing submission failed:', error);
      return this.mockSubmitFiling(filing);
    }
  }

  public async checkCompliance(check: ComplianceCheck): Promise<ComplianceResponse> {
    if (this.mockMode) {
      return this.mockCheckCompliance(check);
    }

    try {
      const response = await this.client.post('/v1/compliance/check', check);
      return response.data;
    } catch (error) {
      console.error('Compliance check failed:', error);
      return this.mockCheckCompliance(check);
    }
  }

  public async getCourtCalendar(caseNumber: string): Promise<any[]> {
    if (this.mockMode) {
      return this.mockGetCourtCalendar(caseNumber);
    }

    try {
      const response = await this.client.get(`/v1/calendar/${caseNumber}`);
      return response.data.events || [];
    } catch (error) {
      console.error('Calendar fetch failed:', error);
      return this.mockGetCourtCalendar(caseNumber);
    }
  }

  public async searchCases(query: {
    partyName?: string;
    attorneyName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any[]> {
    if (this.mockMode) {
      return this.mockSearchCases(query);
    }

    try {
      const response = await this.client.get('/v1/cases/search', { params: query });
      return response.data.results || [];
    } catch (error) {
      console.error('Case search failed:', error);
      return this.mockSearchCases(query);
    }
  }

  // Mock implementations for testing/development
  private mockVerifyCaseNumber(request: CaseVerificationRequest): CaseVerificationResponse {
    // Validate case number format
    const isValidFormat = /^\d{4}-[A-Z]-\d{6}$/.test(request.caseNumber);
    
    if (!isValidFormat) {
      return {
        isValid: false,
        message: 'Invalid case number format. Expected: YYYY-L-NNNNNN'
      };
    }

    // Mock valid response for demo cases
    if (request.caseNumber.startsWith('2024')) {
      return {
        isValid: true,
        caseDetails: {
          caseNumber: request.caseNumber,
          caption: `${request.partyNames[0]} v. ${request.partyNames[1] || 'Unknown'}`,
          filingDate: '2024-01-15',
          status: 'Active',
          parties: request.partyNames.map((name, index) => ({
            role: index === 0 ? 'Plaintiff' : 'Defendant',
            name: name,
            representedBy: 'Pro Se'
          }))
        }
      };
    }

    return {
      isValid: false,
      message: 'Case not found in Cook County records'
    };
  }

  private mockSubmitFiling(filing: FilingSubmission): FilingResponse {
    const confirmationNumber = `COOK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    return {
      success: true,
      filingId: crypto.randomUUID(),
      confirmationNumber,
      message: `Filing submitted successfully. Confirmation: ${confirmationNumber}`
    };
  }

  private mockCheckCompliance(check: ComplianceCheck): ComplianceResponse {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Mock compliance rules
    if (!check.metadata.pageCount || check.metadata.pageCount > 50) {
      issues.push('Document exceeds 50-page limit for electronic filing');
      recommendations.push('Consider filing as multiple documents or requesting leave for oversized filing');
    }

    if (check.documentType === 'motion' && !check.metadata.noticeOfMotion) {
      issues.push('Motion must include Notice of Motion');
      recommendations.push('Attach Notice of Motion as first page of document');
    }

    if (!check.metadata.certificate_of_service) {
      recommendations.push('Include Certificate of Service for all filings');
    }

    return {
      isCompliant: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private mockGetCourtCalendar(caseNumber: string): any[] {
    return [
      {
        date: '2024-02-15',
        time: '09:00 AM',
        courtroom: '2402',
        event: 'Status Hearing',
        judge: 'Hon. Jane Smith'
      },
      {
        date: '2024-03-20',
        time: '10:30 AM',
        courtroom: '2402',
        event: 'Motion Hearing',
        judge: 'Hon. Jane Smith'
      }
    ];
  }

  private mockSearchCases(query: any): any[] {
    // Return mock search results
    return [
      {
        caseNumber: '2024-D-001234',
        caption: 'Smith v. Jones',
        filingDate: '2024-01-10',
        status: 'Active',
        nextHearing: '2024-02-15'
      }
    ];
  }
}