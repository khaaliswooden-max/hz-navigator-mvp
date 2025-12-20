/**
 * HZ Navigator Agent Constellation
 * 
 * Complete export of all 12 AI agents for HUBZone compliance automation.
 * 
 * Includes FedRAMP, CMMC, StateRAMP, and FCL compliance agents.
 * 
 * Usage:
 *   import { getNexusOrchestrator } from '@/agents';
 *   const nexus = getNexusOrchestrator();
 *   const result = await nexus.createTask({ ... });
 */

import { prisma } from '@/lib/prisma';

// Import all agents from hz-navigator-agents
import { NexusOrchestrator } from './hz-navigator-agents/src/agents/nexus/orchestrator';
import { SentinelAgent } from './hz-navigator-agents/src/agents/sentinel/complianceMonitor';
import { CartographAgent } from './hz-navigator-agents/src/agents/cartograph/geospatialIntelligence';
import { WorkforceAgent } from './hz-navigator-agents/src/agents/workforce/employeeIntelligence';
import { CaptureAgent } from './hz-navigator-agents/src/agents/capture/opportunityScanner';
import { AdvocateAgent } from './hz-navigator-agents/src/agents/advocate/regulatoryIntelligence';
import { GuardianAgent } from './hz-navigator-agents/src/agents/guardian/auditDefense';
import { DiplomatAgent } from './hz-navigator-agents/src/agents/diplomat/partnershipIntelligence';
import { OracleAgent } from './hz-navigator-agents/src/agents/oracle/predictiveAnalytics';
import { ArchivistAgent } from './hz-navigator-agents/src/agents/archivist/documentIntelligence';

// Import new security/compliance agents
import { CenturionAgent } from './centurion/securityCompliance';
import { WardenAgent } from './warden/fclManager';

// Re-export all agent classes
export { NexusOrchestrator } from './hz-navigator-agents/src/agents/nexus/orchestrator';
export { SentinelAgent } from './hz-navigator-agents/src/agents/sentinel/complianceMonitor';
export { CartographAgent } from './hz-navigator-agents/src/agents/cartograph/geospatialIntelligence';
export { WorkforceAgent } from './hz-navigator-agents/src/agents/workforce/employeeIntelligence';
export { CaptureAgent } from './hz-navigator-agents/src/agents/capture/opportunityScanner';
export { AdvocateAgent } from './hz-navigator-agents/src/agents/advocate/regulatoryIntelligence';
export { GuardianAgent } from './hz-navigator-agents/src/agents/guardian/auditDefense';
export { DiplomatAgent } from './hz-navigator-agents/src/agents/diplomat/partnershipIntelligence';
export { OracleAgent } from './hz-navigator-agents/src/agents/oracle/predictiveAnalytics';
export { ArchivistAgent } from './hz-navigator-agents/src/agents/archivist/documentIntelligence';

// Export new security/compliance agents
export { CenturionAgent } from './centurion/securityCompliance';
export { WardenAgent } from './warden/fclManager';

// Re-export types
export type { AgentType, TaskInput, TaskResult } from './hz-navigator-agents/src/agents/nexus/orchestrator';
export type { ComplianceResult, ComplianceAlert, ComplianceStatus } from './hz-navigator-agents/src/agents/sentinel/complianceMonitor';
export type { AddressVerificationResult, HubzoneType } from './hz-navigator-agents/src/agents/cartograph/geospatialIntelligence';
export type { Opportunity, BidDecision, OpportunityStatus } from './hz-navigator-agents/src/agents/capture/opportunityScanner';
export type { RegulatoryUpdate, ComplianceGuidance } from './hz-navigator-agents/src/agents/advocate/regulatoryIntelligence';
export type { AuditReadinessScore, EvidencePackage } from './hz-navigator-agents/src/agents/guardian/auditDefense';

// Singleton orchestrator instance
let nexusInstance: NexusOrchestrator | null = null;

/**
 * Get or create NEXUS orchestrator singleton (uses shared Prisma instance)
 */
export function getNexusOrchestrator(): NexusOrchestrator {
  if (!nexusInstance) {
    nexusInstance = new NexusOrchestrator(prisma);
  }
  return nexusInstance;
}

/**
 * Create individual agent instances (for direct use without orchestrator)
 */
export const agents = {
  sentinel: () => new SentinelAgent(prisma),
  cartograph: () => new CartographAgent(prisma),
  workforce: () => new WorkforceAgent(prisma),
  capture: () => new CaptureAgent(prisma),
  advocate: () => new AdvocateAgent(prisma),
  guardian: () => new GuardianAgent(prisma),
  diplomat: () => new DiplomatAgent(prisma),
  oracle: () => new OracleAgent(prisma),
  archivist: () => new ArchivistAgent(prisma),
  // New security/compliance agents
  centurion: () => new CenturionAgent(prisma),
  warden: () => new WardenAgent(prisma),
};

/**
 * Agent Summary:
 * 
 * CORE HUBZONE AGENTS (10):
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
 * 
 * SECURITY/COMPLIANCE AGENTS (2):
 * 11. CENTURION - Security compliance monitoring (FedRAMP, CMMC, StateRAMP, Zero Trust)
 * 12. WARDEN - FCL (Facility Clearance) management, NISPOM compliance, DCSA readiness
 */
