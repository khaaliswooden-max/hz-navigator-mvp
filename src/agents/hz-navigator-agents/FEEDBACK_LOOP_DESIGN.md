# HZ Navigator - Agentic Feedback Loop Design

## Executive Summary

This document defines how the 10 AI agents stress-test the platform they power, creating a recursive feedback loop where agents validate, critique, and drive improvements to both the codebase and UI/UX.

**Core Principle**: Agents are not just features—they are QA engineers, UX researchers, and product managers rolled into one. Each agent tests its own functionality AND provides feedback that shapes the next build iteration.

---

## PART 1: AGENT STRESS TESTING GUIDELINES

### 1.1 Agent Testing Roles

Each agent has three testing responsibilities:

| Agent | Primary Test Role | Secondary Test Role | UI/UX Feedback Domain |
|-------|-------------------|--------------------|-----------------------|
| **NEXUS** | Integration testing | Performance benchmarks | Task routing UX, error messaging |
| **SENTINEL** | Compliance accuracy | Edge case coverage | Dashboard clarity, alert design |
| **CARTOGRAPH** | Geospatial precision | API reliability | Map interface, address forms |
| **WORKFORCE** | Data integrity | Calculation accuracy | Employee management flows |
| **CAPTURE** | External API handling | Search relevance | Pipeline views, opportunity cards |
| **ADVOCATE** | Regulatory accuracy | Content completeness | Guidance readability, search |
| **GUARDIAN** | Documentation completeness | Evidence validity | Audit prep wizard, checklists |
| **DIPLOMAT** | Analysis accuracy | Scoring consistency | Partner comparison views |
| **ORACLE** | Prediction accuracy | Statistical validity | Charts, forecasts, dashboards |
| **ARCHIVIST** | Document generation | Data extraction accuracy | Report templates, downloads |

### 1.2 Stress Test Scenarios Per Agent

#### NEXUS Stress Tests
```yaml
test_scenarios:
  - name: "Concurrent Task Storm"
    description: "Submit 100 tasks across all agents simultaneously"
    success_criteria: "All complete within 60 seconds, no deadlocks"
    
  - name: "Cascading Failure Recovery"
    description: "Kill one agent mid-task, verify graceful degradation"
    success_criteria: "Error logged, user notified, no data loss"
    
  - name: "Priority Queue Stress"
    description: "Submit low-priority during high-priority execution"
    success_criteria: "High-priority completes first, queue respected"
    
  - name: "Cross-Agent Dependency"
    description: "ORACLE requests data from SENTINEL + WORKFORCE"
    success_criteria: "Dependencies resolve, no circular waits"
```

#### SENTINEL Stress Tests
```yaml
test_scenarios:
  - name: "Boundary Compliance"
    description: "Test 34.9%, 35.0%, 35.1% compliance states"
    success_criteria: "Correct status for each threshold"
    
  - name: "Large Workforce Scale"
    description: "Calculate compliance for 500+ employees"
    success_criteria: "Complete < 2 seconds, accurate calculation"
    
  - name: "Rapid State Changes"
    description: "10 hires/terminations in 60 seconds"
    success_criteria: "All snapshots recorded, no race conditions"
    
  - name: "Grace Period Edge Cases"
    description: "Test day 364, 365, 366 of grace period"
    success_criteria: "Correct status transitions"
```

#### CARTOGRAPH Stress Tests
```yaml
test_scenarios:
  - name: "Malformed Address Handling"
    description: "Submit 50 variations of invalid addresses"
    success_criteria: "Graceful failures, helpful error messages"
    
  - name: "HUBZone Boundary Edge"
    description: "Verify addresses exactly on census tract borders"
    success_criteria: "Consistent, deterministic results"
    
  - name: "Batch Verification Scale"
    description: "Verify 200 addresses in single request"
    success_criteria: "Complete < 30 seconds, all results returned"
    
  - name: "API Failure Recovery"
    description: "Simulate SBA HUBZone API timeout"
    success_criteria: "Retry logic works, cached results used"
```

#### WORKFORCE Stress Tests
```yaml
test_scenarios:
  - name: "90-Day Residency Calculation"
    description: "Test employees at day 89, 90, 91 of residency"
    success_criteria: "Correct inclusion/exclusion in counts"
    
  - name: "Legacy Employee Limit"
    description: "Attempt to create 5th legacy employee"
    success_criteria: "Blocked with clear error message"
    
  - name: "Hire Impact Simulation"
    description: "Simulate hiring that tips compliance over/under 35%"
    success_criteria: "Accurate projections, clear recommendations"
    
  - name: "Employee Data Integrity"
    description: "Update same employee from two sessions"
    success_criteria: "No data corruption, last-write-wins or conflict resolution"
```

#### CAPTURE Stress Tests
```yaml
test_scenarios:
  - name: "Opportunity Deduplication"
    description: "Submit same SAM.gov notice twice"
    success_criteria: "Single entry, no duplicates"
    
  - name: "Pipeline Value Calculation"
    description: "100 opportunities with varying probabilities"
    success_criteria: "Weighted pipeline accurate to $1"
    
  - name: "Deadline Sorting"
    description: "Mix of past, today, future deadlines"
    success_criteria: "Correct ordering, past opportunities flagged"
    
  - name: "Set-Aside Filtering"
    description: "Filter by HUBZone when mixed set-asides exist"
    success_criteria: "Only matching opportunities returned"
```

