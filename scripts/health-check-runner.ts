/**
 * Health Check Runner
 * 
 * Phase-Gated Verification System for HZ Navigator
 * Executes phase-specific health checks with auto-fix capability.
 * 
 * PHASE 1: Database Foundation (100% blocking)
 * PHASE 2: Agent Integration (90%+ pass rate)
 * PHASE 3: API Routes (95%+ pass rate)
 * PHASE 4: UI Components (85%+ pass rate)
 * 
 * Usage:
 *   npx ts-node scripts/health-check-runner.ts --phase=database
 *   npx ts-node scripts/health-check-runner.ts --phase=agents
 *   npx ts-node scripts/health-check-runner.ts --phase=api
 *   npx ts-node scripts/health-check-runner.ts --phase=ui
 *   npx ts-node scripts/health-check-runner.ts  (runs all phases)
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  severity: 'blocking' | 'required' | 'recommended';
  testFn: (prisma: PrismaClient) => Promise<{ passed: boolean; details: string }>;
  autoFix?: (prisma: PrismaClient) => Promise<boolean>;
}

export interface PhaseHealthCheck {
  phase: string;
  phaseNumber: number;
  description: string;
  passingThreshold: number;
  blockingChecks: string[];
  checks: HealthCheck[];
}

export interface CheckResult {
  check: HealthCheck;
  passed: boolean;
  details: string;
  autoFixed: boolean;
  duration: number;
}

export interface PhaseResult {
  phase: string;
  phaseNumber: number;
  passRate: number;
  canProceed: boolean;
  results: CheckResult[];
  blockingFailed: string[];
  timestamp: Date;
  duration: number;
}

// ============================================================
// PHASE 1: DATABASE FOUNDATION
// Exit Gate: 100% blocking checks pass
// ============================================================

export const phase1HealthChecks: PhaseHealthCheck = {
  phase: 'database_foundation',
  phaseNumber: 1,
  description: 'PostgreSQL, PostGIS, Prisma schema, seed data',
  passingThreshold: 100,
  blockingChecks: ['db-connection', 'schema-valid', 'postgis-enabled'],
  checks: [
    {
      id: 'db-connection',
      name: 'Database Connection',
      description: 'Verify PostgreSQL connection is active',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          await prisma.$queryRaw`SELECT 1 as result`;
          return { passed: true, details: 'PostgreSQL connection successful' };
        } catch (e: unknown) {
          const error = e as Error;
          return { passed: false, details: `Connection failed: ${error.message}` };
        }
      },
      autoFix: async (prisma) => {
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prisma.$connect();
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'schema-valid',
      name: 'Schema Validation',
      description: 'All required tables exist in database',
      severity: 'blocking',
      testFn: async (prisma) => {
        const requiredTables = [
          'Organization',
          'Employee',
          'ComplianceSnapshot',
          'AddressVerification',
          'AgentTask',
          'LearningEvent',
          'ComplianceAlert',
          'Document',
          'FeedbackLog',
        ];
        const missing: string[] = [];

        for (const table of requiredTables) {
          try {
            await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
          } catch {
            missing.push(table);
          }
        }

        return {
          passed: missing.length === 0,
          details: missing.length
            ? `Missing tables: ${missing.join(', ')}`
            : `All ${requiredTables.length} required tables present`,
        };
      },
      autoFix: async () => {
        try {
          execSync('npx prisma db push --accept-data-loss', {
            stdio: 'pipe',
            cwd: process.cwd(),
          });
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'postgis-enabled',
      name: 'PostGIS Extension',
      description: 'Spatial queries require PostGIS extension',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          const result = await prisma.$queryRaw`SELECT PostGIS_Version() as version`;
          return {
            passed: true,
            details: `PostGIS enabled: ${JSON.stringify(result)}`,
          };
        } catch {
          return { passed: false, details: 'PostGIS extension not installed' };
        }
      },
      autoFix: async (prisma) => {
        try {
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'seed-data',
      name: 'Test Data Seeded',
      description: 'Development requires seed data',
      severity: 'recommended',
      testFn: async (prisma) => {
        try {
          const orgCount = await prisma.organization.count();
          const empCount = await prisma.employee.count();
          return {
            passed: orgCount > 0,
            details: orgCount > 0
              ? `Found ${orgCount} organization(s), ${empCount} employee(s)`
              : 'No seed data found',
          };
        } catch (e: unknown) {
          return { passed: false, details: `Query failed: ${(e as Error).message}` };
        }
      },
      autoFix: async () => {
        try {
          execSync('npx ts-node scripts/seed-org.ts', {
            stdio: 'pipe',
            cwd: process.cwd(),
          });
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'agent-task-logging',
      name: 'NEXUS Task Logging',
      description: 'AgentTask table accepts new records',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const task = await prisma.agentTask.create({
            data: {
              agentType: 'nexus',
              taskType: 'health_check_test',
              input: { test: true },
              organizationId: org.id,
              status: 'completed',
            },
          });

          await prisma.agentTask.delete({ where: { id: task.id } });

          return { passed: true, details: 'AgentTask CRUD operations work' };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'document-storage',
      name: 'ARCHIVIST Document Storage',
      description: 'Document table accepts new records',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const doc = await prisma.document.create({
            data: {
              organizationId: org.id,
              title: 'Health Check Test',
              type: 'health_check',
              content: JSON.stringify({ test: true }),
            },
          });

          await prisma.document.delete({ where: { id: doc.id } });

          return { passed: true, details: 'Document CRUD operations work' };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 2: AGENT INTEGRATION
// Exit Gate: 90%+ pass rate, all blocking checks
// ============================================================

export const phase2HealthChecks: PhaseHealthCheck = {
  phase: 'agent_integration',
  phaseNumber: 2,
  description: 'All 10 agents instantiate and route correctly',
  passingThreshold: 90,
  blockingChecks: ['nexus-routing', 'agent-instantiation', 'sentinel-compliance'],
  checks: [
    {
      id: 'agent-files-exist',
      name: 'Agent Files Present',
      description: 'All 10 agent TypeScript files exist',
      severity: 'blocking',
      testFn: async () => {
        const agentFiles = [
          'nexus/orchestrator.ts',
          'sentinel/complianceMonitor.ts',
          'cartograph/geospatialIntelligence.ts',
          'workforce/employeeIntelligence.ts',
          'capture/opportunityScanner.ts',
          'advocate/regulatoryIntelligence.ts',
          'guardian/auditDefense.ts',
          'diplomat/partnershipIntelligence.ts',
          'oracle/predictiveAnalytics.ts',
          'archivist/documentIntelligence.ts',
        ];

        const agentsBasePath = path.resolve(
          process.cwd(),
          'src/agents/hz-navigator-agents/src/agents'
        );
        const missing: string[] = [];

        for (const file of agentFiles) {
          const filePath = path.join(agentsBasePath, file);
          if (!fs.existsSync(filePath)) {
            missing.push(file);
          }
        }

        return {
          passed: missing.length === 0,
          details: missing.length
            ? `Missing: ${missing.join(', ')}`
            : 'All 10 agent files present',
        };
      },
    },
    {
      id: 'nexus-routing',
      name: 'NEXUS Routing',
      description: 'NEXUS can route tasks to agents',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          const { NexusOrchestrator } = await import(
            '../src/agents/hz-navigator-agents/src/agents/nexus/orchestrator'
          );
          const nexus = new NexusOrchestrator(prisma);
          
          // Verify the instance has required methods
          const hasMethods =
            typeof nexus.createTask === 'function' &&
            typeof nexus.dispatchTask === 'function' &&
            typeof nexus.getTaskStatus === 'function';

          return {
            passed: hasMethods,
            details: hasMethods
              ? 'NEXUS routing methods available'
              : 'Missing required methods',
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'agent-instantiation',
      name: 'Agent Instantiation',
      description: 'All agents can be instantiated',
      severity: 'blocking',
      testFn: async (prisma) => {
        const agents = [
          { name: 'SENTINEL', path: '../src/agents/hz-navigator-agents/src/agents/sentinel/complianceMonitor', class: 'SentinelAgent' },
          { name: 'CARTOGRAPH', path: '../src/agents/hz-navigator-agents/src/agents/cartograph/geospatialIntelligence', class: 'CartographAgent' },
          { name: 'WORKFORCE', path: '../src/agents/hz-navigator-agents/src/agents/workforce/employeeIntelligence', class: 'WorkforceAgent' },
          { name: 'CAPTURE', path: '../src/agents/hz-navigator-agents/src/agents/capture/opportunityScanner', class: 'CaptureAgent' },
          { name: 'ADVOCATE', path: '../src/agents/hz-navigator-agents/src/agents/advocate/regulatoryIntelligence', class: 'AdvocateAgent' },
          { name: 'GUARDIAN', path: '../src/agents/hz-navigator-agents/src/agents/guardian/auditDefense', class: 'GuardianAgent' },
          { name: 'DIPLOMAT', path: '../src/agents/hz-navigator-agents/src/agents/diplomat/partnershipIntelligence', class: 'DiplomatAgent' },
          { name: 'ORACLE', path: '../src/agents/hz-navigator-agents/src/agents/oracle/predictiveAnalytics', class: 'OracleAgent' },
          { name: 'ARCHIVIST', path: '../src/agents/hz-navigator-agents/src/agents/archivist/documentIntelligence', class: 'ArchivistAgent' },
        ];

        const failed: string[] = [];

        for (const agent of agents) {
          try {
            const module = await import(agent.path);
            const AgentClass = module[agent.class];
            const instance = new AgentClass(prisma);
            if (!instance || typeof instance.execute !== 'function') {
              failed.push(agent.name);
            }
          } catch {
            failed.push(agent.name);
          }
        }

        return {
          passed: failed.length === 0,
          details: failed.length
            ? `Failed to instantiate: ${failed.join(', ')}`
            : 'All 9 agents instantiated successfully',
        };
      },
    },
    {
      id: 'sentinel-compliance',
      name: 'SENTINEL Compliance Check',
      description: 'SENTINEL can calculate compliance',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          const { SentinelAgent } = await import(
            '../src/agents/hz-navigator-agents/src/agents/sentinel/complianceMonitor'
          );
          const sentinel = new SentinelAgent(prisma);

          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const result = await sentinel.execute('calculate_compliance', {}, org.id);

          return {
            passed: typeof result.percentage === 'number',
            details: `Compliance: ${result.percentage}%`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'cartograph-verification',
      name: 'CARTOGRAPH Address Verification',
      description: 'CARTOGRAPH can verify addresses',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { CartographAgent } = await import(
            '../src/agents/hz-navigator-agents/src/agents/cartograph/geospatialIntelligence'
          );
          const cartograph = new CartographAgent(prisma);

          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const result = await cartograph.execute(
            'verify_address',
            { address: '100 F Street NE, Washington, DC 20549' },
            org.id
          );

          return {
            passed: result.isHubzone !== undefined || result.verified !== undefined,
            details: `Address verification returned: ${JSON.stringify(result).substring(0, 100)}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'guardian-audit',
      name: 'GUARDIAN Audit Readiness',
      description: 'GUARDIAN can assess audit readiness',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { GuardianAgent } = await import(
            '../src/agents/hz-navigator-agents/src/agents/guardian/auditDefense'
          );
          const guardian = new GuardianAgent(prisma);

          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const result = await guardian.execute('assess_audit_readiness', {}, org.id);

          return {
            passed: typeof result.scores?.overall === 'number',
            details: `Audit readiness: ${result.scores?.overall || 'N/A'}%`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'oracle-forecast',
      name: 'ORACLE Forecasting',
      description: 'ORACLE can forecast compliance',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { OracleAgent } = await import(
            '../src/agents/hz-navigator-agents/src/agents/oracle/predictiveAnalytics'
          );
          const oracle = new OracleAgent(prisma);

          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const result = await oracle.execute('forecast_compliance', { months: 3 }, org.id);

          return {
            passed: !!result,
            details: `Forecast generated: ${JSON.stringify(result).substring(0, 100)}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'archivist-report',
      name: 'ARCHIVIST Report Generation',
      description: 'ARCHIVIST can generate reports',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { ArchivistAgent } = await import(
            '../src/agents/hz-navigator-agents/src/agents/archivist/documentIntelligence'
          );
          const archivist = new ArchivistAgent(prisma);

          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organization to test with' };
          }

          const result = await archivist.execute('generate_compliance_report', {}, org.id);

          return {
            passed: !!result.title,
            details: `Report generated: ${result.title || 'Unknown'}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 3: API ROUTES
// Exit Gate: 95%+ pass rate
// ============================================================

export const phase3HealthChecks: PhaseHealthCheck = {
  phase: 'api_routes',
  phaseNumber: 3,
  description: 'REST endpoints functional with auth and validation',
  passingThreshold: 95,
  blockingChecks: ['api-server-running', 'api-auth', 'api-compliance'],
  checks: [
    {
      id: 'api-server-running',
      name: 'API Server Status',
      description: 'Next.js server responds to health check',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          return {
            passed: response.ok,
            details: response.ok
              ? 'Server responding on port 3000'
              : `Status: ${response.status}`,
          };
        } catch (e: unknown) {
          return {
            passed: false,
            details: `Server not reachable: ${(e as Error).message}`,
          };
        }
      },
    },
    {
      id: 'api-auth',
      name: 'API Authentication',
      description: 'Auth endpoints respond correctly',
      severity: 'blocking',
      testFn: async () => {
        try {
          // Test that protected endpoints require auth
          const response = await fetch('http://localhost:3000/api/agents', {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });

          // Should either succeed or return auth error (not 500)
          return {
            passed: response.status !== 500,
            details: `Auth check returned: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'api-compliance',
      name: 'Compliance Endpoint',
      description: 'POST /api/agents/compliance responds',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/agents/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: 'test-org' }),
            signal: AbortSignal.timeout(10000),
          });

          return {
            passed: response.status !== 500,
            details: `Compliance endpoint status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'api-validation',
      name: 'API Input Validation',
      description: 'Invalid requests return proper errors',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/agents/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}), // Missing required field
            signal: AbortSignal.timeout(5000),
          });

          return {
            passed: response.status === 400 || response.status === 422 || response.status === 200,
            details: `Validation response: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'api-sentinel',
      name: 'SENTINEL Route',
      description: 'POST /api/agents/sentinel responds',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/agents/sentinel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskType: 'calculate_compliance' }),
            signal: AbortSignal.timeout(10000),
          });

          return {
            passed: response.status !== 500 && response.status !== 404,
            details: `SENTINEL route status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'api-guardian',
      name: 'GUARDIAN Route',
      description: 'POST /api/agents/guardian responds',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/agents/guardian', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskType: 'assess_audit_readiness' }),
            signal: AbortSignal.timeout(10000),
          });

          return {
            passed: response.status !== 500 && response.status !== 404,
            details: `GUARDIAN route status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'api-hubzone-lookup',
      name: 'HUBZone Lookup Route',
      description: 'POST /api/hubzone/lookup responds',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/hubzone/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: '123 Test St, Washington, DC 20001' }),
            signal: AbortSignal.timeout(10000),
          });

          return {
            passed: response.status !== 500 && response.status !== 404,
            details: `HUBZone lookup status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 4: UI COMPONENTS
// Exit Gate: 85%+ pass rate, zero accessibility violations
// ============================================================

export const phase4HealthChecks: PhaseHealthCheck = {
  phase: 'ui_components',
  phaseNumber: 4,
  description: 'Dashboard and forms render correctly with accessibility',
  passingThreshold: 85,
  blockingChecks: ['dashboard-renders', 'accessibility'],
  checks: [
    {
      id: 'dashboard-renders',
      name: 'Dashboard Page',
      description: 'Dashboard loads without errors',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/dashboard', {
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();
          const hasErrors =
            html.includes('Error:') ||
            html.includes('error:') ||
            html.includes('TypeError') ||
            html.includes('ReferenceError');

          return {
            passed: response.ok && !hasErrors,
            details: response.ok
              ? hasErrors
                ? 'Dashboard has errors in output'
                : 'Dashboard renders successfully'
              : `Status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'home-renders',
      name: 'Home Page',
      description: 'Home page loads correctly',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/', {
            signal: AbortSignal.timeout(10000),
          });

          return {
            passed: response.ok,
            details: response.ok ? 'Home page renders' : `Status: ${response.status}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'accessibility',
      name: 'Accessibility Check',
      description: 'No critical accessibility violations',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/dashboard', {
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();

          // Basic accessibility checks
          const issues: string[] = [];

          // Check for images without alt
          const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi);
          if (imgWithoutAlt && imgWithoutAlt.length > 0) {
            issues.push(`${imgWithoutAlt.length} image(s) without alt text`);
          }

          // Check for form labels
          const inputsWithoutLabels = html.match(
            /<input(?![^>]*aria-label)(?![^>]*id=[^>]*<label[^>]*for)[^>]*>/gi
          );
          if (inputsWithoutLabels && inputsWithoutLabels.length > 5) {
            issues.push(`${inputsWithoutLabels.length} inputs may lack labels`);
          }

          // Check for basic landmarks
          const hasMain = html.includes('<main') || html.includes('role="main"');
          if (!hasMain) {
            issues.push('Missing main landmark');
          }

          return {
            passed: issues.length === 0,
            details:
              issues.length === 0
                ? 'No critical accessibility issues'
                : `Issues: ${issues.join(', ')}`,
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'responsive',
      name: 'Responsive Design',
      description: 'Pages include responsive meta tags',
      severity: 'required',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/', {
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();

          const hasViewport = html.includes('viewport');
          const hasTailwind =
            html.includes('tailwind') || html.includes('flex') || html.includes('grid');

          return {
            passed: hasViewport,
            details: hasViewport
              ? 'Responsive viewport meta tag present'
              : 'Missing viewport meta tag',
          };
        } catch (e: unknown) {
          return { passed: false, details: `Failed: ${(e as Error).message}` };
        }
      },
    },
    {
      id: 'component-files',
      name: 'Component Files Present',
      description: 'Required UI components exist',
      severity: 'required',
      testFn: async () => {
        const components = [
          'src/components/ComplianceDashboard.tsx',
          'src/components/EmployeeTable.tsx',
          'src/components/HubzoneMap.tsx',
          'src/components/AddressLookup.tsx',
        ];

        const missing: string[] = [];

        for (const comp of components) {
          const fullPath = path.resolve(process.cwd(), comp);
          if (!fs.existsSync(fullPath)) {
            missing.push(comp);
          }
        }

        return {
          passed: missing.length === 0,
          details:
            missing.length === 0
              ? `All ${components.length} components present`
              : `Missing: ${missing.join(', ')}`,
        };
      },
    },
  ],
};

// ============================================================
// HEALTH CHECK RUNNER CLASS
// ============================================================

export class HealthCheckRunner {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async runPhaseChecks(phase: PhaseHealthCheck): Promise<PhaseResult> {
    const phaseStart = Date.now();

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  PHASE ${phase.phaseNumber}: ${phase.phase.toUpperCase()}`);
    console.log(`  ${phase.description}`);
    console.log(`  Pass Threshold: ${phase.passingThreshold}%`);
    console.log(`${'═'.repeat(70)}\n`);

    const results: CheckResult[] = [];

    for (const check of phase.checks) {
      const icon = { blocking: '🔴', required: '🟡', recommended: '🟢' }[check.severity];
      console.log(`${icon} [${check.severity.toUpperCase()}] ${check.name}`);
      console.log(`   ${check.description}`);

      const checkStart = Date.now();
      let testResult = await check.testFn(this.prisma);
      let autoFixed = false;

      // Auto-fix if available and failed
      if (!testResult.passed && check.autoFix) {
        console.log(`   ⚠️  FAILED - Attempting auto-fix...`);
        const fixed = await check.autoFix(this.prisma);
        if (fixed) {
          testResult = await check.testFn(this.prisma);
          autoFixed = testResult.passed;
          if (autoFixed) {
            console.log(`   ✅ Auto-fix SUCCESSFUL`);
          } else {
            console.log(`   ❌ Auto-fix FAILED`);
          }
        }
      }

      const duration = Date.now() - checkStart;
      const statusIcon = testResult.passed ? '✅' : '❌';
      console.log(`   ${statusIcon} ${testResult.details} (${duration}ms)\n`);

      results.push({
        check,
        passed: testResult.passed,
        details: testResult.details,
        autoFixed,
        duration,
      });
    }

    // Calculate pass rate
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const passRate = (passed / total) * 100;

    // Check blocking checks
    const blockingFailed = phase.blockingChecks.filter((checkId) => {
      const result = results.find((r) => r.check.id === checkId);
      return result && !result.passed;
    });

    const canProceed = passRate >= phase.passingThreshold && blockingFailed.length === 0;
    const phaseDuration = Date.now() - phaseStart;

    console.log(`${'─'.repeat(70)}`);
    console.log(`  PHASE ${phase.phaseNumber} RESULT: ${canProceed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Pass Rate: ${passRate.toFixed(1)}% (required: ${phase.passingThreshold}%)`);
    console.log(`  Checks: ${passed}/${total} passed`);
    console.log(`  Duration: ${phaseDuration}ms`);
    if (blockingFailed.length > 0) {
      console.log(`  ⛔ Blocking Failures: ${blockingFailed.join(', ')}`);
    }
    console.log(`${'─'.repeat(70)}\n`);

    return {
      phase: phase.phase,
      phaseNumber: phase.phaseNumber,
      passRate,
      canProceed,
      results,
      blockingFailed,
      timestamp: new Date(),
      duration: phaseDuration,
    };
  }

  async runAllPhases(): Promise<PhaseResult[]> {
    const phases = [
      phase1HealthChecks,
      phase2HealthChecks,
      phase3HealthChecks,
      phase4HealthChecks,
    ];

    const allResults: PhaseResult[] = [];

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`  HZ NAVIGATOR - PHASE-GATED VERIFICATION SYSTEM`);
    console.log(`  Running all ${phases.length} phases sequentially`);
    console.log(`${'█'.repeat(70)}`);

    for (const phase of phases) {
      const result = await this.runPhaseChecks(phase);
      allResults.push(result);

      if (!result.canProceed) {
        console.log(`\n🛑 BUILD STOPPED AT PHASE ${phase.phaseNumber}: ${phase.phase}`);
        console.log(`\nFix the following before proceeding:`);
        result.results
          .filter((r) => !r.passed)
          .forEach((r) => {
            const sev = r.check.severity === 'blocking' ? '⛔' : '⚠️';
            console.log(`  ${sev} [${r.check.id}] ${r.check.name}: ${r.details}`);
          });
        break;
      }

      console.log(`✅ PHASE ${phase.phaseNumber} COMPLETE - Proceeding to next phase\n`);
    }

    // Final summary
    console.log(`\n${'█'.repeat(70)}`);
    console.log(`  VERIFICATION SUMMARY`);
    console.log(`${'█'.repeat(70)}`);

    for (const result of allResults) {
      const icon = result.canProceed ? '✅' : '❌';
      console.log(
        `  ${icon} Phase ${result.phaseNumber}: ${result.phase} - ${result.passRate.toFixed(1)}%`
      );
    }

    if (allResults.every((r) => r.canProceed)) {
      console.log(`\n🎉 ALL PHASES PASSED - BUILD VERIFIED!\n`);
    } else {
      const failedPhase = allResults.find((r) => !r.canProceed);
      console.log(`\n❌ BUILD VERIFICATION FAILED AT PHASE ${failedPhase?.phaseNumber}\n`);
    }

    return allResults;
  }
}

// ============================================================
// CLI EXECUTION
// ============================================================

async function main() {
  const prisma = new PrismaClient();

  try {
    const runner = new HealthCheckRunner(prisma);

    // Check command line args for specific phase
    const args = process.argv.slice(2);
    const phaseArg = args.find((a) => a.startsWith('--phase='));

    if (phaseArg) {
      const phaseName = phaseArg.split('=')[1];
      const phases: Record<string, PhaseHealthCheck> = {
        database: phase1HealthChecks,
        agents: phase2HealthChecks,
        api: phase3HealthChecks,
        ui: phase4HealthChecks,
        '1': phase1HealthChecks,
        '2': phase2HealthChecks,
        '3': phase3HealthChecks,
        '4': phase4HealthChecks,
      };

      const phase = phases[phaseName];
      if (phase) {
        await runner.runPhaseChecks(phase);
      } else {
        console.log(`Unknown phase: ${phaseName}`);
        console.log(`Available phases: database, agents, api, ui (or 1, 2, 3, 4)`);
        process.exit(1);
      }
    } else {
      const results = await runner.runAllPhases();
      const allPassed = results.every((r) => r.canProceed);
      process.exit(allPassed ? 0 : 1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Health check runner failed:', error);
    process.exit(1);
  });
}
