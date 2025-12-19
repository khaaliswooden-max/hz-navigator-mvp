/**
 * Agent Factory - Creates agent instances with shared Prisma client
 * 
 * This module provides a unified way to instantiate all HZ Navigator agents
 * using the application's shared Prisma client instance.
 */

import { prisma } from './prisma';

// Import all agent classes from the main agents module
import { SentinelAgent } from '@/agents/sentinel/complianceMonitor';
import { CartographAgent } from '@/agents/cartograph/geospatialIntelligence';
import { WorkforceAgent } from '@/agents/workforce/employeeIntelligence';
import { CaptureAgent } from '@/agents/capture/opportunityScanner';
import { AdvocateAgent } from '@/agents/advocate/regulatoryIntelligence';
import { GuardianAgent } from '@/agents/guardian/auditDefense';
import { OracleAgent } from '@/agents/oracle/predictiveAnalytics';
import { DiplomatAgent } from '@/agents/diplomat/partnershipIntelligence';
import { ArchivistAgent } from '@/agents/archivist/documentIntelligence';

// Re-export from the main agents module for convenience
export { getNexusOrchestrator, agents } from '@/agents';
export type { AgentType, TaskInput, TaskResult } from '@/agents';

// Cached agent instances (singletons)
let sentinelInstance: SentinelAgent | null = null;
let cartographInstance: CartographAgent | null = null;
let workforceInstance: WorkforceAgent | null = null;
let captureInstance: CaptureAgent | null = null;
let advocateInstance: AdvocateAgent | null = null;
let guardianInstance: GuardianAgent | null = null;
let oracleInstance: OracleAgent | null = null;
let diplomatInstance: DiplomatAgent | null = null;
let archivistInstance: ArchivistAgent | null = null;

/**
 * Get SENTINEL agent instance (Compliance Monitoring)
 */
export function getSentinelAgent(): SentinelAgent {
  if (!sentinelInstance) {
    sentinelInstance = new SentinelAgent(prisma);
  }
  return sentinelInstance;
}

/**
 * Get CARTOGRAPH agent instance (Geospatial Intelligence)
 */
export function getCartographAgent(): CartographAgent {
  if (!cartographInstance) {
    cartographInstance = new CartographAgent(prisma);
  }
  return cartographInstance;
}

/**
 * Get WORKFORCE agent instance (Employee Intelligence)
 */
export function getWorkforceAgent(): WorkforceAgent {
  if (!workforceInstance) {
    workforceInstance = new WorkforceAgent(prisma);
  }
  return workforceInstance;
}

/**
 * Get CAPTURE agent instance (Opportunity Scanner)
 */
export function getCaptureAgent(): CaptureAgent {
  if (!captureInstance) {
    captureInstance = new CaptureAgent(prisma);
  }
  return captureInstance;
}

/**
 * Get ADVOCATE agent instance (Regulatory Intelligence)
 */
export function getAdvocateAgent(): AdvocateAgent {
  if (!advocateInstance) {
    advocateInstance = new AdvocateAgent(prisma);
  }
  return advocateInstance;
}

/**
 * Get GUARDIAN agent instance (Audit Defense)
 */
export function getGuardianAgent(): GuardianAgent {
  if (!guardianInstance) {
    guardianInstance = new GuardianAgent(prisma);
  }
  return guardianInstance;
}

/**
 * Get ORACLE agent instance (Predictive Analytics)
 */
export function getOracleAgent(): OracleAgent {
  if (!oracleInstance) {
    oracleInstance = new OracleAgent(prisma);
  }
  return oracleInstance;
}

/**
 * Get DIPLOMAT agent instance (Partnership Intelligence)
 */
export function getDiplomatAgent(): DiplomatAgent {
  if (!diplomatInstance) {
    diplomatInstance = new DiplomatAgent(prisma);
  }
  return diplomatInstance;
}

/**
 * Get ARCHIVIST agent instance (Document Intelligence)
 */
export function getArchivistAgent(): ArchivistAgent {
  if (!archivistInstance) {
    archivistInstance = new ArchivistAgent(prisma);
  }
  return archivistInstance;
}

// Agent type for backward compatibility
export type AgentTypeLocal =
  | 'sentinel'
  | 'cartograph'
  | 'workforce'
  | 'capture'
  | 'advocate'
  | 'guardian'
  | 'oracle'
  | 'diplomat'
  | 'archivist';

/**
 * Execute an agent task with automatic logging
 */
