# HZ Navigator - Agent Constellation

## Complete AI Agent System for HUBZone Compliance

This package contains all 10 AI agents for the HZ Navigator platform.

## Agent Overview

| Agent | Role | Key Functions |
|-------|------|---------------|
| **NEXUS** | Orchestrator | Routes tasks, manages execution, logs learning |
| **SENTINEL** | Compliance Monitor | 35% tracking, alerts, grace period management |
| **CARTOGRAPH** | Geospatial Intelligence | Address verification, HUBZone boundaries, map changes |
| **WORKFORCE** | Employee Intelligence | Roster management, hire/term impact, residency |
| **CAPTURE** | Opportunity Scanner | SAM.gov scanning, bid/no-bid, pipeline |
| **ADVOCATE** | Regulatory Intelligence | Policy monitoring, compliance guidance |
| **GUARDIAN** | Audit Defense | Evidence packages, audit preparation |
| **DIPLOMAT** | Partnership Intelligence | Teaming analysis, JV evaluation |
| **ORACLE** | Predictive Analytics | Forecasting, risk prediction, trends |
| **ARCHIVIST** | Document Intelligence | Report generation, document parsing |

## Installation

### Step 1: Copy agent files

Copy the entire `src/agents/` folder to your HZ Navigator project:

```bash
cp -r src/agents/ /path/to/hz-navigator-mvp/src/
```

### Step 2: Update Prisma schema

Ensure your `prisma/schema.prisma` includes the agent models. Key models needed:

```prisma
model AgentTask {
  id             String   @id @default(cuid())
  agentType      String
  taskType       String
  status         String   @default("pending")
  priority       Int      @default(5)
  input          Json
  output         Json?
  errorMessage   String?
  executionTimeMs Int?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  completedAt    DateTime?
}

model LearningEvent {
  id             String   @id @default(cuid())
  eventType      String
  inputData      Json
  outputData     Json
  outcome        String
  organizationId String?
  metadata       Json?
  createdAt      DateTime @default(now())
}

model ComplianceSnapshot {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])
  snapshotDate          DateTime @default(now())
  totalEmployees        Int
  hubzoneEmployees      Int
  compliancePercentage  Float
  legacyEmployeeCount   Int      @default(0)
  complianceStatus      String
  riskScore             Int?
  projections           Json?
  gracePeriodActive     Boolean  @default(false)
  gracePeriodEnd        DateTime?
}

// See full schema in project
```

### Step 3: Run migrations

```bash
npx prisma generate
npx prisma db push
```

### Step 4: Create API routes

Create API routes in `src/app/api/agents/`:

```typescript
// src/app/api/agents/compliance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getNexusOrchestrator } from '@/agents';

export async function POST(request: NextRequest) {
  const { organizationId } = await request.json();
  const nexus = getNexusOrchestrator();
  
  const result = await nexus.createTask({
    agentType: 'sentinel',
    taskType: 'calculate_compliance',
    input: {},
    organizationId,
  });
  
  return NextResponse.json({ success: true, ...result });
}
```

## Usage Examples

### Calculate Compliance

```typescript
import { getNexusOrchestrator } from '@/agents';

const nexus = getNexusOrchestrator();

const result = await nexus.createTask({
  agentType: 'sentinel',
  taskType: 'calculate_compliance',
  input: {},
  organizationId: 'org-123',
});
```

### Verify Address

```typescript
const result = await nexus.createTask({
  agentType: 'cartograph',
  taskType: 'verify_address',
  input: { address: '123 Main St, Washington, DC 20001' },
  organizationId: 'org-123',
});
```

### Scan Opportunities

```typescript
const result = await nexus.createTask({
  agentType: 'capture',
  taskType: 'scan_opportunities',
  input: {
    setAsides: ['hubzone', 'hubzone_sole'],
    naicsCodes: ['541511', '541512'],
  },
  organizationId: 'org-123',
});
```

### Generate Audit Package

```typescript
const result = await nexus.createTask({
  agentType: 'guardian',
  taskType: 'generate_evidence_package',
  input: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  },
  organizationId: 'org-123',
});
```

## Task Types by Agent

### SENTINEL
- `calculate_compliance` - Full compliance calculation
- `check_employee_status` - Individual employee check
- `generate_alerts` - Generate compliance alerts
- `simulate_hire` - Impact of new hire
- `simulate_termination` - Impact of termination
- `check_grace_period` - Grace period status

### CARTOGRAPH
- `verify_address` - Single address verification
- `batch_verify` - Multiple addresses
- `check_map_changes` - HUBZone map updates
- `get_hubzone_areas` - Areas by state/type
- `assess_redesignation_risk` - Risk for census tract

### WORKFORCE
- `get_roster` - Full employee roster
- `add_employee` - Add new employee
- `update_employee` - Update employee record
- `terminate_employee` - Soft delete
- `get_hiring_recommendations` - Hiring guidance
- `get_legacy_employees` - Legacy employee list

### CAPTURE
- `scan_opportunities` - Discover opportunities
- `analyze_opportunity` - Deep analysis
- `bid_no_bid` - Decision analysis
- `get_pipeline` - Pipeline summary
- `competitive_analysis` - Competition assessment

### ADVOCATE
- `scan_regulatory_updates` - Check for updates
- `get_compliance_guidance` - Topic guidance
- `interpret_regulation` - Regulation interpretation
- `explain_35_percent_rule` - Rule explanation
- `get_certification_requirements` - Requirements list

### GUARDIAN
- `assess_audit_readiness` - Readiness score
- `generate_evidence_package` - Audit documentation
- `get_compliance_history` - Historical data
- `document_attempt_to_maintain` - ATM logging
- `get_documentation_gaps` - Gap analysis

### DIPLOMAT
- `discover_partners` - Find partners
- `analyze_synergy` - Partnership analysis
- `evaluate_jv` - JV feasibility
- `get_partner_portfolio` - Current partners
- `find_complementary_certs` - Cert gaps

### ORACLE
- `forecast_compliance` - Future projections
- `predict_churn_risk` - Employee churn
- `analyze_trends` - Trend analysis
- `workforce_planning` - Planning scenarios
- `risk_assessment` - Overall risk
- `scenario_analysis` - What-if analysis

### ARCHIVIST
- `generate_compliance_report` - Compliance report
- `generate_employee_roster` - Formatted roster
- `generate_certification_package` - Cert docs
- `generate_audit_package` - Audit documentation
- `search_documents` - Document search

## Architecture

```
NEXUS (Orchestrator)
    ├── SENTINEL (Compliance)
    ├── CARTOGRAPH (Geospatial)
    ├── WORKFORCE (Employees)
    ├── CAPTURE (Opportunities)
    ├── ADVOCATE (Regulations)
    ├── GUARDIAN (Audit)
    ├── DIPLOMAT (Partnerships)
    ├── ORACLE (Analytics)
    └── ARCHIVIST (Documents)
```

## License

Proprietary - Visionblox LLC / Zuup Innovation Lab