#### ADVOCATE Stress Tests
```yaml
test_scenarios:
  - name: "Regulation Citation Accuracy"
    description: "Query all 13 CFR 126.xxx citations"
    success_criteria: "Correct interpretation for each"
    
  - name: "Guidance Completeness"
    description: "Ask about every HUBZone topic"
    success_criteria: "Substantive guidance for all major topics"
    
  - name: "Update Detection"
    description: "Simulate new Federal Register entry"
    success_criteria: "Detected within scan cycle"
    
  - name: "Conflicting Guidance"
    description: "Query topic with SBA vs. CFR discrepancy"
    success_criteria: "Both sources cited, discrepancy noted"
```

#### GUARDIAN Stress Tests
```yaml
test_scenarios:
  - name: "Audit Package Completeness"
    description: "Generate package for 12-month period"
    success_criteria: "All required sections present"
    
  - name: "Gap Detection Accuracy"
    description: "Missing verifications, incomplete records"
    success_criteria: "All gaps identified with remediation steps"
    
  - name: "Evidence Trail Integrity"
    description: "Verify audit trail cannot be modified"
    success_criteria: "Immutable records, tampering detected"
    
  - name: "ATM Documentation"
    description: "Log 20 attempt-to-maintain actions"
    success_criteria: "All recorded with timestamps"
```

#### DIPLOMAT Stress Tests
```yaml
test_scenarios:
  - name: "Synergy Score Consistency"
    description: "Same partner, different order of evaluation"
    success_criteria: "Identical scores regardless of order"
    
  - name: "Partner Deduplication"
    description: "Add partner with same CAGE code twice"
    success_criteria: "Blocked or merged, no duplicates"
    
  - name: "Complementary Cert Analysis"
    description: "Org with all certs vs. org with none"
    success_criteria: "Correct gap identification"
    
  - name: "JV Viability Edge Cases"
    description: "Evaluate JV at affiliation boundary"
    success_criteria: "Conservative recommendation with caveats"
```

#### ORACLE Stress Tests
```yaml
test_scenarios:
  - name: "Forecast Accuracy Backtesting"
    description: "Compare past forecasts to actual outcomes"
    success_criteria: "Within 10% accuracy for 30-day forecasts"
    
  - name: "Insufficient Data Handling"
    description: "Forecast with < 3 data points"
    success_criteria: "Graceful decline, not garbage output"
    
  - name: "Scenario Explosion"
    description: "Request 50 concurrent what-if scenarios"
    success_criteria: "All complete, no memory issues"
    
  - name: "Trend Detection"
    description: "Detect declining trend in noisy data"
    success_criteria: "Correct trend identification with confidence"
```

#### ARCHIVIST Stress Tests
```yaml
test_scenarios:
  - name: "Report Generation Scale"
    description: "Generate 12-month report with 500 employees"
    success_criteria: "Complete < 10 seconds, valid format"
    
  - name: "Document Parsing Robustness"
    description: "Parse 20 different document formats"
    success_criteria: "Extract data or graceful failure"
    
  - name: "Search Relevance"
    description: "Find document by partial match"
    success_criteria: "Relevant results ranked first"
    
  - name: "Concurrent Generation"
    description: "5 users generate reports simultaneously"
    success_criteria: "All receive correct, separate reports"
```

---

## PART 2: FEEDBACK LOOP ARCHITECTURE

### 2.1 The Recursive Feedback Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK LOOP CYCLE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │  BUILD   │───▶│   TEST   │───▶│ ANALYZE  │───▶│  REPORT  │        │
│   │  PHASE   │    │  (Agents)│    │ (ORACLE) │    │(ARCHIVIST)│        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
│        ▲                                               │               │
│        │                                               ▼               │
│   ┌──────────┐                                   ┌──────────┐         │
│   │  PATCH   │◀──────────────────────────────────│  TRIAGE  │         │
│   │  (Dev)   │                                   │ (NEXUS)  │         │
│   └──────────┘                                   └──────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Feedback Data Model

```typescript
interface FeedbackEvent {
  id: string;
  cycleNumber: number;
  phase: 'build' | 'test' | 'analyze' | 'report' | 'triage' | 'patch';
  
  // Source
  agentSource: AgentType;
  taskType: string;
  
  // Finding
  category: 'bug' | 'ux_issue' | 'performance' | 'feature_gap' | 'data_quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Details
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionSteps: string[];
  
  // Evidence
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  screenshots?: string[];
  
  // Resolution
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  resolution?: string;
  patchedInCycle?: number;
  
  // Learning
  preventionStrategy?: string;
  addedToTestSuite: boolean;
  
  createdAt: Date;
  resolvedAt?: Date;
}

interface BuildCycle {
  cycleNumber: number;
  phase: string;
  startedAt: Date;
  completedAt?: Date;
  
  // Inputs
  features: string[];
  targetComponents: string[];
  
  // Outputs
  feedbackEvents: FeedbackEvent[];
  healthScore: number;
  passedTests: number;
  failedTests: number;
  
  // Decision
  proceedToNext: boolean;
  blockers: string[];
}
```

### 2.3 How Agents Generate Feedback

