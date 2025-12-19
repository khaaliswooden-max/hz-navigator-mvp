/**
 * ReportGenerator - ARCHIVIST-powered feedback report generation
 * 
 * Implements the REPORT phase of the feedback cycle:
 * - Generates structured feedback reports
 * - Creates human-readable summaries
 * - Formats data for developer consumption
 * - Archives reports for historical tracking
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CycleResult, 
  FeedbackItem, 
  PatchItem,
  BuildPhase 
} from './BuildCycle';
import { TriageReport } from './TriageSystem';
import { FeedbackAnalysisReport } from './FeedbackAnalyzer';

// ============================================================
// TYPES
// ============================================================

export interface FeedbackReport {
  // Metadata
  reportId: string;
  generatedAt: Date;
  cycleNumber: number;
  phase: BuildPhase;
  
  // Executive summary
  executiveSummary: {
    status: 'PASSED' | 'BLOCKED' | 'NEEDS_PATCHES';
    headline: string;
    healthScore: number;
    totalIssues: number;
    buildBlockers: number;
    parallelPatches: number;
    backlogItems: number;
    recommendation: string;
  };
  
  // Detailed sections
  sections: {
    buildBlockers: ReportSection;
    parallelPatches: ReportSection;
    backlog: ReportSection;
    agentHealth: AgentHealthSection;
    trends: TrendSection;
    patterns: PatternSection;
  };
  
  // Action items
  actionItems: ActionItem[];
  
  // For developers
  developerNotes: DeveloperNote[];
  
  // Archive info
  archiveInfo: {
    storedAt?: string;
    documentId?: string;
  };
}

export interface ReportSection {
  title: string;
  count: number;
  items: Array<{
    id: string;
    severity: string;
    agent: string;
    description: string;
    suggestedFix?: string;
    estimatedHours?: number;
    assignedTo?: string;
  }>;
  summary: string;
}

export interface AgentHealthSection {
  title: string;
  agents: Array<{
    name: string;
    healthScore: number;
    status: 'healthy' | 'warning' | 'critical';
    feedbackCount: number;
    criticalCount: number;
    recommendation?: string;
  }>;
  summary: string;
}

export interface TrendSection {
  title: string;
  trends: Array<{
    metric: string;
    direction: string;
    change: string;
    icon: string;
  }>;
  summary: string;
}

export interface PatternSection {
  title: string;
  patterns: Array<{
    description: string;
    affectedAgents: string[];
    suggestedFix: string;
    priority: string;
  }>;
  summary: string;
}

export interface ActionItem {
  id: string;
  priority: number;
  type: 'blocker' | 'patch' | 'improvement' | 'monitoring';
  description: string;
  owner?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'done';
}

export interface DeveloperNote {
  agent: string;
  category: string;
  note: string;
  codeReference?: string;
  priority: 'must_read' | 'important' | 'fyi';
}

// ============================================================
// REPORT GENERATOR (ARCHIVIST)
// ============================================================

export class ReportGenerator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate comprehensive feedback report
   */
  async generateReport(
    cycleResult: CycleResult,
    triageReport: TriageReport,
    analysisReport: FeedbackAnalysisReport
  ): Promise<FeedbackReport> {
    const reportId = `report-${cycleResult.cycleNumber}-${Date.now()}`;

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(cycleResult, triageReport);

    // Generate detailed sections
    const sections = {
      buildBlockers: this.generateBlockersSection(triageReport),
      parallelPatches: this.generatePatchesSection(triageReport),
      backlog: this.generateBacklogSection(triageReport),
      agentHealth: this.generateAgentHealthSection(analysisReport),
      trends: this.generateTrendSection(analysisReport),
      patterns: this.generatePatternSection(analysisReport),
    };

    // Generate action items
    const actionItems = this.generateActionItems(cycleResult, triageReport);

    // Generate developer notes
    const developerNotes = this.generateDeveloperNotes(cycleResult.feedbackItems);

    const report: FeedbackReport = {
      reportId,
      generatedAt: new Date(),
      cycleNumber: cycleResult.cycleNumber,
      phase: cycleResult.phase,
      executiveSummary,
      sections,
      actionItems,
      developerNotes,
      archiveInfo: {},
    };

    // Archive the report
    await this.archiveReport(report);

    return report;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    cycleResult: CycleResult,
    triageReport: TriageReport
  ): FeedbackReport['executiveSummary'] {
    let status: 'PASSED' | 'BLOCKED' | 'NEEDS_PATCHES';
    let headline: string;

    if (cycleResult.status === 'blocked') {
      status = 'BLOCKED';
      headline = `🛑 Build blocked: ${triageReport.buildBlockers} critical issue(s) require immediate attention`;
    } else if (cycleResult.status === 'needs_patches') {
      status = 'NEEDS_PATCHES';
      headline = `⚠️ Can proceed with ${triageReport.parallelPatches} patch(es) to address in parallel`;
    } else {
      status = 'PASSED';
      headline = `✅ All tests passed. Ready for ${cycleResult.nextPhase || 'deployment'}`;
    }

    return {
      status,
      headline,
      healthScore: cycleResult.healthScore,
      totalIssues: cycleResult.feedbackItems.length,
      buildBlockers: triageReport.buildBlockers,
      parallelPatches: triageReport.parallelPatches,
      backlogItems: triageReport.backlogItems,
      recommendation: cycleResult.recommendation,
    };
  }

  /**
   * Generate build blockers section
   */
  private generateBlockersSection(triageReport: TriageReport): ReportSection {
    const items = triageReport.blockerQueue.map(b => ({
      id: b.feedbackId,
      severity: 'CRITICAL',
      agent: b.suggestedOwner || 'unassigned',
      description: b.rationale,
      suggestedFix: `Fix critical: ${b.rationale}`,
      estimatedHours: b.estimatedResolutionHours,
      assignedTo: b.suggestedOwner,
    }));

    const totalHours = items.reduce((sum, i) => sum + (i.estimatedHours || 0), 0);

    return {
      title: '🛑 Build Blockers',
      count: items.length,
      items,
      summary: items.length > 0
        ? `${items.length} critical issue(s) blocking build. Estimated resolution: ${totalHours}h`
        : 'No build blockers. ✅',
    };
  }

  /**
   * Generate parallel patches section
   */
  private generatePatchesSection(triageReport: TriageReport): ReportSection {
    const items = triageReport.patchQueue.map(p => ({
      id: p.feedbackId,
      severity: 'HIGH',
      agent: p.suggestedOwner || 'unassigned',
      description: p.rationale,
      suggestedFix: `Address: ${p.rationale}`,
      estimatedHours: p.estimatedResolutionHours,
      assignedTo: p.suggestedOwner,
    }));

    const totalHours = items.reduce((sum, i) => sum + (i.estimatedHours || 0), 0);

    return {
      title: '🔧 Parallel Patches',
      count: items.length,
      items,
      summary: items.length > 0
        ? `${items.length} patch(es) to address in parallel with next phase. Estimated: ${totalHours}h`
        : 'No parallel patches needed. ✅',
    };
  }

  /**
   * Generate backlog section
   */
  private generateBacklogSection(triageReport: TriageReport): ReportSection {
    const items = triageReport.backlogQueue.slice(0, 20).map(b => ({
      id: b.feedbackId,
      severity: b.adjustedSeverity.toUpperCase(),
      agent: b.suggestedOwner || 'unassigned',
      description: b.rationale,
      estimatedHours: b.estimatedResolutionHours,
    }));

    return {
      title: '📋 Backlog (Polish Phase)',
      count: triageReport.backlogItems,
      items,
      summary: triageReport.backlogItems > 0
        ? `${triageReport.backlogItems} item(s) queued for polish phase (showing top 20)`
        : 'Backlog is empty. ✅',
    };
  }

  /**
   * Generate agent health section
   */
  private generateAgentHealthSection(analysisReport: FeedbackAnalysisReport): AgentHealthSection {
    const agents = analysisReport.agentMetrics.map(m => ({
      name: m.agentId,
      healthScore: m.healthScore,
      status: (m.healthScore >= 80 ? 'healthy' : m.healthScore >= 50 ? 'warning' : 'critical') as 'healthy' | 'warning' | 'critical',
      feedbackCount: m.feedbackCount,
      criticalCount: m.criticalCount,
      recommendation: m.healthScore < 70
        ? `Review ${m.agentId} implementation`
        : undefined,
    }));

    const unhealthy = agents.filter(a => a.status !== 'healthy');

    return {
      title: '🏥 Agent Health',
      agents,
      summary: unhealthy.length > 0
        ? `${unhealthy.length} agent(s) need attention: ${unhealthy.map(a => a.name).join(', ')}`
        : 'All agents healthy. ✅',
    };
  }

  /**
   * Generate trends section
   */
  private generateTrendSection(analysisReport: FeedbackAnalysisReport): TrendSection {
    const trends = analysisReport.trends.map(t => {
      let icon: string;
      if (t.direction === 'improving') icon = '📈';
      else if (t.direction === 'declining') icon = '📉';
      else icon = '➡️';

      return {
        metric: t.metric,
        direction: t.direction,
        change: `${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(1)}%`,
        icon,
      };
    });

    const declining = trends.filter(t => t.direction === 'declining');

    return {
      title: '📊 Trends',
      trends,
      summary: declining.length > 0
        ? `${declining.length} metric(s) declining: ${declining.map(d => d.metric).join(', ')}`
        : 'All metrics stable or improving. ✅',
    };
  }

  /**
   * Generate patterns section
   */
  private generatePatternSection(analysisReport: FeedbackAnalysisReport): PatternSection {
    const patterns = analysisReport.rootCauses.slice(0, 5).map(r => ({
      description: r.description,
      affectedAgents: r.affectedItems.slice(0, 3),
      suggestedFix: r.suggestedFix,
      priority: r.estimatedImpact.toUpperCase(),
    }));

    return {
      title: '🔍 Patterns Detected',
      patterns,
      summary: patterns.length > 0
        ? `${patterns.length} pattern(s) detected requiring attention`
        : 'No significant patterns detected.',
    };
  }

  /**
   * Generate action items
   */
  private generateActionItems(
    cycleResult: CycleResult,
    triageReport: TriageReport
  ): ActionItem[] {
    const items: ActionItem[] = [];
    let priority = 1;

    // Add blockers as highest priority
    for (const blocker of triageReport.blockerQueue) {
      items.push({
        id: `action-${priority}`,
        priority: priority++,
        type: 'blocker',
        description: `[BLOCKER] ${blocker.rationale}`,
        owner: blocker.suggestedOwner,
        deadline: 'ASAP',
        status: 'pending',
      });
    }

    // Add patches as next priority
    for (const patch of triageReport.patchQueue.slice(0, 10)) {
      items.push({
        id: `action-${priority}`,
        priority: priority++,
        type: 'patch',
        description: `[PATCH] ${patch.rationale}`,
        owner: patch.suggestedOwner,
        deadline: 'This sprint',
        status: 'pending',
      });
    }

    // Add general improvements
    if (triageReport.patterns.length > 0) {
      items.push({
        id: `action-${priority}`,
        priority: priority++,
        type: 'improvement',
        description: `[IMPROVE] Address pattern: ${triageReport.patterns[0].description}`,
        deadline: 'Next sprint',
        status: 'pending',
      });
    }

    // Add monitoring if escalations occurred
    if (triageReport.autoEscalations > 0) {
      items.push({
        id: `action-${priority}`,
        priority: priority++,
        type: 'monitoring',
        description: `[MONITOR] ${triageReport.autoEscalations} auto-escalations occurred. Review escalation rules.`,
        deadline: 'Ongoing',
        status: 'pending',
      });
    }

    return items;
  }

  /**
   * Generate developer notes
   */
  private generateDeveloperNotes(feedbackItems: FeedbackItem[]): DeveloperNote[] {
    const notes: DeveloperNote[] = [];

    // Group feedback by agent
    const byAgent = feedbackItems.reduce((acc, item) => {
      if (!acc[item.agentSource]) acc[item.agentSource] = [];
      acc[item.agentSource].push(item);
      return acc;
    }, {} as Record<string, FeedbackItem[]>);

    for (const [agent, items] of Object.entries(byAgent)) {
      // Critical items get must_read notes
      const critical = items.filter(i => i.severity === 'critical');
      for (const c of critical) {
        notes.push({
          agent,
          category: c.category,
          note: `CRITICAL: ${c.description}\nExpected: ${c.expectedBehavior}\nActual: ${c.actualBehavior}`,
          priority: 'must_read',
        });
      }

      // Bugs get important notes
      const bugs = items.filter(i => i.category === 'bug' && i.severity !== 'critical');
      if (bugs.length > 0) {
        notes.push({
          agent,
          category: 'bug',
          note: `${bugs.length} bug(s) found in ${agent}. Review: ${bugs.map(b => b.description).join('; ')}`,
          priority: 'important',
        });
      }

      // Performance issues
      const perf = items.filter(i => i.category === 'performance');
      if (perf.length > 0) {
        notes.push({
          agent,
          category: 'performance',
          note: `Performance concerns in ${agent}: ${perf.map(p => p.description).join('; ')}`,
          priority: 'fyi',
        });
      }
    }

    return notes.sort((a, b) => {
      const priorityOrder = { must_read: 0, important: 1, fyi: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Archive report to database
   */
  private async archiveReport(report: FeedbackReport): Promise<void> {
    try {
      // Get a default organization for system reports
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        console.warn('[ReportGenerator] No organization found, skipping archive');
        return;
      }

      const doc = await this.prisma.document.create({
        data: {
          organizationId: defaultOrg.id,
          title: `Feedback Report - Cycle ${report.cycleNumber} - ${report.phase}`,
          type: 'feedback_report',
          content: JSON.stringify(report, null, 2),
          metadata: {
            reportId: report.reportId,
            cycleNumber: report.cycleNumber,
            phase: report.phase,
            status: report.executiveSummary.status,
            healthScore: report.executiveSummary.healthScore,
          } as Prisma.InputJsonValue,
          tags: ['feedback', 'cycle-report', report.phase],
        },
      });

      report.archiveInfo = {
        storedAt: new Date().toISOString(),
        documentId: doc.id,
      };

      console.log(`[ReportGenerator] Archived report: ${doc.id}`);
    } catch (error) {
      console.error('[ReportGenerator] Failed to archive report:', error);
    }
  }

  /**
   * Format report as console output
   */
  formatForConsole(report: FeedbackReport): string {
    const lines: string[] = [];
    const divider = '═'.repeat(70);
    const subDivider = '─'.repeat(70);

    lines.push('');
    lines.push(divider);
    lines.push(`  FEEDBACK REPORT - CYCLE ${report.cycleNumber}: ${report.phase.toUpperCase()}`);
    lines.push(divider);
    lines.push('');

    // Executive Summary
    lines.push('📋 EXECUTIVE SUMMARY');
    lines.push(subDivider);
    lines.push(`Status: ${report.executiveSummary.status}`);
    lines.push(`${report.executiveSummary.headline}`);
    lines.push('');
    lines.push(`Health Score: ${report.executiveSummary.healthScore.toFixed(1)}%`);
    lines.push(`Total Issues: ${report.executiveSummary.totalIssues}`);
    lines.push(`  • Build Blockers: ${report.executiveSummary.buildBlockers}`);
    lines.push(`  • Parallel Patches: ${report.executiveSummary.parallelPatches}`);
    lines.push(`  • Backlog Items: ${report.executiveSummary.backlogItems}`);
    lines.push('');
    lines.push(`Recommendation: ${report.executiveSummary.recommendation}`);
    lines.push('');

    // Build Blockers
    if (report.sections.buildBlockers.count > 0) {
      lines.push(report.sections.buildBlockers.title);
      lines.push(subDivider);
      for (const item of report.sections.buildBlockers.items) {
        lines.push(`  [${item.severity}] ${item.agent}: ${item.description}`);
        if (item.estimatedHours) {
          lines.push(`         Est: ${item.estimatedHours}h | Owner: ${item.assignedTo || 'unassigned'}`);
        }
      }
      lines.push('');
    }

    // Parallel Patches (show first 5)
    if (report.sections.parallelPatches.count > 0) {
      lines.push(report.sections.parallelPatches.title);
      lines.push(subDivider);
      for (const item of report.sections.parallelPatches.items.slice(0, 5)) {
        lines.push(`  [${item.severity}] ${item.agent}: ${item.description}`);
      }
      if (report.sections.parallelPatches.count > 5) {
        lines.push(`  ... and ${report.sections.parallelPatches.count - 5} more`);
      }
      lines.push('');
    }

    // Agent Health
    lines.push(report.sections.agentHealth.title);
    lines.push(subDivider);
    for (const agent of report.sections.agentHealth.agents) {
      const icon = agent.status === 'healthy' ? '✅' : agent.status === 'warning' ? '⚠️' : '🔴';
      lines.push(`  ${icon} ${agent.name}: ${agent.healthScore.toFixed(0)}% (${agent.feedbackCount} issues)`);
    }
    lines.push('');

    // Action Items (top 10)
    lines.push('📝 ACTION ITEMS');
    lines.push(subDivider);
    for (const action of report.actionItems.slice(0, 10)) {
      const icon = action.type === 'blocker' ? '🛑' : action.type === 'patch' ? '🔧' : '📌';
      lines.push(`  ${action.priority}. ${icon} ${action.description}`);
    }
    lines.push('');

    lines.push(divider);
    lines.push(`Report ID: ${report.reportId}`);
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(divider);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format report as markdown
   */
  formatAsMarkdown(report: FeedbackReport): string {
    let md = `# Feedback Report - Cycle ${report.cycleNumber}\n\n`;
    md += `**Phase:** ${report.phase}\n`;
    md += `**Generated:** ${report.generatedAt.toISOString()}\n`;
    md += `**Status:** ${report.executiveSummary.status}\n\n`;

    md += `## Executive Summary\n\n`;
    md += `${report.executiveSummary.headline}\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Health Score | ${report.executiveSummary.healthScore.toFixed(1)}% |\n`;
    md += `| Total Issues | ${report.executiveSummary.totalIssues} |\n`;
    md += `| Build Blockers | ${report.executiveSummary.buildBlockers} |\n`;
    md += `| Parallel Patches | ${report.executiveSummary.parallelPatches} |\n`;
    md += `| Backlog Items | ${report.executiveSummary.backlogItems} |\n\n`;

    md += `**Recommendation:** ${report.executiveSummary.recommendation}\n\n`;

    if (report.sections.buildBlockers.count > 0) {
      md += `## 🛑 Build Blockers\n\n`;
      for (const item of report.sections.buildBlockers.items) {
        md += `- **${item.agent}**: ${item.description}\n`;
        md += `  - Est: ${item.estimatedHours}h | Owner: ${item.assignedTo || 'unassigned'}\n`;
      }
      md += '\n';
    }

    md += `## Action Items\n\n`;
    for (const action of report.actionItems) {
      md += `${action.priority}. ${action.description}\n`;
    }

    return md;
  }
}
