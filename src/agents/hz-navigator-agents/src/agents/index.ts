/**
 * HZ Navigator Agent Constellation
 * 
 * Complete export of all 10 AI agents for HUBZone compliance automation.
 */

// Orchestrator
export { NexusOrchestrator, getNexusOrchestrator, initNexus } from './nexus/orchestrator';
export type { AgentType, TaskInput, TaskResult } from './nexus/orchestrator';

// Compliance Monitor
export { SentinelAgent } from './sentinel/complianceMonitor';
export type { ComplianceResult, ComplianceAlert, ComplianceStatus } from './sentinel/complianceMonitor';

// Geospatial Intelligence
export { CartographAgent } from './cartograph/geospatialIntelligence';
export type { AddressVerificationResult, HubzoneType } from './cartograph/geospatialIntelligence';

// Employee Intelligence
export { WorkforceAgent } from './workforce/employeeIntelligence';

// Opportunity Scanner
export { CaptureAgent } from './capture/opportunityScanner';
export type { Opportunity, BidDecision, OpportunityStatus } from './capture/opportunityScanner';

// Regulatory Intelligence
export { AdvocateAgent } from './advocate/regulatoryIntelligence';
export type { RegulatoryUpdate, ComplianceGuidance } from './advocate/regulatoryIntelligence';

// Audit Defense
export { GuardianAgent } from './guardian/auditDefense';
export type { AuditReadinessScore, EvidencePackage } from './guardian/auditDefense';

// Partnership Intelligence
export { DiplomatAgent } from './diplomat/partnershipIntelligence';

// Predictive Analytics
export { OracleAgent } from './oracle/predictiveAnalytics';

// Document Intelligence
export { ArchivistAgent } from './archivist/documentIntelligence';

/**
 * Agent Summary:
 * 
 * 1. NEXUS - Central orchestrator, routes tasks to appropriate agents
 * 2. SENTINEL - 35% compliance monitoring, early warning, grace period tracking
 * 3. CARTOGRAPH - HUBZone boundary verification, address geocoding, map changes
 * 4. WORKFORCE - Employee lifecycle, hire/termination impact, residency tracking
 * 5. CAPTURE - Opportunity discovery, bid/no-bid analysis, pipeline management
 * 6. ADVOCATE - Regulatory monitoring, policy interpretation, compliance guidance
 * 7. GUARDIAN - Audit preparation, evidence collection, documentation
 * 8. DIPLOMAT - Partner discovery, synergy analysis, JV evaluation
 * 9. ORACLE - Compliance forecasting, risk prediction, trend analysis
 * 10. ARCHIVIST - Document parsing, report generation, intelligent filing
 */