#### SENTINEL → UI/UX Feedback
```typescript
// After compliance calculation, SENTINEL evaluates its own UI presentation
async evaluateComplianceDashboard(): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  
  // Test: Is the compliance percentage prominently displayed?
  const prominenceScore = await this.assessUIProminence('compliance-gauge');
  if (prominenceScore < 0.8) {
    feedback.push({
      category: 'ux_issue',
      severity: 'high',
      description: 'Compliance percentage not immediately visible',
      expectedBehavior: 'User sees compliance % within 1 second of page load',
      actualBehavior: `Prominence score: ${prominenceScore}`,
      reproductionSteps: ['Load dashboard', 'Measure time to locate compliance'],
    });
  }
  
  // Test: Are alerts actionable?
  const alerts = await this.generateAlerts(this.organizationId);
  for (const alert of alerts) {
    if (!alert.recommendedAction) {
      feedback.push({
        category: 'feature_gap',
        severity: 'medium',
        description: `Alert "${alert.type}" has no recommended action`,
        expectedBehavior: 'Every alert should suggest next steps',
        actualBehavior: 'Alert shows problem but no solution',
      });
    }
  }
  
  return feedback;
}
```

#### CARTOGRAPH → UI/UX Feedback
```typescript
// After address verification, CARTOGRAPH evaluates the address form UX
async evaluateAddressForm(): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  
  // Test: Does autocomplete help users?
  const testAddresses = [
    '123 Main',  // Partial
    '123 Main Street, Washington',  // Missing state/zip
    'main st dc 20001',  // Informal format
  ];
  
  for (const addr of testAddresses) {
    const result = await this.verifyAddress({ address: addr });
    if (!result.suggestions || result.suggestions.length === 0) {
      feedback.push({
        category: 'ux_issue',
        severity: 'medium',
        description: 'Address form not offering corrections for partial input',
        inputData: { address: addr },
        expectedBehavior: 'Suggest valid completions for partial addresses',
        actualBehavior: 'No suggestions provided',
      });
    }
  }
  
  // Test: Is HUBZone status immediately clear?
  const verifiedAddress = await this.verifyAddress({ 
    address: '100 F Street NE, Washington, DC 20549' 
  });
  if (!verifiedAddress.hubzoneType || !verifiedAddress.hubzoneDescription) {
    feedback.push({
      category: 'ux_issue',
      severity: 'high',
      description: 'HUBZone type not clearly explained to user',
      expectedBehavior: 'Show "QCT - Qualified Census Tract" with explanation',
      actualBehavior: `Shows: ${verifiedAddress.hubzoneType}`,
    });
  }
  
  return feedback;
}
```

#### ORACLE → Performance Feedback
```typescript
// ORACLE monitors its own performance and system health
async evaluateSystemPerformance(): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  
  // Test: Are forecasts completing in acceptable time?
  const start = Date.now();
  await this.forecastCompliance(this.organizationId, 6);
  const duration = Date.now() - start;
  
  if (duration > 5000) {
    feedback.push({
      category: 'performance',
      severity: duration > 10000 ? 'high' : 'medium',
      description: `Forecast taking ${duration}ms (target: < 5000ms)`,
      expectedBehavior: 'Forecasts complete within 5 seconds',
      actualBehavior: `Completed in ${duration}ms`,
      reproductionSteps: ['Call forecast_compliance with months=6'],
    });
  }
  
  // Test: Is prediction quality degrading?
  const accuracy = await this.backtestPredictions(30);
  if (accuracy < 0.7) {
    feedback.push({
      category: 'data_quality',
      severity: 'high',
      description: `Forecast accuracy dropped to ${(accuracy * 100).toFixed(1)}%`,
      expectedBehavior: 'Maintain > 70% accuracy on 30-day forecasts',
      actualBehavior: `Current accuracy: ${(accuracy * 100).toFixed(1)}%`,
      preventionStrategy: 'Retrain model with recent data',
    });
  }
  
  return feedback;
}
```

### 2.4 Feedback Aggregation by NEXUS

```typescript
// NEXUS collects feedback from all agents and triages
async runFeedbackCycle(cycleNumber: number): Promise<BuildCycle> {
  const allFeedback: FeedbackEvent[] = [];
  
  // Collect feedback from each agent
  const agents = [
    { agent: this.sentinel, method: 'evaluateComplianceDashboard' },
    { agent: this.cartograph, method: 'evaluateAddressForm' },
    { agent: this.workforce, method: 'evaluateEmployeeManagement' },
    { agent: this.capture, method: 'evaluatePipelineUX' },
    { agent: this.advocate, method: 'evaluateGuidanceClarity' },
    { agent: this.guardian, method: 'evaluateAuditWorkflow' },
    { agent: this.diplomat, method: 'evaluatePartnerComparison' },
    { agent: this.oracle, method: 'evaluateSystemPerformance' },
    { agent: this.archivist, method: 'evaluateReportGeneration' },
  ];
  
  for (const { agent, method } of agents) {
    try {
      const feedback = await agent[method]();
      allFeedback.push(...feedback.map(f => ({
        ...f,
        cycleNumber,
        agentSource: agent.name,
      })));
    } catch (error) {
      allFeedback.push({
        cycleNumber,
        agentSource: agent.name,
        category: 'bug',
        severity: 'critical',
        description: `Agent ${agent.name} failed to evaluate: ${error.message}`,
        expectedBehavior: 'Agent completes self-evaluation',
        actualBehavior: `Threw error: ${error.message}`,
      });
    }
  }
  
  // Triage: Sort by severity and category
  const prioritized = this.triageFeedback(allFeedback);
  
  // Determine if build can proceed
  const criticalCount = prioritized.filter(f => f.severity === 'critical').length;
  const highCount = prioritized.filter(f => f.severity === 'high').length;
  
  return {
    cycleNumber,
    phase: 'test',
    startedAt: new Date(),
    feedbackEvents: prioritized,
    healthScore: this.calculateHealthScore(prioritized),
    passedTests: prioritized.filter(f => f.status === 'resolved').length,
    failedTests: prioritized.filter(f => f.status === 'open').length,
    proceedToNext: criticalCount === 0,
    blockers: prioritized
      .filter(f => f.severity === 'critical')
      .map(f => f.description),
  };
}
```

