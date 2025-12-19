# HZ Navigator - Feedback Loop & Stress Testing System

## PART 1: FEEDBACK LOOP ARCHITECTURE

### The Recursive Improvement Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HZ NAVIGATOR FEEDBACK LOOP                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │  AGENT   │───▶│  STRESS  │───▶│ FEEDBACK │───▶│  BUILD   │            │
│   │ EXECUTION│    │   TEST   │    │  CAPTURE │    │ ITERATION│            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │                                               │                   │
│        │                                               │                   │
│        └───────────────────────────────────────────────┘                   │
│                          RECURSIVE LOOP                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feedback Categories

| Category | Source | Captured By | Cycles Into |
|----------|--------|-------------|-------------|
| **Performance** | Agent execution times | NEXUS orchestrator | Code optimization |
| **Accuracy** | Verification results | Agent-specific logs | Algorithm tuning |
| **User Behavior** | UI interactions | Analytics events | UX improvements |
| **Edge Cases** | Stress test failures | Test harness | New test coverage |
| **Compliance** | SBA regulation changes | ADVOCATE agent | Rule engine updates |

---

## PART 2: STRESS TESTING GUIDELINES

### Testing Philosophy

> **"If it can break, it should break in testing, not production."**

Each agent is stress-tested against realistic, grounded scenarios based on actual HUBZone certification challenges that small businesses face.

---

## SENTINEL - Compliance Monitor Stress Tests

### Scenario S1: The Cliff Edge
**Context:** Company has exactly 35% compliance (7/20 employees)

```typescript
const scenario_S1 = {
  name: 'cliff_edge_compliance',
  description: 'Test behavior at exact 35% threshold',
  setup: {
    totalEmployees: 20,
    hubzoneEmployees: 7,
    expectedPercentage: 35.0
  },
  tests: [
    {
      action: 'terminate_hubzone_employee',
      expected: {
        newPercentage: 31.58,  // 6/19
        alertSeverity: 'critical',
        alertType: 'compliance_breach',
        gracePeriodCheck: true
      }
    },
    {
      action: 'hire_non_hubzone',
      expected: {
        newPercentage: 33.33,  // 7/21
        alertSeverity: 'warning',
        alertType: 'compliance_drop'
      }
    }
  ],
  successCriteria: {
    alertGenerated: true,
    correctCalculation: true,
    executionTime: '<500ms'
  }
};
```

### Scenario S2: Mass Termination Event
**Context:** Economic downturn forces 40% workforce reduction

```typescript
const scenario_S2 = {
  name: 'mass_termination',
  description: 'Layoff scenario maintaining HUBZone balance',
  setup: {
    totalEmployees: 50,
    hubzoneEmployees: 22,  // 44%
    plannedTerminations: 20  // 40% reduction
  },
  tests: [
    {
      action: 'simulate_proportional_layoff',
      // If layoffs are proportional: 30 remain, ~13 HUBZone = 43%
      expected: { compliant: true }
    },
    {
      action: 'simulate_hubzone_heavy_layoff',
      // If 15 HUBZone employees laid off: 30 remain, 7 HUBZone = 23%
      expected: { 
        compliant: false,
        alertSeverity: 'critical',
        recommendedAction: 'rebalance_terminations'
      }
    }
  ]
};
```

### Scenario S3: Legacy Employee Limit
**Context:** Company has 4 legacy employees (max allowed)

```typescript
const scenario_S3 = {
  name: 'legacy_limit_reached',
  description: 'Test legacy employee constraints',
  setup: {
    totalEmployees: 15,
    hubzoneEmployees: 6,  // 40%
    legacyEmployees: 4,   // MAX
    currentResidents: 2
  },
  tests: [
    {
      action: 'current_resident_moves_out',
      expected: {
        canPromoteToLegacy: false,
        warning: 'legacy_limit_reached',
        newCompliance: 33.33  // (4 legacy only) / 15
      }
    },
    {
      action: 'attempt_add_fifth_legacy',
      expected: {
        rejected: true,
        errorCode: 'LEGACY_LIMIT_EXCEEDED'
      }
    }
  ]
};
```

### Scenario S4: Grace Period Tracking
**Context:** Company won HUBZone contract 10 months ago, currently at 32%

```typescript
const scenario_S4 = {
  name: 'grace_period_expiring',
  description: 'Track grace period with insufficient compliance',
  setup: {
    gracePeriodStart: '2024-02-15',
    gracePeriodEnd: '2025-02-15',
    currentDate: '2024-12-15',  // 2 months remaining
    currentCompliance: 32,
    attemptToMaintainDocumented: 3
  },
  tests: [
    {
      action: 'check_grace_period_status',
      expected: {
        daysRemaining: 62,
        requiredHires: 2,
        riskLevel: 'high',
        alertType: 'grace_period_expiring'
      }
    },
    {
      action: 'simulate_no_action',
      expected: {
        projectedOutcome: 'certification_loss',
        sbaNotificationRequired: true
      }
    }
  ]
};
```

