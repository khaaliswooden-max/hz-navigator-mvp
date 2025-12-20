/**
 * ZERO TRUST MIDDLEWARE
 * 
 * Next.js API middleware implementing Zero Trust access controls
 * per NIST SP 800-207 and FedRAMP requirements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZeroTrustPolicyEngine, Subject, Resource, Action, EnvironmentContext, ResourceType, ClassificationLevel, ActionType } from './policyEngine';
import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface ZeroTrustContext {
  subject: Subject;
  resource: Resource;
  action: Action;
  environment: EnvironmentContext;
}

export interface AuthenticatedRequest extends NextRequest {
  zeroTrust?: ZeroTrustContext;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  roles?: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BLOCKED_COUNTRIES = ['KP', 'IR', 'CU', 'SY', 'RU', 'CN']; // OFAC/ITAR restricted
const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'DE', 'FR', 'JP']; // Five Eyes + NATO allies

const RESOURCE_CLASSIFICATION: Record<string, { type: ResourceType; classification: ClassificationLevel; sensitivity: number; cui: boolean }> = {
  '/api/employees': { type: 'employee_data', classification: 'confidential', sensitivity: 70, cui: false },
  '/api/compliance': { type: 'compliance_data', classification: 'cui', sensitivity: 80, cui: true },
  '/api/agents': { type: 'agent_task', classification: 'internal', sensitivity: 50, cui: false },
  '/api/hubzone': { type: 'api_endpoint', classification: 'public', sensitivity: 10, cui: false },
  '/api/health': { type: 'api_endpoint', classification: 'public', sensitivity: 0, cui: false },
};

// ============================================================================
// ZERO TRUST MIDDLEWARE
// ============================================================================

export class ZeroTrustMiddleware {
  private policyEngine: ZeroTrustPolicyEngine;

  constructor() {
    this.policyEngine = new ZeroTrustPolicyEngine(prisma);
  }

  /**
   * Main middleware handler
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    
    try {
      // Step 1: Build subject from request
      const subject = await this.buildSubject(request);
      
      // Step 2: Identify resource
      const resource = this.identifyResource(request);
      
      // Step 3: Determine action
      const action = this.determineAction(request);
      
      // Step 4: Build environment context
      const environment = await this.buildEnvironmentContext(request);
      
      // Step 5: Evaluate access
      const decision = await this.policyEngine.evaluateAccess(
        subject,
        resource,
        action,
        environment
      );

      // Log access attempt
      console.log(`[ZT-MW] ${subject.userId} -> ${resource.resourceType}:${action.type} = ${decision.decision} (${Date.now() - startTime}ms)`);

      // Handle decision
      switch (decision.decision) {
        case 'deny':
          return this.createDenyResponse(decision.reasons, decision.auditRecord.id);
        
        case 'challenge':
        case 'step_up':
          return this.createChallengeResponse(decision.requiredActions || [], decision.auditRecord.id);
        
        case 'allow':
          // Add security headers and continue
          return null; // Continue to route handler
        
        default:
          return this.createDenyResponse(['Unknown decision type'], decision.auditRecord.id);
      }
    } catch (error) {
      console.error('[ZT-MW] Error:', error);
      return this.createErrorResponse('Security evaluation failed');
    }
  }

  /**
   * Build subject from request context
   */
  private async buildSubject(request: NextRequest): Promise<Subject> {
    // Extract auth token (in production, validate JWT)
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session');
    
    // Extract user info (placeholder - integrate with actual auth)
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const organizationId = request.headers.get('x-org-id') || 'unknown';
    const sessionId = sessionCookie?.value || `anon-${Date.now()}`;
    const roles = this.parseRoles(request.headers.get('x-user-roles'));

    // Check MFA status
    const mfaVerified = request.headers.get('x-mfa-verified') === 'true';
    
    // Extract device info
    const deviceId = request.headers.get('x-device-id');
    
    // Get IP and user agent
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      userId,
      organizationId,
      sessionId,
      roles,
      deviceId: deviceId || undefined,
      ipAddress,
      userAgent,
      mfaVerified,
      lastAuthentication: new Date(), // In production, from session store
    };
  }

  /**
   * Identify resource from request path
   */
  private identifyResource(request: NextRequest): Resource {
    const path = new URL(request.url).pathname;
    
    // Find matching resource pattern
    let matchedResource = RESOURCE_CLASSIFICATION['/api/health']; // Default to public
    let matchedPattern = '';
    
    for (const [pattern, config] of Object.entries(RESOURCE_CLASSIFICATION)) {
      if (path.startsWith(pattern) && pattern.length > matchedPattern.length) {
        matchedResource = config;
        matchedPattern = pattern;
      }
    }

    // Extract resource ID if present
    const pathParts = path.split('/');
    const resourceId = pathParts.length > 3 ? pathParts[3] : 'collection';

    // Get org from query params if present
    const orgId = new URL(request.url).searchParams.get('orgId');

    return {
      resourceType: matchedResource.type,
      resourceId,
      classificationLevel: matchedResource.classification,
      organizationId: orgId || undefined,
      requiresCUI: matchedResource.cui,
      sensitivityScore: matchedResource.sensitivity,
    };
  }

  /**
   * Determine action from HTTP method
   */
  private determineAction(request: NextRequest): Action {
    const methodToAction: Record<string, ActionType> = {
      GET: 'read',
      POST: 'write',
      PUT: 'write',
      PATCH: 'write',
      DELETE: 'delete',
      OPTIONS: 'read',
    };

    const actionType = methodToAction[request.method] || 'read';

    // Check for special action indicators
    const exportFlag = new URL(request.url).searchParams.get('export');
    const shareFlag = new URL(request.url).searchParams.get('share');

    if (exportFlag === 'true') {
      return { type: 'export', scope: 'data' };
    }
    if (shareFlag === 'true') {
      return { type: 'share', scope: 'external' };
    }

    return { type: actionType };
  }

  /**
   * Build environment context
   */
  private async buildEnvironmentContext(request: NextRequest): Promise<EnvironmentContext> {
    const ipAddress = this.getClientIP(request);
    const geoLocation = await this.getGeoLocation(ipAddress);
    const deviceTrustScore = await this.getDeviceTrustScore(request);
    const behaviorScore = await this.getBehaviorScore(request);
    const threatIntel = await this.getThreatIntelligence(ipAddress);

    return {
      timestamp: new Date(),
      geoLocation,
      networkType: this.determineNetworkType(request),
      deviceTrustScore,
      behaviorScore,
      threatIntelligence: threatIntel,
      complianceState: {
        fedrampCompliant: true,
        cmmcLevel: 2,
        auditMode: false,
        gracePeriodActive: false,
      },
    };
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Check common proxy headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    return '0.0.0.0';
  }

  /**
   * Get geolocation for IP (mock - use real geo service in production)
   */
  private async getGeoLocation(ipAddress: string): Promise<{ country: string; region: string; city: string; isAllowedLocation: boolean }> {
    // In production, use MaxMind GeoIP or similar
    // For now, assume US-based
    const country = 'US';
    
    return {
      country,
      region: 'Unknown',
      city: 'Unknown',
      isAllowedLocation: ALLOWED_COUNTRIES.includes(country) && !BLOCKED_COUNTRIES.includes(country),
    };
  }

  /**
   * Get device trust score
   */
  private async getDeviceTrustScore(request: NextRequest): Promise<number> {
    const deviceId = request.headers.get('x-device-id');
    
    if (!deviceId) {
      return 30; // Unknown device gets low trust
    }

    // In production, query MDM/EDR for device health
    return 70; // Default for known device
  }

  /**
   * Get behavior score (UEBA)
   */
  private async getBehaviorScore(request: NextRequest): Promise<number> {
    // In production, integrate with UEBA system
    // Check for anomalies in user behavior
    return 80; // Default normal behavior
  }

  /**
   * Get threat intelligence for IP
   */
  private async getThreatIntelligence(ipAddress: string): Promise<{ ipReputation: number; knownBadActor: boolean; recentThreats: string[]; geoRisk: number }> {
    // In production, query threat intel feeds
    return {
      ipReputation: 80,
      knownBadActor: false,
      recentThreats: [],
      geoRisk: 10,
    };
  }

  /**
   * Determine network type from request context
   */
  private determineNetworkType(request: NextRequest): 'corporate_vpn' | 'corporate_network' | 'trusted_network' | 'public_network' | 'tor_exit' | 'vpn_unknown' {
    const vpnHeader = request.headers.get('x-vpn-verified');
    const corporateHeader = request.headers.get('x-corporate-network');
    
    if (vpnHeader === 'true') {
      return 'corporate_vpn';
    }
    if (corporateHeader === 'true') {
      return 'corporate_network';
    }
    
    // Check for Tor exit nodes (would query Tor exit list)
    
    return 'public_network';
  }

  /**
   * Parse roles from header
   */
  private parseRoles(rolesHeader: string | null): string[] {
    if (!rolesHeader) {
      return ['viewer']; // Default role
    }
    return rolesHeader.split(',').map(r => r.trim());
  }

  /**
   * Create deny response
   */
  private createDenyResponse(reasons: string[], auditId: string): NextResponse {
    return NextResponse.json(
      {
        error: 'Access Denied',
        code: 'ZERO_TRUST_DENIED',
        reasons,
        auditId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 403,
        headers: this.getSecurityHeaders(),
      }
    );
  }

  /**
   * Create challenge response
   */
  private createChallengeResponse(requiredActions: Array<{ type: string; metadata?: Record<string, unknown> }>, auditId: string): NextResponse {
    return NextResponse.json(
      {
        error: 'Additional Verification Required',
        code: 'ZERO_TRUST_CHALLENGE',
        requiredActions,
        auditId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 401,
        headers: this.getSecurityHeaders(),
      }
    );
  }

  /**
   * Create error response
   */
  private createErrorResponse(message: string): NextResponse {
    return NextResponse.json(
      {
        error: 'Security Error',
        code: 'ZERO_TRUST_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: this.getSecurityHeaders(),
      }
    );
  }

  /**
   * Get security headers
   */
  private getSecurityHeaders(): HeadersInit {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    };
  }
}

// ============================================================================
// MIDDLEWARE WRAPPER FOR NEXT.JS
// ============================================================================

const zeroTrustMiddleware = new ZeroTrustMiddleware();

/**
 * Apply Zero Trust middleware to API routes
 */
export async function withZeroTrust(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Apply Zero Trust evaluation
  const blockResponse = await zeroTrustMiddleware.handle(request);
  
  if (blockResponse) {
    return blockResponse;
  }

  // Continue to handler
  const response = await handler(request);

  // Add security headers to response
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Higher-order function for protected API routes
 */
export function protectedRoute(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withZeroTrust(request, handler);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ZeroTrustMiddleware;