export async function executeAgentTask(
  agentType: AgentTypeLocal,
  taskType: string,
  input: Record<string, unknown>,
  organizationId: string
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  
  try {
    let result: Record<string, unknown>;
    
    switch (agentType) {
      case 'sentinel':
        result = await getSentinelAgent().execute(taskType, input, organizationId);
        break;
      case 'cartograph':
        result = await getCartographAgent().execute(taskType, input, organizationId);
        break;
      case 'workforce':
        result = await getWorkforceAgent().execute(taskType, input, organizationId);
        break;
      case 'capture':
        result = await getCaptureAgent().execute(taskType, input, organizationId);
        break;
      case 'advocate':
        result = await getAdvocateAgent().execute(taskType, input, organizationId);
        break;
      case 'guardian':
        result = await getGuardianAgent().execute(taskType, input, organizationId);
        break;
      case 'oracle':
        result = await getOracleAgent().execute(taskType, input, organizationId);
        break;
      case 'diplomat':
        result = await getDiplomatAgent().execute(taskType, input, organizationId);
        break;
      case 'archivist':
        result = await getArchivistAgent().execute(taskType, input, organizationId);
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
    
    // Log execution (non-blocking)
    const executionTimeMs = Date.now() - startTime;
    logAgentExecution(agentType, taskType, organizationId, input, result, executionTimeMs, true);
    
    return result;
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failed execution
    logAgentExecution(
      agentType,
      taskType,
      organizationId,
      input,
      { error: errorMessage },
      executionTimeMs,
      false,
      errorMessage
    );
    
    throw error;
  }
}

/**
 * Log agent execution for analytics (non-blocking)
 */
async function logAgentExecution(
  agentId: string,
  taskType: string,
  organizationId: string | null,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  executionTimeMs: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.agentExecution.create({
      data: {
        agentId,
        taskType,
        organizationId,
        input: input as object,
        output: output as object,
        executionTimeMs,
        success,
        errorMessage,
      },
    });
  } catch (error) {
    // Silently fail - logging is non-critical
    console.error('[AgentFactory] Failed to log execution:', error);
  }
}

/**
 * Get available tasks for each agent
 */
export const agentTasks: Record<AgentTypeLocal, string[]> = {
  sentinel: [
    'calculate_compliance',
    'check_employee_status',
    'generate_alerts',
    'get_compliance_history',
    'simulate_hire',
    'simulate_termination',
    'check_grace_period',
  ],
  cartograph: [
    'verify_address',
    'batch_verify',
    'check_map_changes',
    'get_hubzone_areas',
    'find_nearest_hubzone',
    'assess_redesignation_risk',
    'geocode_address',
    'get_census_tract',
  ],
  workforce: [
    'get_roster',
    'add_employee',
    'update_employee',
    'terminate_employee',
    'get_hiring_recommendations',
    'analyze_workforce',
    'check_residency_requirements',
    'get_legacy_employees',
    'promote_to_legacy',
    'get_at_risk_employees',
  ],
  capture: [
    'scan_opportunities',
    'analyze_opportunity',
    'bid_no_bid',
    'get_pipeline',
    'update_opportunity_status',
    'competitive_analysis',
    'match_capabilities',
    'forecast_pipeline',
  ],
  advocate: [
    'scan_regulatory_updates',
    'get_compliance_guidance',
    'interpret_regulation',
    'check_policy_impact',
    'get_key_dates',
    'explain_35_percent_rule',
    'explain_legacy_employees',
    'explain_grace_period',
    'get_certification_requirements',
    'get_recertification_guidance',
  ],
  guardian: [
    'assess_audit_readiness',
    'generate_evidence_package',
    'get_compliance_history',
    'document_attempt_to_maintain',
    'get_documentation_gaps',
    'prepare_audit_response',
    'log_compliance_event',
    'get_audit_trail',
  ],
  oracle: [
    'forecast_compliance',
    'predict_churn_risk',
    'analyze_trends',
    'workforce_planning',
    'risk_assessment',
    'scenario_analysis',
    'get_insights',
  ],
  diplomat: [
    'discover_partners',
    'analyze_synergy',
    'evaluate_jv',
    'get_partner_portfolio',
    'add_partner',
    'find_complementary_certs',
    'prepare_teaming_brief',
  ],
  archivist: [
    'generate_compliance_report',
    'generate_employee_roster',
    'generate_certification_package',
    'parse_document',
    'extract_addresses',
    'index_document',
    'search_documents',
    'generate_audit_package',
  ],
};