---

## CARTOGRAPH - Geospatial Intelligence Stress Tests

### Scenario C1: Address Ambiguity
**Context:** Employee provides incomplete or ambiguous address

```typescript
const scenario_C1 = {
  name: 'ambiguous_address',
  description: 'Handle addresses that geocode to multiple locations',
  tests: [
    {
      input: '123 Main St',  // No city/state
      expected: {
        status: 'incomplete',
        requiredFields: ['city', 'state'],
        hubzoneStatus: null
      }
    },
    {
      input: '123 Main Street, Springfield',  // 30+ Springfields in US
      expected: {
        status: 'ambiguous',
        possibleMatches: '>5',
        requiredField: 'state'
      }
    },
    {
      input: '123 Main St, Apt 4B, Washington, DC 20001',
      expected: {
        status: 'verified',
        normalizedAddress: '123 MAIN ST APT 4B, WASHINGTON, DC 20001',
        geocodeConfidence: '>0.95'
      }
    }
  ]
};
```

### Scenario C2: HUBZone Boundary Edge
**Context:** Address is on the exact boundary of a HUBZone

```typescript
const scenario_C2 = {
  name: 'boundary_edge_case',
  description: 'Address on census tract boundary',
  setup: {
    address: '500 Border Road, Anytown, TX 75001',
    censusTract: '48113012500',  // Qualified
    adjacentTract: '48113012600'  // Not qualified
  },
  tests: [
    {
      action: 'verify_with_standard_geocoding',
      expected: {
        censusTract: '48113012500',
        isHubzone: true,
        confidenceNote: 'boundary_proximity'
      }
    },
    {
      action: 'verify_with_rooftop_precision',
      expected: {
        censusTract: '48113012500',
        isHubzone: true,
        confidence: 0.99
      }
    }
  ],
  feedback: {
    ifDiscrepancy: 'flag_for_manual_review',
    logFields: ['geocodeMethod', 'confidenceScore', 'nearestBoundary']
  }
};
```

### Scenario C3: Map Redesignation Impact
**Context:** Annual HUBZone map update removes a census tract

```typescript
const scenario_C3 = {
  name: 'redesignation_impact',
  description: 'Handle employees losing HUBZone status due to map change',
  setup: {
    affectedTract: '06037123456',
    employeesInTract: 5,
    totalHubzoneEmployees: 12,
    totalEmployees: 30
  },
  tests: [
    {
      action: 'simulate_map_change',
      expected: {
        beforeChange: { hubzone: 12, percentage: 40 },
        afterChange: { hubzone: 7, percentage: 23.33 },
        impactSeverity: 'critical',
        affectedEmployees: 5,
        actionRequired: true
      }
    },
    {
      action: 'check_grandfather_eligibility',
      expected: {
        grandfatherPeriod: null,  // No grandfathering in current rules
        recommendation: 'hire_replacement_hubzone_residents'
      }
    }
  ]
};
```

### Scenario C4: Puerto Rico / Territory Handling
**Context:** Employee in US territory with different address format

```typescript
const scenario_C4 = {
  name: 'territory_address',
  description: 'Handle Puerto Rico and other territory addresses',
  tests: [
    {
      input: 'Calle Luna 123, San Juan, PR 00901',
      expected: {
        status: 'verified',
        country: 'US',
        territory: 'PR',
        hubzoneEligible: true  // PR has HUBZone areas
      }
    },
    {
      input: 'P.O. Box 5678, Hagatna, GU 96910',
      expected: {
        status: 'verified',
        warning: 'po_box_not_residential',
        requiresPhysicalAddress: true
      }
    }
  ]
};
```

---

## WORKFORCE - Employee Intelligence Stress Tests

### Scenario W1: Rapid Growth
**Context:** Startup winning contracts and hiring 50 employees in 3 months

