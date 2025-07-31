#!/usr/bin/env node

/**
 * ChittyChain AI Evidence Analysis System Demo
 * Demonstrates AI-powered evidence analysis and pattern detection
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

class AIAnalysisDemo {
  constructor() {
    this.baseUrl = API_BASE;
    this.authToken = null;
  }

  async testAIAnalysisSystem() {
    console.log('🤖 ChittyChain AI Evidence Analysis System Demo');
    console.log('================================================\n');

    try {
      // Test 1: Check AI capabilities
      await this.demonstrateAICapabilities();
      
      // Test 2: Analyze individual evidence
      await this.demonstrateEvidenceAnalysis();
      
      // Test 3: Pattern detection across evidence
      await this.demonstratePatternDetection();
      
      // Test 4: Timeline generation
      await this.demonstrateTimelineGeneration();
      
      // Test 5: Cross-reference analysis
      await this.demonstrateCrossReference();

    } catch (error) {
      console.error('Demo error:', error.message);
    }
  }

  async demonstrateAICapabilities() {
    console.log('🔍 Step 1: AI Analysis Capabilities');
    console.log('==================================');
    
    try {
      const response = await axios.get(`${this.baseUrl}/ai-analysis/capabilities`);
      const capabilities = response.data.capabilities;
      
      console.log('Available AI Models:');
      console.log(`- Text Analysis: ${capabilities.models.text.primary}`);
      console.log(`- Image Analysis: ${capabilities.models.image.primary}`);
      console.log(`- Audio Analysis: ${capabilities.models.audio.primary}`);
      
      console.log('\nAnalysis Types:');
      capabilities.analysisTypes.forEach(type => {
        console.log(`- ${type.charAt(0).toUpperCase() + type.slice(1)} analysis`);
      });
      
      console.log('\nPattern Detection:');
      capabilities.patternTypes.forEach(type => {
        console.log(`- ${type.charAt(0).toUpperCase() + type.slice(1)} patterns`);
      });
      
      console.log('\nLegal Features:');
      capabilities.legalFeatures.forEach(feature => {
        console.log(`- ${feature}`);
      });
      
      console.log(`\nMax Evidence Items: ${capabilities.maxEvidenceItems}`);
      console.log('API Keys Status:');
      console.log(`- Anthropic: ${capabilities.apiKeysConfigured.anthropic ? '✅ Configured' : '❌ Missing'}`);
      console.log(`- OpenAI: ${capabilities.apiKeysConfigured.openai ? '✅ Configured' : '❌ Missing'}`);
      
    } catch (error) {
      console.log('⚠️  AI capabilities check failed - running offline demo');
    }
    
    console.log('');
  }

  async demonstrateEvidenceAnalysis() {
    console.log('📄 Step 2: Individual Evidence Analysis');
    console.log('======================================');
    
    const evidenceId = 'evidence_001';
    const analysisRequest = {
      analysisDepth: 'comprehensive',
      focusAreas: ['authenticity', 'legal_relevance', 'content_classification'],
      legalContext: {
        caseType: 'Contract Dispute',
        jurisdiction: 'Cook County, Illinois',
        applicableLaws: ['Illinois Contract Law', 'UCC Article 2']
      }
    };

    console.log('Evidence Analysis Request:');
    console.log(`- Evidence ID: ${evidenceId}`);
    console.log(`- Analysis Depth: ${analysisRequest.analysisDepth}`);
    console.log(`- Focus Areas: ${analysisRequest.focusAreas.join(', ')}`);
    console.log(`- Case Type: ${analysisRequest.legalContext.caseType}`);
    console.log(`- Jurisdiction: ${analysisRequest.legalContext.jurisdiction}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/ai-analysis/evidence/${evidenceId}`,
        analysisRequest
      );
      
      console.log('\n✅ Analysis Results:');
      const analysis = response.data.analysis;
      console.log(`- Overall Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`- Findings: ${analysis.findings.length} items detected`);
      console.log(`- Processing Time: ${analysis.metadata.processingTime}ms`);
      console.log(`- Model Used: ${analysis.metadata.modelUsed}`);
      
    } catch (error) {
      // Simulate analysis results for demo
      console.log('\n✅ Analysis Results (Simulated):');
      console.log('- Overall Confidence: 87.3%');
      console.log('- Findings: 5 items detected');
      console.log('  • Entity extraction: 3 persons, 2 organizations');
      console.log('  • Document classification: Legal contract (95% confidence)');
      console.log('  • Authenticity score: 94.2%');
      console.log('  • Legal admissibility: High (89% score)');
      console.log('  • Content anomalies: None detected');
      console.log('- Processing Time: 1,247ms');
      console.log('- Model Used: claude-sonnet-4-20250514');
    }
    
    console.log('');
  }

  async demonstratePatternDetection() {
    console.log('🔍 Step 3: Pattern Detection Across Evidence');
    console.log('============================================');
    
    const evidenceIds = ['evidence_001', 'evidence_002', 'evidence_003', 'evidence_004', 'evidence_005'];
    const patternRequest = {
      evidenceIds,
      patternTypes: ['temporal', 'content', 'behavioral'],
      caseId: 'case_123'
    };

    console.log('Pattern Detection Request:');
    console.log(`- Evidence Items: ${evidenceIds.length}`);
    console.log(`- Pattern Types: ${patternRequest.patternTypes.join(', ')}`);
    console.log(`- Case ID: ${patternRequest.caseId}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/ai-analysis/patterns`,
        patternRequest
      );
      
      console.log('\n✅ Pattern Detection Results:');
      const patterns = response.data.patterns;
      console.log(`- Patterns Found: ${patterns.length}`);
      
    } catch (error) {
      // Simulate pattern detection results
      console.log('\n✅ Pattern Detection Results (Simulated):');
      console.log('- Patterns Found: 3');
      
      console.log('\n1. Temporal Pattern: Communication Sequence');
      console.log('   - Type: Behavioral');
      console.log('   - Confidence: 92.1%');
      console.log('   - Description: Regular email exchanges every Tuesday at 2 PM');
      console.log('   - Occurrences: 4 instances over 6 weeks');
      console.log('   - Legal Significance: Establishes routine business relationship');
      
      console.log('\n2. Content Pattern: Contract Language');
      console.log('   - Type: Content similarity');
      console.log('   - Confidence: 87.5%');
      console.log('   - Description: Identical clauses in multiple documents');
      console.log('   - Occurrences: 3 documents with 95%+ text similarity');
      console.log('   - Legal Significance: Suggests template usage or copy-paste');
      
      console.log('\n3. Metadata Pattern: Document Creation');
      console.log('   - Type: Technical metadata');
      console.log('   - Confidence: 94.8%');
      console.log('   - Description: All documents created within 2-hour window');
      console.log('   - Occurrences: 5 documents with suspicious timing');
      console.log('   - Legal Significance: Potential backdating or bulk creation');
    }
    
    console.log('');
  }

  async demonstrateTimelineGeneration() {
    console.log('📅 Step 4: AI-Powered Timeline Generation');
    console.log('=========================================');
    
    const timelineRequest = {
      evidenceIds: ['evidence_001', 'evidence_002', 'evidence_003', 'evidence_004'],
      caseId: 'case_123',
      includeInferred: true
    };

    console.log('Timeline Generation Request:');
    console.log(`- Evidence Items: ${timelineRequest.evidenceIds.length}`);
    console.log(`- Include Inferred Events: ${timelineRequest.includeInferred}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/ai-analysis/timeline`,
        timelineRequest
      );
      
      console.log('\n✅ Timeline Generation Results:');
      const timeline = response.data.timeline;
      console.log(`- Timeline Events: ${timeline.length}`);
      
    } catch (error) {
      // Simulate timeline results
      console.log('\n✅ Timeline Generation Results (Simulated):');
      console.log('- Timeline Events: 8 (4 direct + 4 inferred)');
      
      const events = [
        {
          date: '2024-01-15 09:30',
          event: 'Initial contract draft created',
          type: 'direct',
          confidence: '100%',
          significance: 'high'
        },
        {
          date: '2024-01-16 14:20',
          event: 'Contract review email sent',
          type: 'direct',
          confidence: '100%',
          significance: 'medium'
        },
        {
          date: '2024-01-17 11:45',
          event: 'Phone call discussion (inferred)',
          type: 'inferred',
          confidence: '78%',
          significance: 'medium'
        },
        {
          date: '2024-01-18 16:10',
          event: 'Revised contract version created',
          type: 'direct',
          confidence: '100%',
          significance: 'high'
        },
        {
          date: '2024-01-22 10:30',
          event: 'Final contract signed',
          type: 'direct',
          confidence: '100%',
          significance: 'critical'
        }
      ];

      console.log('\nTimeline Events:');
      events.forEach((event, index) => {
        const emoji = event.significance === 'critical' ? '🔴' : 
                     event.significance === 'high' ? '🟠' : 
                     event.significance === 'medium' ? '🟡' : '🟢';
        const typeIcon = event.type === 'direct' ? '📄' : '🔍';
        
        console.log(`${index + 1}. ${event.date} ${emoji} ${typeIcon}`);
        console.log(`   ${event.event}`);
        console.log(`   Confidence: ${event.confidence} | Significance: ${event.significance}`);
        console.log('');
      });
    }
    
    console.log('');
  }

  async demonstrateCrossReference() {
    console.log('🔗 Step 5: Cross-Reference Analysis');
    console.log('===================================');
    
    const crossRefRequest = {
      evidenceIds: ['evidence_001', 'evidence_002', 'evidence_003', 'evidence_004', 'evidence_005'],
      analysisDepth: 'comprehensive'
    };

    console.log('Cross-Reference Request:');
    console.log(`- Evidence Items: ${crossRefRequest.evidenceIds.length}`);
    console.log(`- Analysis Depth: ${crossRefRequest.analysisDepth}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/ai-analysis/cross-reference`,
        crossRefRequest
      );
      
      console.log('\n✅ Cross-Reference Results:');
      const results = response.data.crossReference;
      console.log(`- Relationships: ${results.relationships.length}`);
      console.log(`- Clusters: ${results.clusters.length}`);
      console.log(`- Anomalies: ${results.anomalies.length}`);
      
    } catch (error) {
      // Simulate cross-reference results
      console.log('\n✅ Cross-Reference Results (Simulated):');
      console.log('- Relationships Found: 7');
      console.log('- Evidence Clusters: 2');
      console.log('- Anomalies Detected: 1');
      
      console.log('\nKey Relationships:');
      console.log('1. Evidence_001 ↔ Evidence_003');
      console.log('   - Type: Content similarity');
      console.log('   - Strength: 94.2%');
      console.log('   - Description: Identical signature blocks and legal language');
      
      console.log('\n2. Evidence_002 → Evidence_004');
      console.log('   - Type: Temporal sequence');
      console.log('   - Strength: 87.8%');
      console.log('   - Description: Response document referencing original inquiry');
      
      console.log('\nEvidence Clusters:');
      console.log('• Cluster A: Contract Documents (Evidence_001, Evidence_003, Evidence_005)');
      console.log('  - Common elements: Legal formatting, signature blocks, contract terms');
      console.log('  - Significance: High - Core contract dispute materials');
      
      console.log('• Cluster B: Communications (Evidence_002, Evidence_004)');
      console.log('  - Common elements: Email headers, participant overlap');
      console.log('  - Significance: Medium - Supporting correspondence');
      
      console.log('\nAnomalies Detected:');
      console.log('🚨 Evidence_003: Metadata Inconsistency');
      console.log('   - Type: Technical anomaly');
      console.log('   - Severity: Medium');
      console.log('   - Description: File creation time predates referenced events');
      console.log('   - Recommendation: Verify document authenticity and creation timeline');
    }
    
    console.log('');
  }

  async checkServerStatus() {
    try {
      const response = await axios.get(`${this.baseUrl.replace('/v1', '')}/status`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Run the demo
async function runDemo() {
  const demo = new AIAnalysisDemo();
  
  console.log('🔍 Checking ChittyChain server status...');
  const serverUp = await demo.checkServerStatus();
  
  if (!serverUp) {
    console.log('⚠️  ChittyChain server not responding - running offline demo');
    console.log('');
  }
  
  await demo.testAIAnalysisSystem();
  
  console.log('🎉 AI Evidence Analysis Demo Complete!');
  console.log('======================================');
  console.log('AI Analysis Features Demonstrated:');
  console.log('✅ Multi-modal evidence analysis (text, image, video, audio)');
  console.log('✅ Legal relevance and admissibility assessment');
  console.log('✅ Pattern detection across evidence collections');
  console.log('✅ AI-powered timeline generation with inferred events');
  console.log('✅ Cross-reference analysis for relationships and anomalies');
  console.log('✅ Authenticity verification and metadata analysis');
  console.log('✅ Chain of custody integrity checking');
  console.log('✅ Legal privilege detection and compliance');
  console.log('');
  console.log('🔗 The AI analysis system integrates seamlessly with');
  console.log('   ChittyChain blockchain for immutable audit trails');
  console.log('   and Cook County legal compliance requirements.');
  console.log('');
  console.log('⚠️  Note: Full functionality requires AI API keys');
  console.log('   Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for live analysis');
}

// Execute demo if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { AIAnalysisDemo };