---

## PART 3: BUILD PHASE VERIFICATION

### 3.1 Phase Health Check Protocol

Each build phase has explicit health checks that must pass before proceeding:

```typescript
interface PhaseHealthCheck {
  phase: string;
  checks: HealthCheck[];
  passingThreshold: number;  // Minimum % of checks that must pass
  blockingChecks: string[];  // Checks that MUST pass regardless
}

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  testFn: () => Promise<{ passed: boolean; details: string }>;
  autoFix?: () => Promise<boolean>;
  severity: 'blocking' | 'required' | 'recommended';
}
```

### 3.2 Phase 1: Database Foundation Health Checks

```typescript
const phase1HealthChecks: PhaseHealthCheck = {
  phase: 'database_foundation',
  passingThreshold: 100,  // All must pass
  blockingChecks: ['db-connection', 'schema-valid', 'migrations-applied'],
  checks: [
    {
      id: 'db-connection',
      name: 'Database Connection',
      description: 'Verify PostgreSQL connection is active',
      severity: 'blocking',
      testFn: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return { passed: true, details: 'Connection successful' };
        } catch (e) {
          return { passed: false, details: `Connection failed: ${e.message}` };
        }
      },
      autoFix: async () => {
        // Attempt to restart connection pool
        await prisma.$disconnect();
        await prisma.$connect();
        return true;
      },
    },
    {
      id: 'schema-valid',
      name: 'Schema Validation',
      description: 'All required tables exist with correct columns',
      severity: 'blocking',
      testFn: async () => {
        const requiredTables = [
          'Organization', 'Employee', 'ComplianceSnapshot', 
          'AddressVerification', 'AgentTask', 'LearningEvent'
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
          details: missing.length ? `Missing tables: ${missing.join(', ')}` : 'All tables present',
        };
      },
      autoFix: async () => {
        execSync('npx prisma db push', { stdio: 'inherit' });
        return true;
      },
    },
    {
      id: 'postgis-enabled',
      name: 'PostGIS Extension',
      description: 'Spatial queries require PostGIS',
      severity: 'required',
      testFn: async () => {
        try {
          await prisma.$queryRaw`SELECT PostGIS_Version()`;
          return { passed: true, details: 'PostGIS enabled' };
        } catch {
          return { passed: false, details: 'PostGIS not installed' };
        }
      },
      autoFix: async () => {
        await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
        return true;
      },
    },
    {
      id: 'seed-data',
      name: 'Test Data Seeded',
      description: 'Development requires seed data',
      severity: 'recommended',
      testFn: async () => {
        const orgCount = await prisma.organization.count();
        return {
          passed: orgCount > 0,
          details: orgCount > 0 ? `${orgCount} organizations found` : 'No seed data',
        };
      },
      autoFix: async () => {
        execSync('npx prisma db seed', { stdio: 'inherit' });
        return true;
      },
    },
  ],
};
```

### 3.3 Phase 2: Agent Integration Health Checks

```typescript
const phase2HealthChecks: PhaseHealthCheck = {
  phase: 'agent_integration',
  passingThreshold: 90,
  blockingChecks: ['nexus-routing', 'agent-instantiation'],
  checks: [
    {
      id: 'nexus-routing',
      name: 'NEXUS Task Routing',
      description: 'All agent types are routable',
      severity: 'blocking',
      testFn: async () => {
        const agents: AgentType[] = [
          'sentinel', 'cartograph', 'workforce', 'capture',
          'advocate', 'guardian', 'diplomat', 'oracle', 'archivist'
        ];
        const failed: string[] = [];
        
        for (const agent of agents) {
          try {
            const task = await nexus.createTask({
              agentType: agent,
              taskType: 'health_check',
              input: {},
              organizationId: 'test-org',
            });
            if (task.status === 'failed') failed.push(agent);
          } catch {
            failed.push(agent);
          }
        }
        
        return {
          passed: failed.length === 0,
          details: failed.length ? `Failed agents: ${failed.join(', ')}` : 'All agents routable',
        };
      },
    },
    {
      id: 'agent-instantiation',
      name: 'Agent Instantiation',
      description: 'All agents can be instantiated',
      severity: 'blocking',
      testFn: async () => {
        const errors: string[] = [];
        
        try { new SentinelAgent(prisma); } catch (e) { errors.push(`SENTINEL: ${e.message}`); }
        try { new CartographAgent(prisma); } catch (e) { errors.push(`CARTOGRAPH: ${e.message}`); }
        try { new WorkforceAgent(prisma); } catch (e) { errors.push(`WORKFORCE: ${e.message}`); }
        // ... all agents
        
        return {
          passed: errors.length === 0,
          details: errors.length ? errors.join('; ') : 'All agents instantiated',
        };
      },
    },
    {
      id: 'sentinel-compliance',
      name: 'SENTINEL Compliance Calculation',
      description: 'Can calculate compliance for test organization',
      severity: 'required',
      testFn: async () => {
        const result = await sentinel.execute(
          'calculate_compliance',
          {},
          'test-org'
        );
        
        return {
          passed: result.percentage !== undefined,
          details: result.percentage !== undefined 
            ? `Compliance: ${result.percentage}%` 
            : 'Calculation failed',
        };
      },
    },
    {
      id: 'cartograph-verify',
      name: 'CARTOGRAPH Address Verification',
      description: 'Can verify a known HUBZone address',
      severity: 'required',
      testFn: async () => {
        const result = await cartograph.execute(
          'verify_address',
          { address: '100 F Street NE, Washington, DC 20549' },
          'test-org'
        );
        
        return {
          passed: result.isHubzone !== undefined,
          details: result.isHubzone ? 'Address verified as HUBZone' : 'Verification returned result',
        };
      },
    },
    // ... more agent-specific checks
  ],
};
```

