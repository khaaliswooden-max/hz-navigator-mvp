/**
 * Build System - Feedback Recycling Pipeline
 * 
 * The complete cycle:
 * BUILD → TEST → ANALYZE → REPORT → TRIAGE → PATCH → (repeat)
 * 
 * Components:
 * - BuildCycle: Core module managing phases and feedback collection
 * - TriageSystem: NEXUS-powered issue prioritization
 * - FeedbackAnalyzer: ORACLE-powered pattern analysis
 * - ReportGenerator: ARCHIVIST-powered reporting
 * - PatchManager: Tracks feedback → patches → resolution
 */

// Import BuildPhase for local use in this file
import type { BuildPhase as BuildPhaseType } from './BuildCycle';

// Core classes and functions
export { BuildCycle, createPhaseConfig } from './BuildCycle';

// Core types
export type {
  BuildPhase,
  FeedbackSeverity,
  FeedbackCategory,
  FeedbackDestination,
  CycleStatus,
  FeedbackItem,
  PatchItem,
  CycleResult,
  BuildCycleConfig,
} from './BuildCycle';

// Triage system (NEXUS) - classes and functions
export { TriageSystem, triageReportToPatches } from './TriageSystem';

// Triage system types
export type {
  TriageDecision,
  TriageReport,
  IssuePattern,
  EscalationRule,
} from './TriageSystem';

// Feedback analyzer (ORACLE) - classes
export { FeedbackAnalyzer } from './FeedbackAnalyzer';

// Feedback analyzer types
export type {
  AgentMetrics,
  TrendAnalysis,
  RootCauseAnalysis,
  FeedbackAnalysisReport,
} from './FeedbackAnalyzer';

// Report generator (ARCHIVIST) - classes
export { ReportGenerator } from './ReportGenerator';

// Report generator types
export type {
  FeedbackReport,
  ReportSection,
  AgentHealthSection,
  TrendSection,
  PatternSection,
  ActionItem,
  DeveloperNote,
} from './ReportGenerator';

// Patch manager - classes
export { PatchManager } from './PatchManager';

// Patch manager types
export type {
  PatchStatus,
  ManagedPatch,
  PatchQueueSummary,
  PatchVelocity,
} from './PatchManager';

/**
 * Quick reference: Feedback classification
 * 
 * Critical issues → Build blockers (must fix before proceeding)
 * High issues → Patches (can fix in parallel with next phase)
 * Medium/Low issues → Backlog (addressed in polish phase)
 * All issues → Learning events (training data for improvement)
 */
export const FEEDBACK_CLASSIFICATION = {
  critical: {
    destination: 'build_blocker',
    description: 'Must fix before proceeding to next phase',
    action: 'Immediate developer attention required',
  },
  high: {
    destination: 'parallel_patch',
    description: 'Can fix in parallel with next phase',
    action: 'Schedule for current sprint',
  },
  medium: {
    destination: 'backlog',
    description: 'Address in polish phase',
    action: 'Add to backlog for grooming',
  },
  low: {
    destination: 'backlog',
    description: 'Address in polish phase',
    action: 'Add to backlog for grooming',
  },
};

/**
 * Quick reference: Build phases
 */
export const BUILD_PHASES: BuildPhaseType[] = [
  'database_foundation',
  'agent_integration',
  'api_routes',
  'ui_components',
  'employee_management',
  'capture_pipeline',
  'analytics_forecasting',
  'audit_documentation',
  'partnership_features',
  'polish_production',
];

/**
 * Quick reference: Phase descriptions
 */
export const PHASE_DESCRIPTIONS: Record<BuildPhaseType, string> = {
  database_foundation: 'PostgreSQL, Prisma, PostGIS, seed data',
  agent_integration: 'NEXUS, SENTINEL, CARTOGRAPH, WORKFORCE core agents',
  api_routes: 'REST endpoints, authentication, validation',
  ui_components: 'Dashboard, forms, tables, charts',
  employee_management: 'CRUD, address verification, bulk import',
  capture_pipeline: 'SAM.gov integration, pipeline, bid/no-bid',
  analytics_forecasting: 'Trends, forecasts, scenario analysis',
  audit_documentation: 'Evidence packages, gap analysis, exports',
  partnership_features: 'Partner discovery, synergy analysis, JV evaluation',
  polish_production: 'Performance, security, onboarding, documentation',
};
