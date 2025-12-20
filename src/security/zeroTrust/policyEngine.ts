/**
 * ZERO TRUST POLICY ENGINE
 * 
 * Implements NIST SP 800-207 Zero Trust Architecture principles
 * for HZ Navigator FedRAMP/CMMC compliance.
 * 
 * Core Tenets:
 * 1. Never trust, always verify
 * 2. Least privilege access
 * 3. Assume breach
 * 4. Continuous verification
 * 5. Micro-segmentation
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TrustLevel = 'untrusted' | 'low' | 'medium' | 'high' | 'verified';
export type AccessDecision = 'allow' | 'deny' | 'challenge' | 'step_up';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export interface Subject {
  userId: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  clearanceLevel?: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  lastAuthentication: Date;
}

export interface Resource {
  resourceType: ResourceType;
  resourceId: string;
  classificationLevel: ClassificationLevel;
  organizationId?: string;
  requiresCUI?: boolean;
  sensitivityScore: number;
}

export type ResourceType = 
  | 'employee_data'
  | 'compliance_data'
  | 'financial_data'
  | 'contract_data'
  | 'audit_data'
  | 'system_config'
  | 'api_endpoint'
  | 'agent_task';

export type ClassificationLevel = 
  | 'public'
  | 'internal'
  | 'confidential'
  | 'cui'
  | 'cui_specified'
  | 'classified_ready';

export interface Action {
  type: ActionType;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export type ActionType = 
  | 'read'
  | 'write'
  | 'delete'
  | 'execute'
  | 'admin'
  | 'export'
  | 'share';

export interface EnvironmentContext {
  timestamp: Date;
  geoLocation?: GeoLocation;
  networkType: NetworkType;
  deviceTrustScore: number;
  behaviorScore: number;
  threatIntelligence: ThreatIntelContext;
  complianceState: ComplianceState;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  isAllowedLocation: boolean;
}

export type NetworkType = 
  | 'corporate_vpn'
  | 'corporate_network'
  | 'trusted_network'
  | 'public_network'
  | 'tor_exit'
  | 'vpn_unknown';

export interface ThreatIntelContext {
  ipReputation: number; // 0-100
  knownBadActor: boolean;
  recentThreats: string[];
  geoRisk: number; // 0-100
}

export interface ComplianceState {
  fedrampCompliant: boolean;
  cmmcLevel: number;
  auditMode: boolean;
  gracePeriodActive: boolean;
}

export interface PolicyDecision {
  decision: AccessDecision;
  trustLevel: TrustLevel;
  riskScore: number;
  reasons: string[];
  requiredActions?: RequiredAction[];
  auditRecord: AuditRecord;
  expiresAt?: Date;
  sessionConstraints?: SessionConstraints;
}

export interface RequiredAction {
  type: 'mfa_challenge' | 'manager_approval' | 'justification' | 'time_limited';
  metadata?: Record<string, unknown>;
}

export interface SessionConstraints {
  maxDuration: number; // minutes
  reauthenticateAfter: number; // minutes
  restrictedActions?: ActionType[];
  monitoringLevel: 'standard' | 'enhanced' | 'forensic';
}

export interface AuditRecord {
  id: string;
  timestamp: Date;
  subject: Omit<Subject, 'sessionId'>;
  resource: Resource;
  action: Action;
  decision: AccessDecision;
  riskScore: number;
  policyViolations: string[];
  context: Partial<EnvironmentContext>;
}

export interface DeviceTrustAssessment {
  deviceId: string;
  trustScore: number;
  lastAssessment: Date;
  factors: {
    enrolled: boolean;
    compliant: boolean;
    encrypted: boolean;
    patchLevel: 'current' | 'behind' | 'critical';
    malwareProtection: boolean;
    screenLock: boolean;
    jailbroken: boolean;
  };
  riskIndicators: string[];
}

// ============================================================================
// POLICY ENGINE IMPLEMENTATION
// ============================================================================

export class ZeroTrustPolicyEngine {
  private prisma: PrismaClient;
  private policyCache: Map<string, PolicyRule[]>;
  private trustDecayRate: number = 0.1; // Trust decays 10% per hour
  private sessionTimeout: number = 3600000; // 1 hour in ms

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.policyCache = new Map();
  }

  /**
   * Main policy decision point - evaluates access request
   */
  async evaluateAccess(
    subject: Subject,
    resource: Resource,
    action: Action,
    context: EnvironmentContext
  ): Promise<PolicyDecision> {
    console.log(`[ZERO-TRUST] Evaluating access: ${subject.userId} -> ${resource.resourceType}:${action.type}`);

    // Step 1: Calculate composite risk score
    const riskScore = this.calculateRiskScore(subject, resource, action, context);

    // Step 2: Determine trust level
    const trustLevel = this.determineTrustLevel(subject, context, riskScore);

    // Step 3: Apply policies
    const policyResult = await this.applyPolicies(subject, resource, action, context, trustLevel);

    // Step 4: Build decision
    const decision = this.buildDecision(policyResult, riskScore, trustLevel);

    // Step 5: Create audit record
    const auditRecord = this.createAuditRecord(subject, resource, action, decision, riskScore, context);

    // Step 6: Log decision
    await this.logAccessDecision(auditRecord);

    return {
      decision: decision.decision,
      trustLevel,
      riskScore,
      reasons: decision.reasons,
      requiredActions: decision.requiredActions,
      auditRecord,
      expiresAt: this.calculateExpiration(trustLevel, riskScore),
      sessionConstraints: this.determineSessionConstraints(trustLevel, riskScore, resource),
    };
  }

  /**
   * Calculate composite risk score (0-100)
   */
  private calculateRiskScore(
    subject: Subject,
    resource: Resource,
    action: Action,
    context: EnvironmentContext
  ): number {
    let score = 0;

    // Subject risk factors
    if (!subject.mfaVerified) score += 25;
    if (this.isSessionStale(subject.lastAuthentication)) score += 15;
    if (!subject.deviceId) score += 10;

    // Resource sensitivity
    score += resource.sensitivityScore * 0.2;
    if (resource.requiresCUI) score += 15;
    if (resource.classificationLevel === 'cui_specified') score += 20;

    // Action risk
    const actionRisk: Record<ActionType, number> = {
      read: 5,
      write: 15,
      delete: 25,
      execute: 20,
      admin: 30,
      export: 25,
      share: 20,
    };
    score += actionRisk[action.type] || 10;

    // Environment risk
    if (context.networkType === 'public_network') score += 15;
    if (context.networkType === 'tor_exit') score += 40;
    if (context.deviceTrustScore < 50) score += 20;
    if (context.threatIntelligence.knownBadActor) score += 50;
    if (context.threatIntelligence.ipReputation < 30) score += 15;

    // Behavioral risk
    if (context.behaviorScore < 50) score += 15;

    // Geographic risk
    if (context.geoLocation && !context.geoLocation.isAllowedLocation) score += 25;
    score += (context.threatIntelligence.geoRisk * 0.1);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Determine trust level based on multiple factors
   */
  private determineTrustLevel(
    subject: Subject,
    context: EnvironmentContext,
    riskScore: number
  ): TrustLevel {
    // Start with base trust
    let trustPoints = 0;

    // Authentication factors
    if (subject.mfaVerified) trustPoints += 30;
    if (!this.isSessionStale(subject.lastAuthentication)) trustPoints += 20;

    // Device trust
    trustPoints += context.deviceTrustScore * 0.2;

    // Network trust
    if (context.networkType === 'corporate_vpn') trustPoints += 15;
    if (context.networkType === 'corporate_network') trustPoints += 20;

    // Behavior trust
    trustPoints += context.behaviorScore * 0.15;

    // Apply risk penalty
    trustPoints -= riskScore * 0.3;

    // Map to trust level
    if (trustPoints >= 80) return 'verified';
    if (trustPoints >= 60) return 'high';
    if (trustPoints >= 40) return 'medium';
    if (trustPoints >= 20) return 'low';
    return 'untrusted';
  }

  /**
   * Apply configured policies
   */
  private async applyPolicies(
    subject: Subject,
    resource: Resource,
    action: Action,
    context: EnvironmentContext,
    trustLevel: TrustLevel
  ): Promise<PolicyEvaluationResult> {
    const violations: string[] = [];
    const requiredActions: RequiredAction[] = [];
    let shouldDeny = false;
    let shouldChallenge = false;

    // Policy 1: MFA required for sensitive resources
    if (resource.sensitivityScore > 50 && !subject.mfaVerified) {
      violations.push('MFA required for sensitive resource access');
      requiredActions.push({ type: 'mfa_challenge' });
      shouldChallenge = true;
    }

    // Policy 2: CUI access requires verified trust
    if (resource.requiresCUI && trustLevel !== 'verified') {
      if (trustLevel === 'high') {
        requiredActions.push({ type: 'mfa_challenge' });
        shouldChallenge = true;
      } else {
        violations.push('CUI access requires verified trust level');
        shouldDeny = true;
      }
    }

    // Policy 3: Admin actions require high trust
    if (action.type === 'admin' && !['verified', 'high'].includes(trustLevel)) {
      violations.push('Administrative actions require high trust level');
      shouldDeny = true;
    }

    // Policy 4: Export/share requires justification
    if (['export', 'share'].includes(action.type) && resource.sensitivityScore > 30) {
      requiredActions.push({ type: 'justification' });
    }

    // Policy 5: Delete requires manager approval for sensitive data
    if (action.type === 'delete' && resource.sensitivityScore > 70) {
      requiredActions.push({ type: 'manager_approval' });
    }

    // Policy 6: Block known bad actors
    if (context.threatIntelligence.knownBadActor) {
      violations.push('Access blocked: known threat actor');
      shouldDeny = true;
    }

    // Policy 7: Geographic restrictions
    if (context.geoLocation && !context.geoLocation.isAllowedLocation) {
      if (resource.requiresCUI) {
        violations.push('CUI access restricted to approved locations');
        shouldDeny = true;
      } else {
        requiredActions.push({ type: 'mfa_challenge' });
        shouldChallenge = true;
      }
    }

    // Policy 8: Role-based access control
    const hasRequiredRole = await this.checkRoleBasedAccess(subject, resource, action);
    if (!hasRequiredRole) {
      violations.push('Insufficient role permissions');
      shouldDeny = true;
    }

    // Policy 9: Organization boundary
    if (resource.organizationId && resource.organizationId !== subject.organizationId) {
      violations.push('Cross-organization access denied');
      shouldDeny = true;
    }

    // Policy 10: Time-based restrictions for high-risk actions
    if (this.isOutsideBusinessHours() && action.type === 'admin') {
      requiredActions.push({ type: 'mfa_challenge' });
      violations.push('Administrative access outside business hours requires step-up');
      shouldChallenge = true;
    }

    return {
      violations,
      requiredActions,
      shouldDeny,
      shouldChallenge,
    };
  }

  /**
   * Check role-based access permissions
   */
  private async checkRoleBasedAccess(
    subject: Subject,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    // Define permission matrix
    const permissionMatrix: Record<string, Record<ResourceType, ActionType[]>> = {
      admin: {
        employee_data: ['read', 'write', 'delete', 'export', 'admin'],
        compliance_data: ['read', 'write', 'delete', 'export', 'admin'],
        financial_data: ['read', 'write', 'delete', 'export', 'admin'],
        contract_data: ['read', 'write', 'delete', 'export', 'admin'],
        audit_data: ['read', 'export', 'admin'],
        system_config: ['read', 'write', 'admin'],
        api_endpoint: ['read', 'write', 'execute', 'admin'],
        agent_task: ['read', 'write', 'execute', 'admin'],
      },
      compliance_officer: {
        employee_data: ['read', 'write'],
        compliance_data: ['read', 'write', 'export'],
        financial_data: ['read'],
        contract_data: ['read', 'write'],
        audit_data: ['read', 'write', 'export'],
        system_config: ['read'],
        api_endpoint: ['read', 'execute'],
        agent_task: ['read', 'execute'],
      },
      analyst: {
        employee_data: ['read'],
        compliance_data: ['read'],
        financial_data: ['read'],
        contract_data: ['read'],
        audit_data: ['read'],
        system_config: [],
        api_endpoint: ['read', 'execute'],
        agent_task: ['read', 'execute'],
      },
      viewer: {
        employee_data: ['read'],
        compliance_data: ['read'],
        financial_data: [],
        contract_data: ['read'],
        audit_data: [],
        system_config: [],
        api_endpoint: ['read'],
        agent_task: ['read'],
      },
    };

    // Check if any of the user's roles grant access
    for (const role of subject.roles) {
      const rolePermissions = permissionMatrix[role];
      if (rolePermissions) {
        const allowedActions = rolePermissions[resource.resourceType];
        if (allowedActions && allowedActions.includes(action.type)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Build final decision from policy evaluation
   */
  private buildDecision(
    policyResult: PolicyEvaluationResult,
    riskScore: number,
    trustLevel: TrustLevel
  ): { decision: AccessDecision; reasons: string[]; requiredActions?: RequiredAction[] } {
    if (policyResult.shouldDeny) {
      return {
        decision: 'deny',
        reasons: policyResult.violations,
      };
    }

    if (policyResult.shouldChallenge || policyResult.requiredActions.length > 0) {
      // Determine if step-up or challenge
      const hasMFAChallenge = policyResult.requiredActions.some(a => a.type === 'mfa_challenge');
      
      return {
        decision: hasMFAChallenge ? 'step_up' : 'challenge',
        reasons: policyResult.violations.length > 0 ? policyResult.violations : ['Additional verification required'],
        requiredActions: policyResult.requiredActions,
      };
    }

    // Risk-based final check
    if (riskScore > 80) {
      return {
        decision: 'deny',
        reasons: ['Risk score exceeds threshold'],
      };
    }

    if (riskScore > 60) {
      return {
        decision: 'challenge',
        reasons: ['Elevated risk requires verification'],
        requiredActions: [{ type: 'mfa_challenge' }],
      };
    }

    return {
      decision: 'allow',
      reasons: ['Access granted per policy'],
    };
  }

  /**
   * Create comprehensive audit record
   */
  private createAuditRecord(
    subject: Subject,
    resource: Resource,
    action: Action,
    decision: { decision: AccessDecision; reasons: string[] },
    riskScore: number,
    context: EnvironmentContext
  ): AuditRecord {
    return {
      id: `ZT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      subject: {
        userId: subject.userId,
        organizationId: subject.organizationId,
        roles: subject.roles,
        deviceId: subject.deviceId,
        ipAddress: subject.ipAddress,
        userAgent: subject.userAgent,
        mfaVerified: subject.mfaVerified,
        lastAuthentication: subject.lastAuthentication,
      },
      resource,
      action,
      decision: decision.decision,
      riskScore,
      policyViolations: decision.reasons,
      context: {
        timestamp: context.timestamp,
        networkType: context.networkType,
        deviceTrustScore: context.deviceTrustScore,
        behaviorScore: context.behaviorScore,
        geoLocation: context.geoLocation,
      },
    };
  }

  /**
   * Log access decision for audit trail
   */
  private async logAccessDecision(auditRecord: AuditRecord): Promise<void> {
    try {
      await this.prisma.securityAuditLog.create({
        data: {
          eventId: auditRecord.id,
          eventType: 'access_decision',
          subjectId: auditRecord.subject.userId,
          organizationId: auditRecord.subject.organizationId,
          resourceType: auditRecord.resource.resourceType,
          resourceId: auditRecord.resource.resourceId,
          action: auditRecord.action.type,
          decision: auditRecord.decision,
          riskScore: auditRecord.riskScore,
          ipAddress: auditRecord.subject.ipAddress,
          userAgent: auditRecord.subject.userAgent,
          policyViolations: auditRecord.policyViolations,
          contextData: auditRecord.context as object,
          timestamp: auditRecord.timestamp,
        },
      });
    } catch (error) {
      // Log to fallback if database unavailable
      console.error('[ZERO-TRUST] Failed to log audit record:', error);
      console.log('[ZERO-TRUST] Audit fallback:', JSON.stringify(auditRecord));
    }
  }

  /**
   * Calculate decision expiration based on trust and risk
   */
  private calculateExpiration(trustLevel: TrustLevel, riskScore: number): Date {
    const baseMinutes = {
      verified: 60,
      high: 30,
      medium: 15,
      low: 5,
      untrusted: 1,
    };

    let minutes = baseMinutes[trustLevel];
    
    // Reduce time for high risk
    if (riskScore > 50) minutes = Math.max(1, minutes * 0.5);
    if (riskScore > 70) minutes = Math.max(1, minutes * 0.25);

    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Determine session constraints based on context
   */
  private determineSessionConstraints(
    trustLevel: TrustLevel,
    riskScore: number,
    resource: Resource
  ): SessionConstraints {
    const baseConstraints: SessionConstraints = {
      maxDuration: 480, // 8 hours
      reauthenticateAfter: 60, // 1 hour
      monitoringLevel: 'standard',
    };

    // Adjust based on trust level
    if (trustLevel === 'low' || trustLevel === 'untrusted') {
      baseConstraints.maxDuration = 60;
      baseConstraints.reauthenticateAfter = 15;
      baseConstraints.monitoringLevel = 'enhanced';
    }

    // Adjust based on risk
    if (riskScore > 50) {
      baseConstraints.monitoringLevel = 'enhanced';
      baseConstraints.reauthenticateAfter = Math.min(baseConstraints.reauthenticateAfter, 30);
    }

    if (riskScore > 70) {
      baseConstraints.monitoringLevel = 'forensic';
      baseConstraints.reauthenticateAfter = 10;
    }

    // CUI resources get enhanced monitoring
    if (resource.requiresCUI) {
      baseConstraints.monitoringLevel = 'enhanced';
      baseConstraints.restrictedActions = ['export', 'share', 'delete'];
    }

    return baseConstraints;
  }

  /**
   * Assess device trust
   */
  async assessDeviceTrust(deviceId: string): Promise<DeviceTrustAssessment> {
    // In production, this would query MDM/EDR systems
    // For now, return a baseline assessment
    return {
      deviceId,
      trustScore: 70,
      lastAssessment: new Date(),
      factors: {
        enrolled: true,
        compliant: true,
        encrypted: true,
        patchLevel: 'current',
        malwareProtection: true,
        screenLock: true,
        jailbroken: false,
      },
      riskIndicators: [],
    };
  }

  /**
   * Monitor session for anomalies
   */
  async monitorSession(sessionId: string): Promise<{ trustDecay: number; anomalies: string[] }> {
    // In production, this would integrate with UEBA
    return {
      trustDecay: 0,
      anomalies: [],
    };
  }

  // ============ HELPER METHODS ============

  private isSessionStale(lastAuth: Date): boolean {
    return Date.now() - lastAuth.getTime() > this.sessionTimeout;
  }

  private isOutsideBusinessHours(): boolean {
    const hour = new Date().getHours();
    return hour < 6 || hour > 22;
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  conditions: PolicyCondition[];
  effect: 'allow' | 'deny' | 'challenge';
  actions?: RequiredAction[];
}

interface PolicyCondition {
  attribute: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
}

interface PolicyEvaluationResult {
  violations: string[];
  requiredActions: RequiredAction[];
  shouldDeny: boolean;
  shouldChallenge: boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ZeroTrustPolicyEngine;
