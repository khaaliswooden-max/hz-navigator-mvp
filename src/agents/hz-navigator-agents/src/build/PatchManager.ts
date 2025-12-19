/**
 * PatchManager - Tracks and manages patches from feedback
 * 
 * Implements the PATCH phase of the feedback cycle:
 * - Tracks patches from feedback to resolution
 * - Manages patch status workflow
 * - Verifies patch application
 * - Links patches to commits/builds
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PatchItem, BuildPhase } from './BuildCycle';
import { TriageReport } from './TriageSystem';

// ============================================================
// TYPES
// ============================================================

export type PatchStatus = 
  | 'pending'        // Awaiting developer pickup
  | 'in_progress'    // Developer working on it
  | 'review'         // PR submitted, awaiting review
  | 'testing'        // In testing
  | 'completed'      // Merged and deployed
  | 'blocked'        // Cannot proceed
  | 'wont_fix'       // Decided not to fix
  | 'deferred';      // Moved to future cycle

export interface ManagedPatch extends Omit<PatchItem, 'status'> {
  // Tracking (extended status type)
  status: PatchStatus;
  statusHistory: Array<{
    status: PatchStatus;
    timestamp: Date;
    changedBy?: string;
    note?: string;
  }>;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Resolution
  resolution?: {
    approach: string;
    filesChanged: string[];
    linesAdded: number;
    linesRemoved: number;
  };
  
  // Git tracking
  branchName?: string;
  pullRequestUrl?: string;
  commitHash?: string;
  mergedAt?: Date;
  
  // Verification
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  // Metrics
  timeToResolution?: number;  // Hours from creation to completion
  reopenCount: number;
}

export interface PatchQueueSummary {
  totalPatches: number;
  byStatus: Record<PatchStatus, number>;
  byPriority: Record<string, number>;
  byComponent: Record<string, number>;
  averageAge: number;
  oldestPatch?: ManagedPatch;
  estimatedTotalHours: number;
}

export interface PatchVelocity {
  period: 'day' | 'week' | 'sprint';
  created: number;
  completed: number;
  netChange: number;
  averageResolutionTime: number;
  trend: 'accelerating' | 'stable' | 'slowing';
}

// ============================================================
// PATCH MANAGER
// ============================================================

export class PatchManager {
  private prisma: PrismaClient;
  private patches: Map<string, ManagedPatch> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Load patches from database
   */
  async loadPatches(): Promise<void> {
    try {
      // Would load from a dedicated patches table
      console.log('[PatchManager] Loading patches...');
      
      // For now, check learning events for patch records
      const events = await this.prisma.learningEvent.findMany({
        where: { eventType: { startsWith: 'patch_' } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      
      console.log(`[PatchManager] Loaded ${events.length} patch events`);
    } catch (error) {
      console.error('[PatchManager] Failed to load patches:', error);
    }
  }

  /**
   * Import patches from triage report
   */
  importFromTriage(triageReport: TriageReport): ManagedPatch[] {
    const imported: ManagedPatch[] = [];

    // Import blockers as highest priority patches
    for (const blocker of triageReport.blockerQueue) {
      const patch = this.createPatch({
        id: `patch-${blocker.feedbackId}`,
        feedbackId: blocker.feedbackId,
        cycleNumber: triageReport.cycleNumber,
        phase: triageReport.phase,
        priority: blocker.priority,
        component: blocker.suggestedOwner || 'platform',
        description: blocker.rationale,
        estimatedEffort: this.estimateEffortFromHours(blocker.estimatedResolutionHours),
        status: 'pending',
        suggestedFix: `CRITICAL: ${blocker.rationale}`,
        assignedTo: blocker.suggestedOwner,
      });
      imported.push(patch);
    }

    // Import parallel patches
    for (const patchDecision of triageReport.patchQueue) {
      const patch = this.createPatch({
        id: `patch-${patchDecision.feedbackId}`,
        feedbackId: patchDecision.feedbackId,
        cycleNumber: triageReport.cycleNumber,
        phase: triageReport.phase,
        priority: patchDecision.priority,
        component: patchDecision.suggestedOwner || 'platform',
        description: patchDecision.rationale,
        estimatedEffort: this.estimateEffortFromHours(patchDecision.estimatedResolutionHours),
        status: 'pending',
        suggestedFix: patchDecision.rationale,
        assignedTo: patchDecision.suggestedOwner,
      });
      imported.push(patch);
    }

    return imported;
  }

  /**
   * Create a new managed patch
   */
  createPatch(item: PatchItem): ManagedPatch {
    const managedPatch: ManagedPatch = {
      ...item,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Created from triage',
      }],
      verified: false,
      reopenCount: 0,
    };

    this.patches.set(managedPatch.id, managedPatch);
    return managedPatch;
  }

  /**
   * Update patch status
   */
  async updateStatus(
    patchId: string,
    newStatus: PatchStatus,
    changedBy?: string,
    note?: string
  ): Promise<ManagedPatch | undefined> {
    const patch = this.patches.get(patchId);
    if (!patch) return undefined;

    // Track status change
    patch.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      changedBy,
      note,
    });

    const oldStatus = patch.status;
    patch.status = newStatus;

    // Track reopen
    if (oldStatus === 'completed' && newStatus !== 'completed') {
      patch.reopenCount++;
      patch.verified = false;
    }

    // Calculate resolution time when completed
    if (newStatus === 'completed') {
      const createdAt = patch.statusHistory[0].timestamp;
      patch.timeToResolution = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    }

    // Log the status change
    await this.logPatchEvent(patch, 'status_change', { oldStatus, newStatus, changedBy, note });

    return patch;
  }

  /**
   * Assign patch to developer
   */
  async assign(
    patchId: string,
    assignee: string,
    changedBy?: string
  ): Promise<ManagedPatch | undefined> {
    const patch = this.patches.get(patchId);
    if (!patch) return undefined;

    patch.assignedTo = assignee;
    patch.assignedAt = new Date();

    if (patch.status === 'pending') {
      await this.updateStatus(patchId, 'in_progress', changedBy, `Assigned to ${assignee}`);
    }

    await this.logPatchEvent(patch, 'assigned', { assignee });

    return patch;
  }

  /**
   * Link patch to pull request
   */
  async linkPullRequest(
    patchId: string,
    prUrl: string,
    branchName: string
  ): Promise<ManagedPatch | undefined> {
    const patch = this.patches.get(patchId);
    if (!patch) return undefined;

    patch.pullRequestUrl = prUrl;
    patch.branchName = branchName;
    
    await this.updateStatus(patchId, 'review', undefined, `PR: ${prUrl}`);
    await this.logPatchEvent(patch, 'pr_linked', { prUrl, branchName });

    return patch;
  }

  /**
   * Mark patch as merged
   */
  async markMerged(
    patchId: string,
    commitHash: string,
    buildVersion?: string
  ): Promise<ManagedPatch | undefined> {
    const patch = this.patches.get(patchId);
    if (!patch) return undefined;

    patch.commitHash = commitHash;
    patch.buildVersion = buildVersion;
    patch.mergedAt = new Date();

    await this.updateStatus(patchId, 'testing', undefined, `Merged: ${commitHash}`);
    await this.logPatchEvent(patch, 'merged', { commitHash, buildVersion });

    return patch;
  }

  /**
   * Verify patch resolution
   */
  async verify(
    patchId: string,
    verifiedBy: string,
    passed: boolean,
    notes?: string
  ): Promise<ManagedPatch | undefined> {
    const patch = this.patches.get(patchId);
    if (!patch) return undefined;

    if (passed) {
      patch.verified = true;
      patch.verifiedBy = verifiedBy;
      patch.verifiedAt = new Date();
      await this.updateStatus(patchId, 'completed', verifiedBy, notes || 'Verified');
    } else {
      await this.updateStatus(patchId, 'in_progress', verifiedBy, `Verification failed: ${notes}`);
    }

    await this.logPatchEvent(patch, 'verified', { passed, verifiedBy, notes });

    return patch;
  }

  /**
   * Get patch by ID
   */
  getPatch(patchId: string): ManagedPatch | undefined {
    return this.patches.get(patchId);
  }

  /**
   * Get all patches with optional filtering
   */
  getPatches(filter?: {
    status?: PatchStatus;
    component?: string;
    assignedTo?: string;
    cycleNumber?: number;
    phase?: BuildPhase;
  }): ManagedPatch[] {
    let patches = Array.from(this.patches.values());

    if (filter) {
      if (filter.status) {
        patches = patches.filter(p => p.status === filter.status);
      }
      if (filter.component) {
        patches = patches.filter(p => p.component === filter.component);
      }
      if (filter.assignedTo) {
        patches = patches.filter(p => p.assignedTo === filter.assignedTo);
      }
      if (filter.cycleNumber !== undefined) {
        patches = patches.filter(p => p.cycleNumber === filter.cycleNumber);
      }
      if (filter.phase) {
        patches = patches.filter(p => p.phase === filter.phase);
      }
    }

    return patches.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get patch queue summary
   */
  getQueueSummary(): PatchQueueSummary {
    const patches = Array.from(this.patches.values());
    
    const byStatus: Record<PatchStatus, number> = {
      pending: 0, in_progress: 0, review: 0, testing: 0,
      completed: 0, blocked: 0, wont_fix: 0, deferred: 0,
    };
    const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byComponent: Record<string, number> = {};

    let totalAge = 0;
    let oldestPatch: ManagedPatch | undefined;
    let oldestAge = 0;
    const effortMap = { trivial: 0.5, small: 2, medium: 4, large: 8, xlarge: 16 };
    let estimatedTotalHours = 0;

    for (const patch of patches) {
      byStatus[patch.status]++;
      
      if (patch.priority < 100) byPriority.critical++;
      else if (patch.priority < 200) byPriority.high++;
      else if (patch.priority < 300) byPriority.medium++;
      else byPriority.low++;

      byComponent[patch.component] = (byComponent[patch.component] || 0) + 1;

      const age = (Date.now() - patch.statusHistory[0].timestamp.getTime()) / (1000 * 60 * 60);
      totalAge += age;
      
      if (age > oldestAge) {
        oldestAge = age;
        oldestPatch = patch;
      }

      if (patch.status !== 'completed' && patch.status !== 'wont_fix') {
        estimatedTotalHours += effortMap[patch.estimatedEffort];
      }
    }

    return {
      totalPatches: patches.length,
      byStatus,
      byPriority,
      byComponent,
      averageAge: patches.length > 0 ? totalAge / patches.length : 0,
      oldestPatch,
      estimatedTotalHours,
    };
  }

  /**
   * Calculate patch velocity
   */
  getVelocity(period: 'day' | 'week' | 'sprint'): PatchVelocity {
    const patches = Array.from(this.patches.values());
    
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      sprint: 14 * 24 * 60 * 60 * 1000,
    }[period];

    const cutoff = Date.now() - periodMs;

    const created = patches.filter(p => 
      p.statusHistory[0].timestamp.getTime() > cutoff
    ).length;

    const completed = patches.filter(p => {
      const completedEntry = p.statusHistory.find(h => h.status === 'completed');
      return completedEntry && completedEntry.timestamp.getTime() > cutoff;
    }).length;

    const completedWithTime = patches.filter(p => 
      p.status === 'completed' && p.timeToResolution !== undefined
    );
    const avgResolutionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, p) => sum + (p.timeToResolution || 0), 0) / completedWithTime.length
      : 0;

    // Determine trend (simplified)
    let trend: PatchVelocity['trend'];
    const netChange = completed - created;
    if (netChange > 2) trend = 'accelerating';
    else if (netChange < -2) trend = 'slowing';
    else trend = 'stable';

    return {
      period,
      created,
      completed,
      netChange,
      averageResolutionTime: avgResolutionTime,
      trend,
    };
  }

  /**
   * Get patches blocking the build
   */
  getBuildBlockers(): ManagedPatch[] {
    return this.getPatches()
      .filter(p => p.priority < 100 && p.status !== 'completed' && p.status !== 'wont_fix');
  }

  /**
   * Log patch event for tracking/learning
   */
  private async logPatchEvent(
    patch: ManagedPatch,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.prisma.learningEvent.create({
        data: {
          eventType: `patch_${eventType}`,
          inputData: {
            patchId: patch.id,
            feedbackId: patch.feedbackId,
            component: patch.component,
          } as Prisma.InputJsonValue,
          outputData: data as Prisma.InputJsonValue,
          outcome: patch.status,
          metadata: {
            cycleNumber: patch.cycleNumber,
            phase: patch.phase,
            priority: patch.priority,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error('[PatchManager] Failed to log event:', error);
    }
  }

  /**
   * Convert hours to effort estimate
   */
  private estimateEffortFromHours(hours: number): PatchItem['estimatedEffort'] {
    if (hours <= 0.5) return 'trivial';
    if (hours <= 2) return 'small';
    if (hours <= 4) return 'medium';
    if (hours <= 8) return 'large';
    return 'xlarge';
  }

  /**
   * Format patch queue for console display
   */
  formatQueueForConsole(): string {
    const summary = this.getQueueSummary();
    const blockers = this.getBuildBlockers();
    const lines: string[] = [];

    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('  PATCH QUEUE STATUS');
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push(`Total Patches: ${summary.totalPatches}`);
    lines.push(`Estimated Remaining Work: ${summary.estimatedTotalHours.toFixed(1)}h`);
    lines.push('');

    lines.push('By Status:');
    for (const [status, count] of Object.entries(summary.byStatus)) {
      if (count > 0) {
        const icon = status === 'completed' ? '✅' : status === 'blocked' ? '🛑' : '•';
        lines.push(`  ${icon} ${status}: ${count}`);
      }
    }
    lines.push('');

    if (blockers.length > 0) {
      lines.push('🛑 BUILD BLOCKERS:');
      for (const blocker of blockers) {
        lines.push(`  • ${blocker.component}: ${blocker.description}`);
        lines.push(`    Status: ${blocker.status} | Owner: ${blocker.assignedTo || 'unassigned'}`);
      }
      lines.push('');
    }

    lines.push('═'.repeat(60));
    lines.push('');

    return lines.join('\n');
  }
}