### 3.4 Phase 3: API Routes Health Checks

```typescript
const phase3HealthChecks: PhaseHealthCheck = {
  phase: 'api_routes',
  passingThreshold: 95,
  blockingChecks: ['api-compliance', 'api-auth'],
  checks: [
    {
      id: 'api-compliance',
      name: 'Compliance API Endpoint',
      description: 'POST /api/agents/compliance returns valid response',
      severity: 'blocking',
      testFn: async () => {
        const response = await fetch('http://localhost:3000/api/agents/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: 'test-org' }),
        });
        
        const data = await response.json();
        
        return {
          passed: response.ok && data.success === true,
          details: response.ok ? 'API responded correctly' : `Status: ${response.status}`,
        };
      },
    },
    {
      id: 'api-auth',
      name: 'API Authentication',
      description: 'Unauthorized requests are rejected',
      severity: 'blocking',
      testFn: async () => {
        const response = await fetch('http://localhost:3000/api/agents/compliance', {
          method: 'POST',
          // No auth headers
          body: JSON.stringify({ organizationId: 'test-org' }),
        });
        
        return {
          passed: response.status === 401 || response.status === 403,
          details: response.status === 401 ? 'Auth required' : `Status: ${response.status}`,
        };
      },
    },
    {
      id: 'api-validation',
      name: 'Input Validation',
      description: 'Invalid inputs return helpful errors',
      severity: 'required',
      testFn: async () => {
        const response = await fetch('http://localhost:3000/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: '' }), // Invalid - missing required fields
        });
        
        const data = await response.json();
        
        return {
          passed: response.status === 400 && data.errors?.length > 0,
          details: data.errors ? 'Validation errors returned' : 'No validation',
        };
      },
    },
  ],
};
```

### 3.5 Phase 4: UI Components Health Checks

```typescript
const phase4HealthChecks: PhaseHealthCheck = {
  phase: 'ui_components',
  passingThreshold: 85,
  blockingChecks: ['render-dashboard', 'accessibility'],
  checks: [
    {
      id: 'render-dashboard',
      name: 'Dashboard Renders',
      description: 'Main compliance dashboard renders without errors',
      severity: 'blocking',
      testFn: async () => {
        // Using Playwright or similar
        const page = await browser.newPage();
        await page.goto('http://localhost:3000/dashboard');
        
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        
        await page.waitForSelector('[data-testid="compliance-gauge"]', { timeout: 5000 });
        
        return {
          passed: errors.length === 0,
          details: errors.length ? `Console errors: ${errors.join('; ')}` : 'No errors',
        };
      },
    },
    {
      id: 'accessibility',
      name: 'Accessibility (a11y)',
      description: 'Dashboard passes WCAG 2.1 AA checks',
      severity: 'blocking',
      testFn: async () => {
        const page = await browser.newPage();
        await page.goto('http://localhost:3000/dashboard');
        
        // Run axe-core
        const results = await page.evaluate(() => {
          return window.axe.run();
        });
        
        const violations = results.violations.filter(v => 
          v.impact === 'critical' || v.impact === 'serious'
        );
        
        return {
          passed: violations.length === 0,
          details: violations.length 
            ? `${violations.length} a11y violations` 
            : 'Accessible',
        };
      },
    },
    {
      id: 'responsive',
      name: 'Responsive Design',
      description: 'Dashboard works on mobile viewports',
      severity: 'required',
      testFn: async () => {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('http://localhost:3000/dashboard');
        
        const gauge = await page.$('[data-testid="compliance-gauge"]');
        const box = await gauge?.boundingBox();
        
        return {
          passed: box && box.width > 0 && box.width <= 375,
          details: box ? 'Fits mobile viewport' : 'Element not found',
        };
      },
    },
  ],
};
```

### 3.6 Health Check Execution Engine