```typescript
const scenario_W1 = {
  name: 'rapid_growth',
  description: 'Maintain compliance during explosive growth',
  setup: {
    initialEmployees: 10,
    initialHubzone: 5,  // 50%
    targetHires: 50,
    timeframe: '90_days'
  },
  tests: [
    {
      action: 'simulate_batch_hire_mixed',
      // If only 20% of new hires are HUBZone: 5 + 10 = 15 HZ / 60 total = 25%
      params: { hubzoneHires: 10, nonHubzoneHires: 40 },
      expected: {
        finalPercentage: 25,
        compliant: false,
        warningPoint: 'hire_#35',  // When did we drop below 35%?
        recommendedAction: 'pause_non_hubzone_hiring'
      }
    },
    {
      action: 'calculate_minimum_hubzone_hires',
      expected: {
        minimumHubzoneHires: 18,  // To maintain 35%: (5+x)/(60) >= 0.35
        recommendedBuffer: 22     // To maintain 40%
      }
    }
  ]
};
```

### Scenario W2: 90-Day Residency Rule
**Context:** New 2025 rule requiring 90-day residency before counting

```typescript
const scenario_W2 = {
  name: 'residency_waiting_period',
  description: 'Handle 90-day residency requirement',
  setup: {
    newHire: {
      name: 'John Smith',
      hireDate: '2025-01-15',
      moveInDate: '2025-01-10',  // Moved to HUBZone 5 days before hire
      address: '123 HUBZone Ave, Washington, DC 20001'
    }
  },
  tests: [
    {
      action: 'count_on_hire_date',
      expected: {
        countsAsHubzone: false,
        reason: 'residency_under_90_days',
        willCountOn: '2025-04-10'
      }
    },
    {
      action: 'count_after_90_days',
      expected: {
        countsAsHubzone: true,
        effectiveDate: '2025-04-10'
      }
    }
  ],
  compliance_impact: {
    description: 'Calculate compliance both with and without this employee',
    requiresDualTracking: true
  }
};
```

### Scenario W3: Remote Worker Classification
**Context:** Employee works remotely from HUBZone but company HQ is not in HUBZone

```typescript
const scenario_W3 = {
  name: 'remote_worker_hubzone',
  description: 'Classify remote workers for HUBZone compliance',
  setup: {
    companyHQ: '1000 Tech Park, Cupertino, CA 95014',  // Not HUBZone
    employeeResidence: '500 Rural Road, Appalachia, KY 40801'  // HUBZone
  },
  tests: [
    {
      action: 'verify_employee_status',
      expected: {
        countsAsHubzone: true,  // Residence determines status
        note: 'remote_work_does_not_affect_residency_status'
      }
    }
  ]
};
```

---

## CAPTURE - Opportunity Scanner Stress Tests

### Scenario CA1: High-Volume SAM.gov Scan
**Context:** Scan returns 500+ opportunities

```typescript
const scenario_CA1 = {
  name: 'high_volume_scan',
  description: 'Process large number of opportunities efficiently',
  setup: {
    searchCriteria: {
      setAsides: ['hubzone', 'hubzone_sole', 'small_business'],
      naicsCodes: ['541511', '541512', '541519', '541330', '541611'],
      minValue: 50000
    }
  },
  tests: [
    {
      action: 'execute_scan',
      expected: {
        executionTime: '<30s',
        opportunitiesProcessed: '>100',
        duplicatesRemoved: true,
        matchScoresCalculated: true
      }
    },
    {
      action: 'prioritize_results',
      expected: {
        hubzoneSetAsidesFirst: true,
        sortedByMatchScore: true,
        top20Returned: true
      }
    }
  ]
};
```

### Scenario CA2: Bid/No-Bid Edge Case
**Context:** Opportunity looks good but deadline is in 5 days

```typescript
const scenario_CA2 = {
  name: 'tight_deadline',
  description: 'Handle attractive opportunity with insufficient time',
  setup: {
    opportunity: {
      title: 'Cloud Migration Services',
      value: 2000000,
      setAside: 'hubzone',
      naics: '541512',
      deadline: 'now + 5 days',
      matchScore: 92
    }
  },
  tests: [
    {
      action: 'bid_no_bid_analysis',
      expected: {
        decision: 'no_bid',
        primaryReason: 'insufficient_preparation_time',
        alternativeRecommendation: 'track_for_recompete',
        overrideOption: true
      }
    }
  ]
};
```

### Scenario CA3: Conflicting Opportunities
**Context:** Two great opportunities with overlapping deadlines

```typescript
const scenario_CA3 = {
  name: 'opportunity_conflict',
  description: 'Prioritize between competing opportunities',
  setup: {
    opportunity1: {
      value: 500000,
      setAside: 'hubzone_sole',
      winProbability: 85,
      deadline: '2025-02-15'
    },
    opportunity2: {
      value: 2000000,
      setAside: 'small_business',
      winProbability: 40,
      deadline: '2025-02-20'
    }
  },
  tests: [
    {
      action: 'calculate_expected_value',
      expected: {
        opp1ExpectedValue: 425000,  // 500K * 85%
        opp2ExpectedValue: 800000,  // 2M * 40%
        recommendation: 'pursue_both_if_resources_allow'
      }
    },
    {
      action: 'resource_constraint_analysis',
      params: { proposalTeamCapacity: 1 },
      expected: {
        recommendation: 'prioritize_opportunity_2',
        rationale: 'higher_expected_value'
      }
    }
  ]
};
```

