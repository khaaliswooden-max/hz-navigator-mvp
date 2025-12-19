/**
 * TriageSystem - NEXUS-powered issue prioritization
 * 
 * Implements the TRIAGE phase of the feedback cycle:
 * - Critical → Build blockers (must fix before proceeding)
 * - High → Patches (can fix in parallel with next phase)
 * - Medium/Low → Backlog (addressed in polish phase)
 * 
 * Also tracks:
 * - Pattern detection across issues
 * - Auto-escalation rules
 * - Developer assignment suggestions
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { 
  FeedbackItem, 
  FeedbackSeverity, 
  FeedbackCategory, 
  PatchItem,
  BuildPhase 
} from './BuildCycle';

// ============================================================
// TYPES
// ============================================================

export interface TriageDecision {
  feedbackId: string;
  originalSeverity: FeedbackSeverity;
  adjustedSeverity: FeedbackSeverity;
  priority: number;
  destination: 'build_blocker' | 'parallel_patch' | 'backlog';
  rationale: string;
  autoEscalated: boolean;
  escalationReason?: string;
  suggestedOwner?: string;
  estimatedResolutionHours: number;
  blocksOthers: boolean;
  dependencies: string[];
}

export interface TriageReport {
  cycleNumber: number;
  phase: BuildPhase;
  timestamp: Date;
  
  // Summary
  totalIssues: number;
  buildBlockers: number;
  parallelPatches: number;
  backlogItems: number;
  
  // Escalations
  autoEscalations: number;
  escalationReasons: string[];
  
  // Prioritized lists
  blockerQueue: TriageDecision[];
  patchQueue: TriageDecision[];
  backlogQueue: TriageDecision[];
  
  // Patterns detected
  patterns: IssuePattern[];
  
  // Recommendations
  recommendations: string[];
  estimatedBlockerResolutionHours: number;
  estimatedPatchResolutionHours: number;
}

export interface IssuePattern {
  patternId: string;
  description: string;
  affectedCount: number;
  affectedAgents: string[];
  suggestedRootCause: string;
  suggestedFix: string;
  consolidatedPriority: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  condition: (feedback: FeedbackItem) => boolean;
  escalateTo: FeedbackSeverity;
  reason: string;
}

// ============================================================
// TRIAGE SYSTEM
// ============================================================

export class TriageSystem {
  private prisma: PrismaClient;
  private escalationRules: EscalationRule[] = [];
  private decisions: Map<string, TriageDecision> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeEscalationRules();
  }

  /**
   * Initialize default escalation rules
   */
  private initializeEscalationRules(): void {
    this.escalationRules = [
      // Rule 1: Compliance issues are always critical
      {
        id: 'compliance-to-critical',
        name: 'Compliance Auto-Escalation',
        condition: (f) => f.category === 'compliance' && f.severity !== 'critical',
        escalateTo: 'critical',
        reason: 'Compliance issues risk certification',
      },
      
      // Rule 2: Security issues escalate to at least high
      {
        id: 'security-to-high',
        name: 'Security Auto-Escalation',
        condition: (f) => f.category === 'security' && (f.severity === 'medium' || f.severity === 'low'),
        escalateTo: 'high',
        reason: 'Security issues require prompt attention',
      },
      
      // Rule 3: Data integrity issues escalate to high
      {
        id: 'data-integrity-to-high',
        name: 'Data Integrity Auto-Escalation',
        condition: (f) => f.category === 'data_quality' && f.severity === 'medium',
        escalateTo: 'high',
        reason: 'Data integrity affects compliance calculations',
      },
      
      // Rule 4: SENTINEL bugs are critical (affects compliance)
      {
        id: 'sentinel-bugs-critical',
        name: 'SENTINEL Bug Escalation',
        condition: (f) => f.agentSource === 'SENTINEL' && f.category === 'bug',
        escalateTo: 'critical',
        reason: 'SENTINEL bugs directly affect compliance accuracy',
      },
      
      // Rule 5: Performance issues affecting core paths escalate
      {
        id: 'core-performance-escalation',
        name: 'Core Performance Escalation',
        condition: (f) => {
          const coreAgents = ['SENTINEL', 'CARTOGRAPH', 'WORKFORCE', 'NEXUS'];
          return f.category === 'performance' && 
                 coreAgents.includes(f.agentSource) &&
                 f.severity === 'medium';
        },
        escalateTo: 'high',
        reason: 'Performance issues in core agents affect user experience',
      },
    ];
  }

  /**
   * Add custom escalation rule
   */
  addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.push(rule);
  }

  /**
   * Triage a single feedback item
   */
  triageFeedback(feedback: FeedbackItem): TriageDecision {
    let adjustedSeverity = feedback.severity;
    let autoEscalated = false;
    let escalationReason: string | undefined;

    // Check escalation rules
    for (const rule of this.escalationRules) {
      if (rule.condition(feedback)) {
        const severityOrder: FeedbackSeverity[] = ['low', 'medium', 'high', 'critical'];
        const currentIndex = severityOrder.indexOf(adjustedSeverity);
        const escalateIndex = severityOrder.indexOf(rule.escalateTo);
        
        if (escalateIndex > currentIndex) {
          adjustedSeverity = rule.escalateTo;
          autoEscalated = true;
          escalationReason = rule.reason;
        }
      }
    }

    // Determine destination
    let destination: TriageDecision['destination'];
    switch (adjustedSeverity) {
      case 'critical':
        destination = 'build_blocker';
        break;
      case 'high':
        destination = 'parallel_patch';
        break;
      default:
        destination = 'backlog';
    }

    // Calculate priority (lower = higher priority)
    const severityWeight = { critical: 0, high: 100, medium: 200, low: 300 };
    const categoryWeight = { 
      security: 0, compliance: 5, bug: 10, 
      data_quality: 15, performance: 20, ux_issue: 25, feature_gap: 30 
    };
    const priority = severityWeight[adjustedSeverity] + categoryWeight[feedback.category];

    // Estimate resolution time
    const effortMap = {
      bug: { critical: 4, high: 2, medium: 1, low: 0.5 },
      performance: { critical: 8, high: 4, medium: 2, low: 1 },
      ux_issue: { critical: 4, high: 2, medium: 1, low: 0.5 },
      feature_gap: { critical: 16, high: 8, medium: 4, low: 2 },
      data_quality: { critical: 4, high: 2, medium: 1, low: 0.5 },
      security: { critical: 8, high: 4, medium: 2, low: 1 },
      compliance: { critical: 8, high: 4, medium: 2, low: 1 },
    };
    const estimatedResolutionHours = effortMap[feedback.category][adjustedSeverity];

    // Generate rationale
    let rationale = `${adjustedSeverity.toUpperCase()} ${feedback.category} in ${feedback.agentSource}`;
    if (autoEscalated) {
      rationale += ` (escalated from ${feedback.severity}: ${escalationReason})`;
    }

    const decision: TriageDecision = {
      feedbackId: feedback.id,
      originalSeverity: feedback.severity,
      adjustedSeverity,
      priority,
      destination,
      rationale,
      autoEscalated,
      escalationReason,
      suggestedOwner: this.suggestOwner(feedback),
      estimatedResolutionHours,
      blocksOthers: this.checksBlocksDependencies(feedback),
      dependencies: this.findDependencies(feedback),
    };

    this.decisions.set(feedback.id, decision);
    return decision;
  }

  /**
   * Triage all feedback items and generate report
   */
  triageAll(feedbackItems: FeedbackItem[], cycleNumber: number, phase: BuildPhase): TriageReport {
    // Triage each item
    const decisions: TriageDecision[] = feedbackItems.map(f => this.triageFeedback(f));

    // Sort by priority
    decisions.sort((a, b) => a.priority - b.priority);

    // Categorize into queues
    const blockerQueue = decisions.filter(d => d.destination === 'build_blocker');
    const patchQueue = decisions.filter(d => d.destination === 'parallel_patch');
    const backlogQueue = decisions.filter(d => d.destination === 'backlog');

    // Count escalations
    const escalations = decisions.filter(d => d.autoEscalated);

    // Detect patterns
    const patterns = this.detectPatterns(feedbackItems);

    // Calculate resolution estimates
    const blockerHours = blockerQueue.reduce((sum, d) => sum + d.estimatedResolutionHours, 0);
    const patchHours = patchQueue.reduce((sum, d) => sum + d.estimatedResolutionHours, 0);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      blockerQueue, patchQueue, backlogQueue, patterns
    );

    return {
      cycleNumber,
      phase,
      timestamp: new Date(),
      
      totalIssues: feedbackItems.length,
      buildBlockers: blockerQueue.length,
      parallelPatches: patchQueue.length,
      backlogItems: backlogQueue.length,
      
      autoEscalations: escalations.length,
      escalationReasons: [...new Set(escalations.map(e => e.escalationReason!))],
      
      blockerQueue,
      patchQueue,
      backlogQueue,
      
      patterns,
      
      recommendations,
      estimatedBlockerResolutionHours: blockerHours,
      estimatedPatchResolutionHours: patchHours,
    };
  }

  /**
   * Detect patterns across feedback items
   */
  private detectPatterns(feedbackItems: FeedbackItem[]): IssuePattern[] {
    const patterns: IssuePattern[] = [];

    // Pattern 1: Multiple issues in same agent
    const byAgent = this.groupBy(feedbackItems, 'agentSource');
    for (const [agent, items] of Object.entries(byAgent)) {
      if (items.length >= 3) {
        patterns.push({
          patternId: `agent-cluster-${agent}`,
          description: `Multiple issues in ${agent} agent`,
          affectedCount: items.length,
          affectedAgents: [agent],
          suggestedRootCause: `${agent} may need architectural review`,
          suggestedFix: `Prioritize ${agent} stabilization before adding features`,
          consolidatedPriority: Math.min(...items.map(i => 
            this.decisions.get(i.id)?.priority || 999
          )),
        });
      }
    }

    // Pattern 2: Multiple issues of same category
    const byCategory = this.groupBy(feedbackItems, 'category');
    for (const [category, items] of Object.entries(byCategory)) {
      if (items.length >= 4) {
        const agents = [...new Set(items.map(i => i.agentSource))];
        patterns.push({
          patternId: `category-spread-${category}`,
          description: `${category} issues across ${agents.length} agents`,
          affectedCount: items.length,
          affectedAgents: agents,
          suggestedRootCause: `Systemic ${category} issue`,
          suggestedFix: `Review ${category} handling patterns across codebase`,
          consolidatedPriority: Math.min(...items.map(i => 
            this.decisions.get(i.id)?.priority || 999
          )),
        });
      }
    }

    // Pattern 3: Similar descriptions (simple keyword matching)
    const descriptionClusters = this.findSimilarDescriptions(feedbackItems);
    for (const cluster of descriptionClusters) {
      if (cluster.items.length >= 2) {
        patterns.push({
          patternId: `similar-${cluster.keyword}`,
          description: `Related issues: "${cluster.keyword}"`,
          affectedCount: cluster.items.length,
          affectedAgents: [...new Set(cluster.items.map(i => i.agentSource))],
          suggestedRootCause: `Common issue around "${cluster.keyword}"`,
          suggestedFix: `Address root cause: ${cluster.keyword}`,
          consolidatedPriority: Math.min(...cluster.items.map(i => 
            this.decisions.get(i.id)?.priority || 999
          )),
        });
      }
    }

    return patterns.sort((a, b) => a.consolidatedPriority - b.consolidatedPriority);
  }

  /**
   * Find items with similar descriptions
   */
  private findSimilarDescriptions(items: FeedbackItem[]): Array<{keyword: string; items: FeedbackItem[]}> {
    const clusters: Array<{keyword: string; items: FeedbackItem[]}> = [];
    const keywords = ['timeout', 'null', 'undefined', 'failed', 'slow', 'error', 'missing', 'invalid'];

    for (const keyword of keywords) {
      const matching = items.filter(i => 
        i.description.toLowerCase().includes(keyword) ||
        i.actualBehavior.toLowerCase().includes(keyword)
      );
      if (matching.length >= 2) {
        clusters.push({ keyword, items: matching });
      }
    }

    return clusters;
  }

  /**
   * Generate recommendations based on triage results
   */
  private generateRecommendations(
    blockers: TriageDecision[],
    patches: TriageDecision[],
    backlog: TriageDecision[],
    patterns: IssuePattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical path
    if (blockers.length > 0) {
      recommendations.push(
        `🛑 BLOCKED: Fix ${blockers.length} critical issue(s) before proceeding`
      );
      
      const totalBlockerHours = blockers.reduce((sum, b) => sum + b.estimatedResolutionHours, 0);
      recommendations.push(
        `⏱️ Estimated blocker resolution: ${totalBlockerHours}h`
      );
    }

    // Parallel patches
    if (patches.length > 0) {
      recommendations.push(
        `🔧 ${patches.length} patch(es) can be addressed in parallel with next phase`
      );
    }

    // Pattern-based recommendations
    for (const pattern of patterns.slice(0, 3)) {
      recommendations.push(
        `📊 Pattern detected: ${pattern.description} → ${pattern.suggestedFix}`
      );
    }

    // Escalation warnings
    const escalationCount = [...this.decisions.values()].filter(d => d.autoEscalated).length;
    if (escalationCount > 0) {
      recommendations.push(
        `⚠️ ${escalationCount} issue(s) auto-escalated by triage rules`
      );
    }

    // Backlog management
    if (backlog.length > 20) {
      recommendations.push(
        `📋 Consider scheduling backlog grooming (${backlog.length} items)`
      );
    }

    // Success case
    if (blockers.length === 0 && patches.length === 0) {
      recommendations.push(
        `✅ No blocking issues. Ready to proceed to next phase.`
      );
    }

    return recommendations;
  }

  /**
   * Suggest owner based on agent/category
   */
  private suggestOwner(feedback: FeedbackItem): string | undefined {
    const ownerMap: Record<string, string> = {
      SENTINEL: 'compliance-team',
      CARTOGRAPH: 'geo-team',
      WORKFORCE: 'hr-team',
      NEXUS: 'platform-team',
      CAPTURE: 'bd-team',
      ORACLE: 'analytics-team',
      ARCHIVIST: 'docs-team',
      GUARDIAN: 'audit-team',
      DIPLOMAT: 'partnerships-team',
      ADVOCATE: 'regulatory-team',
    };
    return ownerMap[feedback.agentSource];
  }

  /**
   * Check if this feedback blocks other items
   */
  private checksBlocksDependencies(feedback: FeedbackItem): boolean {
    // Core agents can block others
    const coreAgents = ['NEXUS', 'SENTINEL'];
    if (coreAgents.includes(feedback.agentSource) && feedback.severity === 'critical') {
      return true;
    }
    return false;
  }

  /**
   * Find dependencies for this feedback
   */
  private findDependencies(feedback: FeedbackItem): string[] {
    const dependencies: string[] = [];
    
    // Agents that depend on SENTINEL
    if (feedback.agentSource === 'SENTINEL') {
      dependencies.push('ORACLE', 'GUARDIAN', 'ARCHIVIST');
    }
    
    // Agents that depend on CARTOGRAPH
    if (feedback.agentSource === 'CARTOGRAPH') {
      dependencies.push('WORKFORCE', 'SENTINEL');
    }

    return dependencies;
  }

  /**
   * Get a specific triage decision
   */
  getDecision(feedbackId: string): TriageDecision | undefined {
    return this.decisions.get(feedbackId);
  }

  /**
   * Group items by a key
   */
  private groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