```typescript
class HealthCheckRunner {
  private prisma: PrismaClient;
  
  async runPhaseChecks(phase: PhaseHealthCheck): Promise<PhaseResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE: ${phase.phase.toUpperCase()}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const results: CheckResult[] = [];
    
    for (const check of phase.checks) {
      console.log(`Running: ${check.name}...`);
      
      let result = await check.testFn();
      
      // Auto-fix if available and failed
      if (!result.passed && check.autoFix) {
        console.log(`  ⚠️  Failed. Attempting auto-fix...`);
        const fixed = await check.autoFix();
        if (fixed) {
          result = await check.testFn();
          if (result.passed) {
            console.log(`  ✅ Auto-fix successful!`);
          }
        }
      }
      
      const icon = result.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${result.details}`);
      
      results.push({
        check,
        ...result,
      });
    }
    
    // Calculate pass rate
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = (passed / total) * 100;
    
    // Check blocking checks
    const blockingFailed = phase.blockingChecks.filter(checkId => {
      const result = results.find(r => r.check.id === checkId);
      return result && !result.passed;
    });
    
    const canProceed = passRate >= phase.passingThreshold && blockingFailed.length === 0;
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`PHASE RESULT: ${canProceed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}% (required: ${phase.passingThreshold}%)`);
    if (blockingFailed.length > 0) {
      console.log(`Blocking failures: ${blockingFailed.join(', ')}`);
    }
    console.log(`${'─'.repeat(60)}\n`);
    
    return {
      phase: phase.phase,
      passRate,
      canProceed,
      results,
      blockingFailed,
    };
  }
  
  async runAllPhases(): Promise<void> {
    const phases = [
      phase1HealthChecks,  // Database
      phase2HealthChecks,  // Agents
      phase3HealthChecks,  // APIs
      phase4HealthChecks,  // UI
    ];
    
    for (const phase of phases) {
      const result = await this.runPhaseChecks(phase);
      
      if (!result.canProceed) {
        console.log(`\n🛑 BUILD STOPPED AT PHASE: ${phase.phase}`);
        console.log(`Fix the following before proceeding:`);
        result.results
          .filter(r => !r.passed)
          .forEach(r => console.log(`  - ${r.check.name}: ${r.details}`));
        return;
      }
    }
    
    console.log(`\n🎉 ALL PHASES PASSED - BUILD COMPLETE!`);
  }
}
```

---

## PART 4: COMPLETE BUILD ROADMAP WITH VERIFICATION

### 4.1 Week-by-Week Build with Health Checks

```yaml
week_1:
  name: "Database Foundation"
  features:
    - PostgreSQL setup with PostGIS
    - Prisma schema with all models
    - Seed data for development
    
  health_checks:
    blocking:
      - db-connection
      - schema-valid
      - postgis-enabled
    required:
      - seed-data
      - index-performance
      
  agents_involved:
    - NEXUS: Verify task logging works
    - ARCHIVIST: Verify document storage
    
  exit_criteria:
    - "All blocking checks pass"
    - "Can create/read/update/delete all entities"
    - "Spatial queries return results"

week_2:
  name: "Core Agent Integration"
  features:
    - NEXUS orchestrator
    - SENTINEL compliance calculation
    - CARTOGRAPH address verification
    - WORKFORCE employee management
    
  health_checks:
    blocking:
      - nexus-routing
      - sentinel-compliance
      - cartograph-verify
      - workforce-crud
    required:
      - agent-error-handling
      - task-persistence
      
  agents_involved:
    - All core agents self-test
    - ORACLE monitors performance
    
  feedback_loop:
    - Agents report execution times
    - Error patterns logged to LearningEvent
    - UI feedback on task status display
    
  exit_criteria:
    - "All agents respond to health_check task"
    - "Compliance calculation matches manual verification"
    - "Address verification returns correct HUBZone status"

week_3:
  name: "API Layer"
  features:
    - REST endpoints for all agents
    - Authentication/authorization
    - Rate limiting
    - Input validation
    
  health_checks:
    blocking:
      - api-auth
      - api-compliance
      - api-employees
    required:
      - api-rate-limiting
      - api-validation
      - api-error-responses
      
  agents_involved:
    - GUARDIAN: Verify audit logging
    - ARCHIVIST: Verify document endpoints
    
  feedback_loop:
    - ORACLE tracks response times
    - ADVOCATE validates error message clarity
    - SENTINEL tests calculation endpoints
    
  exit_criteria:
    - "All endpoints return proper status codes"
    - "Invalid inputs rejected with helpful errors"
    - "Authentication required on protected routes"

week_4:
  name: "Dashboard UI"
  features:
    - Compliance gauge component
    - Employee roster table
    - Alert notifications
    - Navigation structure
    
  health_checks:
    blocking:
      - render-dashboard
      - accessibility
    required:
      - responsive
      - performance-lcp
      - error-boundaries
      
  agents_involved:
    - SENTINEL: Evaluate compliance display
    - WORKFORCE: Evaluate roster UX
    - ORACLE: Monitor render performance
    
  feedback_loop:
    - Agents generate UI feedback events
    - Accessibility violations → immediate fixes
    - Performance regressions → optimization tasks
    
  exit_criteria:
    - "Dashboard renders in < 3 seconds"
    - "Zero accessibility violations"
    - "Mobile viewport works correctly"