---

## GUARDIAN - Audit Defense Stress Tests

### Scenario G1: SBA Program Examination
**Context:** Receive SBA notice of examination with 10-day document request

```typescript
const scenario_G1 = {
  name: 'sba_examination',
  description: 'Generate complete audit package under time pressure',
  setup: {
    noticeDate: 'today',
    responseDeadline: 'today + 10 days',
    requestedDocuments: [
      'Employee roster with addresses',
      'Compliance calculations for past 12 months',
      'Address verification evidence',
      'Principal office documentation',
      'Attempt to maintain documentation'
    ]
  },
  tests: [
    {
      action: 'generate_evidence_package',
      expected: {
        executionTime: '<5 minutes',
        completeness: 100,
        documentsGenerated: 5,
        formatCompliance: 'sba_standard'
      }
    },
    {
      action: 'identify_gaps',
      expected: {
        gapsIdentified: true,
        urgentActionItems: 'listed',
        mitigationStrategies: 'provided'
      }
    }
  ]
};
```

### Scenario G2: Missing Documentation
**Context:** 3 employees have no address verification in past 6 months

```typescript
const scenario_G2 = {
  name: 'documentation_gaps',
  description: 'Handle incomplete audit trail',
  setup: {
    totalEmployees: 25,
    verifiedWithin90Days: 20,
    verifiedWithin180Days: 22,
    neverVerified: 3
  },
  tests: [
    {
      action: 'assess_audit_readiness',
      expected: {
        readinessScore: 75,  // Penalized for gaps
        criticalGaps: 1,
        urgentActions: ['verify_3_employees']
      }
    },
    {
      action: 'generate_remediation_plan',
      expected: {
        priority1: 'immediate_verification_of_3_employees',
        estimatedTime: '2_hours',
        complianceRisk: 'medium'
      }
    }
  ]
};
```

---

## ORACLE - Predictive Analytics Stress Tests

### Scenario O1: Black Swan Event
**Context:** Major HUBZone map change affects 30% of workforce

```typescript
const scenario_O1 = {
  name: 'black_swan_map_change',
  description: 'Predict and respond to major external shock',
  setup: {
    currentCompliance: 42,
    affectedEmployees: 6,
    totalHubzone: 21,
    totalEmployees: 50
  },
  tests: [
    {
      action: 'simulate_map_change',
      expected: {
        newCompliance: 30,  // (21-6)/50
        breachSeverity: 'critical',
        timeToRecover: 'estimated',
        hiresNeeded: 5  // To get back to 35%
      }
    },
    {
      action: 'generate_recovery_plan',
      expected: {
        phases: [
          'immediate_hiring_push',
          'retention_focus',
          'long_term_diversification'
        ]
      }
    }
  ]
};
```

### Scenario O2: Seasonal Workforce Fluctuation
**Context:** Construction company with seasonal employment patterns

```typescript
const scenario_O2 = {
  name: 'seasonal_fluctuation',
  description: 'Maintain compliance through seasonal workforce changes',
  setup: {
    peakSeasonEmployees: 100,
    offSeasonEmployees: 40,
    peakHubzone: 45,
    offSeasonHubzone: 18
  },
  tests: [
    {
      action: 'calculate_seasonal_compliance',
      expected: {
        peakCompliance: 45,
        offSeasonCompliance: 45,
        consistentCompliance: true
      }
    },
    {
      action: 'identify_risk_periods',
      expected: {
        riskPeriod: 'transition_months',
        recommendation: 'stagger_seasonal_layoffs'
      }
    }
  ]
};
```

---

## DIPLOMAT - Partnership Intelligence Stress Tests

### Scenario D1: Teaming Partner Due Diligence
**Context:** Potential partner has questionable compliance history

```typescript
const scenario_D1 = {
  name: 'partner_due_diligence',
  description: 'Evaluate partner with compliance concerns',
  setup: {
    partner: {
      name: 'XYZ Technologies',
      certifications: ['8(a)', 'HUBZone'],
      pastPerformanceRating: 'Satisfactory',
      knownIssues: ['past_hubzone_compliance_violation']
    }
  },
  tests: [
    {
      action: 'analyze_synergy',
      expected: {
        synergyScore: 'calculated',
        riskFlags: ['compliance_history'],
        recommendation: 'proceed_with_caution',
        dueDiligenceRequired: true
      }
    }
  ]
};
```