/**
 * Convert triage report to patches
 */
export function triageReportToPatches(report: TriageReport): PatchItem[] {
  const patches: PatchItem[] = [];

  // Convert blockers to high-priority patches
  for (const blocker of report.blockerQueue) {
    patches.push({
      id: `patch-blocker-${blocker.feedbackId}`,
      feedbackId: blocker.feedbackId,
      cycleNumber: report.cycleNumber,
      phase: report.phase,
      priority: blocker.priority,
      component: blocker.suggestedOwner || 'platform-team',
      description: blocker.rationale,
      estimatedEffort: blocker.estimatedResolutionHours <= 2 ? 'small' : 
                       blocker.estimatedResolutionHours <= 4 ? 'medium' : 'large',
      status: 'pending',
      suggestedFix: `Fix critical issue: ${blocker.rationale}`,
      assignedTo: blocker.suggestedOwner,
    });
  }

  // Convert parallel patches
  for (const patch of report.patchQueue) {
    patches.push({
      id: `patch-parallel-${patch.feedbackId}`,
      feedbackId: patch.feedbackId,
      cycleNumber: report.cycleNumber,
      phase: report.phase,
      priority: patch.priority,
      component: patch.suggestedOwner || 'platform-team',
      description: patch.rationale,
      estimatedEffort: patch.estimatedResolutionHours <= 2 ? 'small' : 
                       patch.estimatedResolutionHours <= 4 ? 'medium' : 'large',
      status: 'pending',
      suggestedFix: `Address: ${patch.rationale}`,
      assignedTo: patch.suggestedOwner,
    });
  }

  return patches.sort((a, b) => a.priority - b.priority);
}
