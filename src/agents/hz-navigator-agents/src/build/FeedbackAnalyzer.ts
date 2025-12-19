/**
 * FeedbackAnalyzer - ORACLE-powered feedback analysis
 * 
 * Implements the ANALYZE phase of the feedback cycle:
 * - Aggregates performance metrics across agents
 * - Identifies patterns and trends
 * - Correlates issues to root causes
 * - Tracks improvement over cycles
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { 
  FeedbackItem, 
  FeedbackSeverity, 
  FeedbackCategory,
  CycleResult,
  BuildPhase 
} from './BuildCycle';

// ============================================================
// TYPES
// ============================================================

export interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  avgExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  feedbackCount: number;
  criticalCount: number;
  highCount: number;
  healthScore: number;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  currentValue: number;
  previousValue: number;
  changePercent: number;
  dataPoints: Array<{ cycle: number; value: number }>;
  forecast?: number;
  confidence: number;
}

export interface RootCauseAnalysis {
  rootCauseId: string;
  description: string;
  affectedItems: string[];
  likelihood: number;
  evidence: string[];
  suggestedFix: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

export interface FeedbackAnalysisReport {
  cycleNumber: number;
  phase: BuildPhase;
  analyzedAt: Date;
  
  // Agent health
  agentMetrics: AgentMetrics[];
  overallHealthScore: number;
  
  // Trends
  trends: TrendAnalysis[];
  
  // Root cause analysis
  rootCauses: RootCauseAnalysis[];
  
  // Correlations
  correlations: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    description: string;
  }>;
  
  // Insights
  insights: string[];
  
  // Comparison with previous cycles
  cycleComparison?: {
    previousCycle: number;
    feedbackDelta: number;
    healthDelta: number;
    newIssuesResolved: number;
    recurringIssues: number;
  };
}

// ============================================================
// FEEDBACK ANALYZER (ORACLE)
// ============================================================

export class FeedbackAnalyzer {
  private prisma: PrismaClient;
  private historicalData: CycleResult[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Load historical cycle data for trend analysis
   */
  async loadHistoricalData(): Promise<void> {
    try {
      const learningEvents = await this.prisma.learningEvent.findMany({
        where: { eventType: { startsWith: 'feedback_' } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      
      // Group by cycle number from metadata
      // This would be populated from actual stored cycle results
      console.log(`[FeedbackAnalyzer] Loaded ${learningEvents.length} historical events`);
    } catch (error) {
      console.error('[FeedbackAnalyzer] Failed to load historical data:', error);
    }
  }

  /**
   * Add cycle result to history
   */
  addCycleResult(result: CycleResult): void {
    this.historicalData.push(result);
    // Keep last 50 cycles
    if (this.historicalData.length > 50) {
      this.historicalData.shift();
    }
  }

  /**
   * Analyze feedback and generate comprehensive report
   */
  async analyze(
    feedbackItems: FeedbackItem[],
    cycleNumber: number,
    phase: BuildPhase
  ): Promise<FeedbackAnalysisReport> {
    // Calculate agent metrics
    const agentMetrics = await this.calculateAgentMetrics(feedbackItems);
    
    // Analyze trends
    const trends = this.analyzeTrends(feedbackItems, cycleNumber);
    
    // Perform root cause analysis
    const rootCauses = this.analyzeRootCauses(feedbackItems);
    
    // Find correlations
    const correlations = this.findCorrelations(feedbackItems);
    
    // Generate insights
    const insights = this.generateInsights(agentMetrics, trends, rootCauses, feedbackItems);
    
    // Compare with previous cycle
    const cycleComparison = this.compareToPreviousCycle(cycleNumber, feedbackItems);
    
    // Calculate overall health score
    const overallHealthScore = this.calculateOverallHealth(agentMetrics, feedbackItems);

    return {
      cycleNumber,
      phase,
      analyzedAt: new Date(),
      agentMetrics,
      overallHealthScore,
      trends,
      rootCauses,
      correlations,
      insights,
      cycleComparison,
    };
  }

  /**
   * Calculate metrics for each agent
   */
  private async calculateAgentMetrics(feedbackItems: FeedbackItem[]): Promise<AgentMetrics[]> {
    const byAgent = this.groupBy(feedbackItems, 'agentSource');
    const metrics: AgentMetrics[] = [];

    // Try to get actual task execution data
    let taskData: Record<string, Array<{ success: boolean; executionTimeMs: number }>> = {};
    try {
      const tasks = await this.prisma.agentTask.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { agentType: true, status: true, executionTimeMs: true },
      });
      
      for (const task of tasks) {
        if (!taskData[task.agentType]) {
          taskData[task.agentType] = [];
        }
        taskData[task.agentType].push({
          success: task.status === 'completed',
          executionTimeMs: task.executionTimeMs || 0,
        });
      }
    } catch {
      console.log('[FeedbackAnalyzer] No task execution data available');
    }

    const agents = [
      'NEXUS', 'SENTINEL', 'CARTOGRAPH', 'WORKFORCE', 'CAPTURE',
      'ADVOCATE', 'GUARDIAN', 'DIPLOMAT', 'ORACLE', 'ARCHIVIST'
    ];

    for (const agentId of agents) {
      const agentFeedback = byAgent[agentId] || [];
      const agentTasks = taskData[agentId.toLowerCase()] || [];
      
      const totalTasks = agentTasks.length || 1;
      const successfulTasks = agentTasks.filter(t => t.success).length;
      const executionTimes = agentTasks.map(t => t.executionTimeMs).filter(t => t > 0);
      
      const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 100;
      const avgExecutionTimeMs = executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;
      const p95ExecutionTimeMs = this.percentile(executionTimes, 95);

      const criticalCount = agentFeedback.filter(f => f.severity === 'critical').length;
      const highCount = agentFeedback.filter(f => f.severity === 'high').length;
      
      // Health score: 100 - penalties
      let healthScore = 100;
      healthScore -= criticalCount * 25;  // -25 per critical
      healthScore -= highCount * 10;      // -10 per high
      healthScore -= agentFeedback.length * 2;  // -2 per any feedback
      healthScore = Math.max(0, healthScore);

      metrics.push({
        agentId,
        totalTasks,
        successfulTasks,
        failedTasks: totalTasks - successfulTasks,
        successRate,
        avgExecutionTimeMs,
        p95ExecutionTimeMs,
        feedbackCount: agentFeedback.length,
        criticalCount,
        highCount,
        healthScore,
      });
    }

    return metrics.sort((a, b) => a.healthScore - b.healthScore);
  }

  /**
   * Analyze trends across cycles
   */
  private analyzeTrends(feedbackItems: FeedbackItem[], cycleNumber: number): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    
    // Total feedback trend
    const feedbackCounts = this.historicalData.map(h => ({
      cycle: h.cycleNumber,
      value: h.feedbackItems.length,
    }));
    feedbackCounts.push({ cycle: cycleNumber, value: feedbackItems.length });
    
    if (feedbackCounts.length >= 2) {
      const trend = this.calculateTrend(feedbackCounts);
      trends.push({
        metric: 'Total Feedback Items',
        ...trend,
        dataPoints: feedbackCounts.slice(-10),
      });
    }

    // Critical issues trend
    const criticalCounts = this.historicalData.map(h => ({
      cycle: h.cycleNumber,
      value: h.bySeverity.critical,
    }));
    criticalCounts.push({ 
      cycle: cycleNumber, 
      value: feedbackItems.filter(f => f.severity === 'critical').length 
    });
    
    if (criticalCounts.length >= 2) {
      const trend = this.calculateTrend(criticalCounts);
      trends.push({
        metric: 'Critical Issues',
        ...trend,
        dataPoints: criticalCounts.slice(-10),
      });
    }

    // Health score trend
    const healthScores = this.historicalData.map(h => ({
      cycle: h.cycleNumber,
      value: h.healthScore,
    }));
    if (healthScores.length >= 2) {
      const trend = this.calculateTrend(healthScores);
      trends.push({
        metric: 'Health Score',
        ...trend,
        dataPoints: healthScores.slice(-10),
      });
    }

    return trends;
  }

  /**
   * Calculate trend direction and statistics
   */
  private calculateTrend(dataPoints: Array<{ cycle: number; value: number }>): {
    direction: 'improving' | 'stable' | 'declining';
    currentValue: number;
    previousValue: number;
    changePercent: number;
    forecast?: number;
    confidence: number;
  } {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        currentValue: dataPoints[0]?.value || 0,
        previousValue: 0,
        changePercent: 0,
        confidence: 0,
      };
    }

    const current = dataPoints[dataPoints.length - 1].value;
    const previous = dataPoints[dataPoints.length - 2].value;
    const changePercent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

    // Simple linear regression for trend
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.cycle, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.value, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.cycle * p.value, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.cycle * p.cycle, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Forecast next cycle
    const nextCycle = dataPoints[dataPoints.length - 1].cycle + 1;
    const forecast = slope * nextCycle + intercept;
    
    // Confidence based on data points
    const confidence = Math.min(95, 50 + n * 5);

    // Determine direction (for issues, decreasing is improving)
    let direction: 'improving' | 'stable' | 'declining';
    if (Math.abs(slope) < 0.5) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'declining'; // More issues = declining
    } else {
      direction = 'improving'; // Fewer issues = improving
    }

    return {
      direction,
      currentValue: current,
      previousValue: previous,
      changePercent,
      forecast: Math.max(0, forecast),
      confidence,
    };
  }

  /**
   * Perform root cause analysis
   */
  private analyzeRootCauses(feedbackItems: FeedbackItem[]): RootCauseAnalysis[] {
    const rootCauses: RootCauseAnalysis[] = [];

    // Group by category and look for patterns
    const byCategory = this.groupBy(feedbackItems, 'category');
    
    // Pattern: Multiple bugs in same agent
    const byAgent = this.groupBy(feedbackItems.filter(f => f.category === 'bug'), 'agentSource');
    for (const [agent, bugs] of Object.entries(byAgent)) {
      if (bugs.length >= 2) {
        rootCauses.push({
          rootCauseId: `agent-instability-${agent}`,
          description: `${agent} agent showing multiple bugs`,
          affectedItems: bugs.map(b => b.id),
          likelihood: Math.min(95, 50 + bugs.length * 15),
          evidence: bugs.map(b => b.description),
          suggestedFix: `Review ${agent} implementation and add integration tests`,
          estimatedImpact: bugs.some(b => b.severity === 'critical') ? 'high' : 'medium',
        });
      }
    }

    // Pattern: Performance issues cluster
    const perfIssues = feedbackItems.filter(f => f.category === 'performance');
    if (perfIssues.length >= 3) {
      rootCauses.push({
        rootCauseId: 'systemic-performance',
        description: 'Systemic performance degradation',
        affectedItems: perfIssues.map(p => p.id),
        likelihood: 70,
        evidence: perfIssues.map(p => p.description),
        suggestedFix: 'Profile system, check database queries, review caching',
        estimatedImpact: 'medium',
      });
    }

    // Pattern: Data quality issues
    const dataIssues = feedbackItems.filter(f => f.category === 'data_quality');
    if (dataIssues.length >= 2) {
      rootCauses.push({
        rootCauseId: 'data-integrity',
        description: 'Data integrity concerns',
        affectedItems: dataIssues.map(d => d.id),
        likelihood: 80,
        evidence: dataIssues.map(d => d.description),
        suggestedFix: 'Review data validation, add schema constraints',
        estimatedImpact: dataIssues.some(d => d.severity === 'critical') ? 'high' : 'medium',
      });
    }

    // Pattern: Error messages in descriptions
    const errorPatterns = ['timeout', 'null', 'undefined', 'failed', 'exception'];
    for (const pattern of errorPatterns) {
      const matching = feedbackItems.filter(f => 
        f.description.toLowerCase().includes(pattern) ||
        f.actualBehavior.toLowerCase().includes(pattern)
      );
      if (matching.length >= 3) {
        rootCauses.push({
          rootCauseId: `pattern-${pattern}`,
          description: `Multiple "${pattern}" related issues`,
          affectedItems: matching.map(m => m.id),
          likelihood: 65,
          evidence: matching.map(m => m.description),
          suggestedFix: `Investigate and fix "${pattern}" pattern across codebase`,
          estimatedImpact: 'medium',
        });
      }
    }

    return rootCauses.sort((a, b) => b.likelihood - a.likelihood);
  }

  /**
   * Find correlations between factors
   */
  private findCorrelations(feedbackItems: FeedbackItem[]): Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    description: string;
  }> {
    const correlations: Array<{
      factor1: string;
      factor2: string;
      correlation: number;
      description: string;
    }> = [];

    // Correlation: Agent and Category
    const agentCategoryPairs: Record<string, number> = {};
    for (const item of feedbackItems) {
      const key = `${item.agentSource}:${item.category}`;
      agentCategoryPairs[key] = (agentCategoryPairs[key] || 0) + 1;
    }

    for (const [pair, count] of Object.entries(agentCategoryPairs)) {
      if (count >= 2) {
        const [agent, category] = pair.split(':');
        correlations.push({
          factor1: agent,
          factor2: category,
          correlation: Math.min(0.95, count * 0.2),
          description: `${agent} frequently has ${category} issues (${count} occurrences)`,
        });
      }
    }

    // Correlation: Severity and Category
    const severityCategoryPairs: Record<string, number> = {};
    for (const item of feedbackItems) {
      const key = `${item.severity}:${item.category}`;
      severityCategoryPairs[key] = (severityCategoryPairs[key] || 0) + 1;
    }

    for (const [pair, count] of Object.entries(severityCategoryPairs)) {
      if (count >= 3) {
        const [severity, category] = pair.split(':');
        correlations.push({
          factor1: severity,
          factor2: category,
          correlation: Math.min(0.9, count * 0.15),
          description: `${category} issues tend to be ${severity} severity`,
        });
      }
    }

    return correlations.sort((a, b) => b.correlation - a.correlation).slice(0, 10);
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    agentMetrics: AgentMetrics[],
    trends: TrendAnalysis[],
    rootCauses: RootCauseAnalysis[],
    feedbackItems: FeedbackItem[]
  ): string[] {
    const insights: string[] = [];

    // Agent health insights
    const unhealthyAgents = agentMetrics.filter(a => a.healthScore < 70);
    if (unhealthyAgents.length > 0) {
      insights.push(
        `⚠️ ${unhealthyAgents.length} agent(s) below health threshold: ${unhealthyAgents.map(a => a.agentId).join(', ')}`
      );
    }

    const criticalAgent = agentMetrics.find(a => a.criticalCount > 0);
    if (criticalAgent) {
      insights.push(
        `🔴 ${criticalAgent.agentId} has ${criticalAgent.criticalCount} critical issue(s)`
      );
    }

    // Trend insights
    const decliningTrend = trends.find(t => t.direction === 'declining' && t.metric === 'Health Score');
    if (decliningTrend) {
      insights.push(
        `📉 Health score trending down: ${decliningTrend.changePercent.toFixed(1)}% decline`
      );
    }

    const improvingTrend = trends.find(t => t.direction === 'improving' && t.metric === 'Critical Issues');
    if (improvingTrend) {
      insights.push(
        `📈 Critical issues improving: ${Math.abs(improvingTrend.changePercent).toFixed(1)}% reduction`
      );
    }

    // Root cause insights
    const highImpactCause = rootCauses.find(r => r.estimatedImpact === 'high' && r.likelihood > 70);
    if (highImpactCause) {
      insights.push(
        `🎯 High-impact root cause identified: ${highImpactCause.description}`
      );
    }

    // Distribution insights
    const bySeverity = this.groupBy(feedbackItems, 'severity');
    const criticalPercent = ((bySeverity['critical']?.length || 0) / feedbackItems.length) * 100;
    if (criticalPercent > 20) {
      insights.push(
        `⚡ ${criticalPercent.toFixed(0)}% of issues are critical - consider build pause`
      );
    }

    // Performance insights
    const slowAgents = agentMetrics.filter(a => a.avgExecutionTimeMs > 3000);
    if (slowAgents.length > 0) {
      insights.push(
        `🐌 Slow agents detected: ${slowAgents.map(a => `${a.agentId} (${(a.avgExecutionTimeMs/1000).toFixed(1)}s avg)`).join(', ')}`
      );
    }

    // Positive insights
    const perfectAgents = agentMetrics.filter(a => a.healthScore === 100);
    if (perfectAgents.length > 0) {
      insights.push(
        `✅ Perfect health: ${perfectAgents.map(a => a.agentId).join(', ')}`
      );
    }

    return insights;
  }

  /**
   * Compare to previous cycle
   */
  private compareToPreviousCycle(
    currentCycle: number,
    currentFeedback: FeedbackItem[]
  ): FeedbackAnalysisReport['cycleComparison'] | undefined {
    const previousResult = this.historicalData.find(h => h.cycleNumber === currentCycle - 1);
    if (!previousResult) return undefined;

    const previousIds = new Set(previousResult.feedbackItems.map(f => f.description));
    const currentIds = new Set(currentFeedback.map(f => f.description));

    // Find recurring issues (similar descriptions)
    let recurring = 0;
    for (const desc of currentIds) {
      if (previousIds.has(desc)) recurring++;
    }

    return {
      previousCycle: previousResult.cycleNumber,
      feedbackDelta: currentFeedback.length - previousResult.feedbackItems.length,
      healthDelta: 0, // Would calculate from current health score
      newIssuesResolved: previousResult.feedbackItems.filter(f => 
        f.status === 'resolved'
      ).length,
      recurringIssues: recurring,
    };
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(metrics: AgentMetrics[], feedbackItems: FeedbackItem[]): number {
    // Base health from agent metrics
    const avgAgentHealth = metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length;
    
    // Penalties for feedback
    const criticalPenalty = feedbackItems.filter(f => f.severity === 'critical').length * 10;
    const highPenalty = feedbackItems.filter(f => f.severity === 'high').length * 5;
    
    return Math.max(0, Math.min(100, avgAgentHealth - criticalPenalty - highPenalty));
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Group items by key
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