---

## PART 3: FEEDBACK CAPTURE & RECURSIVE BUILD INTEGRATION

### Feedback Log Schema

```typescript
interface FeedbackLog {
  id: string;
  timestamp: Date;
  
  // Source identification
  source: {
    type: 'stress_test' | 'user_interaction' | 'agent_execution' | 'external_api';
    agentId: string;
    taskType: string;
    scenarioId?: string;
  };
  
  // Input/Output capture
  execution: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    executionTimeMs: number;
    success: boolean;
    errorMessage?: string;
  };
  
  // Feedback classification
  feedback: {
    category: 'performance' | 'accuracy' | 'ux' | 'edge_case' | 'bug';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    expectedBehavior?: string;
    actualBehavior: string;
  };
  
  // Resolution tracking
  resolution: {
    status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
    assignedTo?: string;
    buildVersion?: string;
    commitHash?: string;
    resolvedAt?: Date;
    verifiedBy?: string;
  };
  
  // Impact assessment
  impact: {
    usersAffected?: number;
    complianceRisk: boolean;
    dataIntegrityRisk: boolean;
    securityRisk: boolean;
  };
}
```

### Recursive Build Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEEDBACK CAPTURE LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STRESS TEST ──┐                                               │
│                │                                               │
│  USER ACTION ──┼──▶ FEEDBACK_COLLECTOR ──▶ FEEDBACK_LOG DB    │
│                │            │                                   │
│  AGENT ERROR ──┘            ▼                                   │
│                     CLASSIFICATION_ENGINE                       │
│                            │                                   │
│              ┌─────────────┼─────────────┐                     │
│              ▼             ▼             ▼                     │
│         CRITICAL       PATTERN       LOW                       │
│         (immediate)    (batch)       (backlog)                 │
│              │             │             │                     │
│              ▼             ▼             ▼                     │
│         HOTFIX        SPRINT        QUARTERLY                  │
│         BRANCH        PLANNING      REVIEW                     │
│              │             │             │                     │
│              └─────────────┼─────────────┘                     │
│                            ▼                                   │
│                      BUILD ITERATION                           │
│                            │                                   │
│                            ▼                                   │
│                    DEPLOYMENT & TEST                           │
│                            │                                   │
│                            ▼                                   │
│                    FEEDBACK VERIFICATION                       │
│                            │                                   │
│                            └──────────────▶ (LOOP)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 4: FEEDBACK LOG FORMAT

### Standard Log Entry Format

```json
{
  "logId": "FL-20251219-001",
  "timestamp": "2025-12-19T14:32:00Z",
  "source": {
    "type": "stress_test",
    "agentId": "sentinel",
    "taskType": "calculate_compliance",
    "scenarioId": "S1_cliff_edge"
  },
  "execution": {
    "input": {
      "organizationId": "org-test-001",
      "includeProjections": true
    },
    "output": {
      "percentage": 35.0,
      "compliant": true,
      "alerts": []
    },
    "executionTimeMs": 127,
    "success": true
  },
  "feedback": {
    "category": "edge_case",
    "severity": "medium",
    "description": "At exactly 35%, no warning generated about thin margin",
    "expectedBehavior": "Generate 'thin_margin' warning when at exactly threshold",
    "actualBehavior": "No warning generated - marked as compliant only"
  },
  "resolution": {
    "status": "resolved",
    "buildVersion": "1.2.3",
    "commitHash": "abc123def",
    "resolvedAt": "2025-12-20T09:00:00Z",
    "changeDescription": "Added 'thin_margin' alert when compliance is between 35-37%"
  },
  "impact": {
    "usersAffected": 0,
    "complianceRisk": true,
    "dataIntegrityRisk": false,
    "securityRisk": false
  }
}
```

### Log Aggregation Dashboard Fields

| Field | Type | Purpose |
|-------|------|---------|
| `total_feedback_items` | count | Total feedback captured |
| `open_critical` | count | Unresolved critical issues |
| `mttr_critical` | duration | Mean time to resolve critical |
| `feedback_by_agent` | breakdown | Distribution across agents |
| `feedback_by_category` | breakdown | Performance vs accuracy vs UX |
| `resolution_rate_7d` | percentage | Items resolved in last 7 days |
| `recurring_patterns` | list | Issues that reoccur |

---

## PART 5: IMPLEMENTATION - FEEDBACK COLLECTOR AGENT

This is the 11th agent that manages the feedback loop itself.