week_5-6:
  name: "Employee Management"
  features:
    - Add/edit employee forms
    - Address verification integration
    - Hire impact simulation
    - Bulk import
    
  health_checks:
    blocking:
      - employee-crud
      - address-integration
    required:
      - simulation-accuracy
      - bulk-import
      - data-validation
      
  agents_involved:
    - WORKFORCE: Full CRUD testing
    - CARTOGRAPH: Verify address flow
    - SENTINEL: Confirm compliance updates
    - ORACLE: Validate simulation accuracy
    
  feedback_loop:
    - Form validation feedback
    - Error message clarity
    - Import failure handling
    
  exit_criteria:
    - "Can add employee and see immediate compliance update"
    - "Address verification integrates seamlessly"
    - "Bulk import handles 100 rows without errors"

week_7-8:
  name: "Capture & Pipeline"
  features:
    - Opportunity scanner
    - Pipeline visualization
    - Bid/no-bid analysis
    - Deadline tracking
    
  health_checks:
    blocking:
      - sam-api-integration
      - pipeline-calculation
    required:
      - opportunity-dedup
      - deadline-sorting
      - filter-accuracy
      
  agents_involved:
    - CAPTURE: Full pipeline testing
    - ORACLE: Validate win probability
    - ARCHIVIST: Generate opportunity reports
    
  feedback_loop:
    - Search relevance feedback
    - Pipeline visualization clarity
    - Bid/no-bid recommendation accuracy
    
  exit_criteria:
    - "SAM.gov integration returns real data"
    - "Pipeline value calculations accurate"
    - "Bid/no-bid provides actionable guidance"

week_9-10:
  name: "Analytics & Forecasting"
  features:
    - Compliance trend charts
    - Risk predictions
    - Scenario analysis
    - Executive dashboard
    
  health_checks:
    blocking:
      - forecast-generation
      - trend-calculation
    required:
      - chart-rendering
      - scenario-accuracy
      - backtest-validity
      
  agents_involved:
    - ORACLE: Primary functionality owner
    - SENTINEL: Provide historical data
    - ARCHIVIST: Generate analytics reports
    
  feedback_loop:
    - Chart readability
    - Forecast confidence communication
    - Scenario comparison UX
    
  exit_criteria:
    - "Forecasts generate for all time ranges"
    - "Charts render without errors"
    - "Backtesting shows > 70% accuracy"

week_11-12:
  name: "Audit & Documentation"
  features:
    - Audit readiness score
    - Evidence package generation
    - Documentation gap analysis
    - Export functionality
    
  health_checks:
    blocking:
      - evidence-generation
      - audit-scoring
    required:
      - gap-detection
      - export-formats
      - atm-logging
      
  agents_involved:
    - GUARDIAN: Primary owner
    - ARCHIVIST: Document generation
    - ADVOCATE: Regulatory accuracy
    
  feedback_loop:
    - Document completeness
    - Export format quality
    - Audit workflow clarity
    
  exit_criteria:
    - "Evidence package includes all sections"
    - "Audit readiness score is actionable"
    - "Exports work in PDF, Excel formats"

week_13-14:
  name: "Partnership & Advanced Features"
  features:
    - Partner discovery
    - Synergy analysis
    - JV evaluation
    - Regulatory monitoring
    
  health_checks:
    blocking:
      - partner-analysis
      - synergy-scoring
    required:
      - regulatory-scanning
      - jv-evaluation
      
  agents_involved:
    - DIPLOMAT: Partnership features
    - ADVOCATE: Regulatory monitoring
    - ORACLE: Scoring validation
    
  feedback_loop:
    - Partner comparison UX
    - Regulatory update clarity
    - Analysis accuracy
    
  exit_criteria:
    - "Partner synergy scores are consistent"
    - "Regulatory updates surface correctly"
    - "JV analysis provides clear guidance"

week_15-16:
  name: "Polish & Production"
  features:
    - Performance optimization
    - Error handling hardening
    - User onboarding flow
    - Help documentation
    
  health_checks:
    blocking:
      - production-performance
      - error-recovery
      - security-audit
    required:
      - onboarding-completion
      - help-accessibility
      - monitoring-active
      
  agents_involved:
    - ALL: Full system stress test
    - NEXUS: Concurrent load testing
    - ORACLE: Performance monitoring
    
  feedback_loop:
    - Final UX audit
    - Performance bottlenecks
    - Security findings
    
  exit_criteria:
    - "Lighthouse score > 90"
    - "Zero critical/high security issues"
    - "All agents pass stress tests"
```

---

## PART 5: FEEDBACK LOOP EXECUTION SCRIPT

### 5.1 Master Control Script

```typescript
// scripts/feedback-loop.ts

import { PrismaClient } from '@prisma/client';
import { getNexusOrchestrator } from '@/agents';
import { HealthCheckRunner } from './health-checks';
import { FeedbackAggregator } from './feedback-aggregator';

interface CycleConfig {
  cycleNumber: number;
  phase: string;
  features: string[];
  healthChecks: PhaseHealthCheck;
}

async function runFeedbackCycle(config: CycleConfig): Promise<CycleResult> {
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`FEEDBACK CYCLE ${config.cycleNumber}: ${config.phase}`);
  console.log(`${'█'.repeat(60)}\n`);
  
  const prisma = new PrismaClient();
  const nexus = getNexusOrchestrator();
  const healthRunner = new HealthCheckRunner(prisma);
  const feedbackAggregator = new FeedbackAggregator(prisma);
  
  // Step 1: Run Health Checks
  console.log('📋 STEP 1: Running Health Checks...\n');
  const healthResult = await healthRunner.runPhaseChecks(config.healthChecks);
  
  if (!healthResult.canProceed) {
    console.log('⛔ Health checks failed. Attempting auto-fixes...\n');
    
    // Attempt fixes and re-run
    const fixedResult = await healthRunner.runPhaseChecks(config.healthChecks);
    
    if (!fixedResult.canProceed) {
      return {
        cycleNumber: config.cycleNumber,
        status: 'blocked',
        healthScore: fixedResult.passRate,
        blockers: fixedResult.blockingFailed,
        feedback: [],
        recommendation: 'Manual intervention required',
      };
    }
  }
  
  // Step 2: Agent Self-Testing
  console.log('🤖 STEP 2: Running Agent Self-Tests...\n');
  const agentFeedback = await nexus.runFeedbackCycle(config.cycleNumber);
  
  // Step 3: Aggregate Feedback
  console.log('📊 STEP 3: Aggregating Feedback...\n');
  const aggregated = await feedbackAggregator.aggregate(agentFeedback.feedbackEvents);
  
  // Step 4: Prioritize Issues
  console.log('🎯 STEP 4: Prioritizing Issues...\n');
  const prioritized = feedbackAggregator.prioritize(aggregated);
  
  // Step 5: Generate Patch List
  console.log('🔧 STEP 5: Generating Patch List...\n');
  const patches = feedbackAggregator.generatePatchList(prioritized);
  
  // Step 6: Log Learning Events
  console.log('🧠 STEP 6: Logging Learning Events...\n');
  for (const feedback of prioritized) {
    await prisma.learningEvent.create({
      data: {
        eventType: 'feedback_cycle',
        inputData: feedback.inputData,
        outputData: feedback.outputData,
        outcome: feedback.status,
        metadata: {
          cycleNumber: config.cycleNumber,
          phase: config.phase,
          severity: feedback.severity,
        },
      },
    });
  }
  
  // Step 7: Report
  console.log('\n' + '─'.repeat(60));
  console.log('CYCLE SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Health Score: ${healthResult.passRate.toFixed(1)}%`);
  console.log(`Feedback Items: ${prioritized.length}`);
  console.log(`  - Critical: ${prioritized.filter(f => f.severity === 'critical').length}`);
  console.log(`  - High: ${prioritized.filter(f => f.severity === 'high').length}`);
  console.log(`  - Medium: ${prioritized.filter(f => f.severity === 'medium').length}`);
  console.log(`  - Low: ${prioritized.filter(f => f.severity === 'low').length}`);
  console.log(`Patches Required: ${patches.length}`);
  
  const canProceed = prioritized.filter(f => f.severity === 'critical').length === 0;
  
  console.log(`\nStatus: ${canProceed ? '✅ CAN PROCEED' : '⛔ BLOCKED'}`);
  
  if (patches.length > 0) {
    console.log('\nRequired Patches:');
    patches.forEach((p, i) => console.log(`  ${i + 1}. ${p.description}`));
  }
  
  return {
    cycleNumber: config.cycleNumber,
    status: canProceed ? 'passed' : 'blocked',
    healthScore: healthResult.passRate,
    blockers: canProceed ? [] : prioritized.filter(f => f.severity === 'critical').map(f => f.description),
    feedback: prioritized,
    patches,
    recommendation: canProceed 
      ? `Proceed to next phase. Address ${patches.length} patches in parallel.`
      : `Fix ${prioritized.filter(f => f.severity === 'critical').length} critical issues before proceeding.`,
  };
}

// Main execution
async function main() {
  const cycles: CycleConfig[] = [
    { cycleNumber: 1, phase: 'database_foundation', features: ['PostgreSQL', 'Prisma'], healthChecks: phase1HealthChecks },
    { cycleNumber: 2, phase: 'agent_integration', features: ['NEXUS', 'SENTINEL', 'CARTOGRAPH'], healthChecks: phase2HealthChecks },
    { cycleNumber: 3, phase: 'api_routes', features: ['REST endpoints', 'Auth'], healthChecks: phase3HealthChecks },
    { cycleNumber: 4, phase: 'ui_components', features: ['Dashboard', 'Forms'], healthChecks: phase4HealthChecks },
    // ... more phases
  ];
  
  for (const cycle of cycles) {
    const result = await runFeedbackCycle(cycle);
    
    if (result.status === 'blocked') {
      console.log(`\n🛑 BUILD BLOCKED AT CYCLE ${cycle.cycleNumber}`);
      console.log('Blockers:');
      result.blockers.forEach(b => console.log(`  - ${b}`));
      break;
    }
    
    console.log(`\n✅ CYCLE ${cycle.cycleNumber} COMPLETE\n`);
  }
}

main().catch(console.error);
```

---

## Summary

This feedback loop design ensures:

1. **Every agent has explicit testing responsibilities** - They test their own functionality AND critique the UI/UX
2. **Feedback flows automatically into build priorities** - Critical issues block progress, others become patches
3. **Health checks verify each phase** - Auto-fix when possible, block when necessary
4. **Learning persists** - Every feedback event becomes training data for future improvements
5. **The loop is recursive** - Each cycle's learnings improve the next cycle's execution

Run `npx ts-node scripts/feedback-loop.ts` after each build phase to validate and generate improvement tasks.
