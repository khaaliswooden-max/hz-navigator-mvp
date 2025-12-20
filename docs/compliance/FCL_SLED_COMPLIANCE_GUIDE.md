# FCL & SLED RAMP Compliance Guide

> **Version:** 1.0.0  
> **Classification:** CUI // SP-FEDCON  
> **Last Updated:** December 2024

---

## Table of Contents

1. [FCL (Facility Clearance) Requirements](#fcl-facility-clearance-requirements)
2. [State-Level Compliance Programs](#state-level-compliance-programs)
3. [SLED RAMP Implementation](#sled-ramp-implementation)
4. [Control Mapping Matrix](#control-mapping-matrix)
5. [Implementation Checklist](#implementation-checklist)

---

## 1. FCL (Facility Clearance) Requirements

### 1.1 Overview

A Facility Clearance (FCL) is the administrative determination by the Defense Counterintelligence and Security Agency (DCSA) that a contractor facility is eligible to access classified information up to a specified level.

### 1.2 Clearance Levels

| Level | Abbreviation | Access Authorized |
|-------|--------------|-------------------|
| Confidential | C | Confidential information |
| Secret | S | Secret and Confidential |
| Top Secret | TS | Top Secret, Secret, and Confidential |

### 1.3 HZ Navigator FCL Readiness

HZ Navigator is designed for CUI processing but is architecturally ready for FCL expansion:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     HZ NAVIGATOR FCL READINESS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CURRENT STATE                         TARGET STATE                      │
│  ─────────────                         ────────────                      │
│  ┌─────────────────┐                   ┌─────────────────┐              │
│  │                 │                   │                 │              │
│  │  CUI Processing │    ──────────▶    │  FCL (SECRET)   │              │
│  │  CMMC Level 2   │                   │  CMMC Level 2+  │              │
│  │  FedRAMP Mod    │                   │  FedRAMP Mod+   │              │
│  │                 │                   │                 │              │
│  └─────────────────┘                   └─────────────────┘              │
│                                                                          │
│  REQUIREMENTS MET:                     ADDITIONAL REQUIREMENTS:          │
│  ✓ NIST 800-171 controls              □ FSO designation                 │
│  ✓ Zero Trust architecture            □ Personnel clearances             │
│  ✓ Encryption (FIPS 140-2)            □ Physical security               │
│  ✓ Audit logging                      □ DCSA inspection                 │
│  ✓ Access control (RBAC)              □ Classified network (if needed)  │
│  ✓ Incident response                  □ Storage containers              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.4 FCL Process Overview

```
Step 1: Sponsor Contract
        ▼
Step 2: DD Form 254 (Contract Security Classification Specification)
        ▼
Step 3: SF 328 (Certificate Pertaining to Foreign Interests)
        ▼
Step 4: DD Form 441 (DoD Security Agreement)
        ▼
Step 5: DCSA Processing
        ▼
Step 6: Vulnerability Assessment
        ▼
Step 7: FCL Granted
```

### 1.5 NISPOM / 32 CFR Part 117 Requirements

#### Chapter 2: Security Clearances

| Requirement | Description | HZ Navigator Status |
|-------------|-------------|---------------------|
| 2-100 | FOCI Assessment | Ready (WARDEN Agent) |
| 2-200 | Personnel Security Program | Template Ready |
| 2-300 | Key Management Personnel | Identification Process Defined |
| 2-400 | Continuous Evaluation | Integrated with Zero Trust |

#### Chapter 3: Security Training and Briefings

| Requirement | Description | HZ Navigator Status |
|-------------|-------------|---------------------|
| 3-100 | Security Awareness | Training Module Ready |
| 3-102 | Initial Security Briefing | Template Ready |
| 3-103 | Annual Refresher | Scheduled via WARDEN |
| 3-104 | Debriefing Procedures | Process Documented |

#### Chapter 5: Safeguarding Classified Information

| Requirement | Description | HZ Navigator Status |
|-------------|-------------|---------------------|
| 5-100 | General Safeguarding | Controls Implemented |
| 5-200 | Physical Security | Cloud-equivalent (PE inheritance) |
| 5-300 | Access Control | Zero Trust + RBAC |
| 5-400 | Media Protection | Encryption + Sanitization |
| 5-500 | Transmission | TLS 1.3, FIPS 140-2 |
| 5-600 | Information Systems | CMMC L2 Controls |
| 5-700 | Maintenance | Controlled Maintenance Procedures |
| 5-800 | Configuration Management | CM Controls Active |

#### Chapter 8: Information System Security

| Requirement | Description | HZ Navigator Status |
|-------------|-------------|---------------------|
| 8-100 | System Security | NIST 800-171 / CMMC L2 |
| 8-200 | Incident Reporting | CENTURION Agent |
| 8-300 | Media Protection | Encryption + Disposal |
| 8-400 | Network Security | Zero Trust Architecture |

---

## 2. State-Level Compliance Programs

### 2.1 StateRAMP

**StateRAMP** is a nonprofit that provides a standardized approach to security authorizations for state and local governments.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATERAMP OVERVIEW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SECURITY LEVELS                                                         │
│  ───────────────                                                         │
│                                                                          │
│  Category 1 (Low Impact)     │  FedRAMP Low Baseline                    │
│  Category 2 (Moderate)       │  FedRAMP Moderate Baseline               │
│  Category 3 (High Impact)    │  FedRAMP High Baseline                   │
│                                                                          │
│  HZ NAVIGATOR TARGET: Category 2 (Moderate Impact)                      │
│                                                                          │
│  RECIPROCITY                                                             │
│  ───────────                                                             │
│                                                                          │
│  StateRAMP authorization provides reciprocity with:                      │
│  • 20+ participating state governments                                   │
│  • FedRAMP (partial reciprocity)                                         │
│  • Other StateRAMP members                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 TX-RAMP (Texas)

Texas Department of Information Resources (DIR) cloud certification program.

| Requirement | Description | HZ Navigator Status |
|-------------|-------------|---------------------|
| DIR Certification | Required for state contracts | Ready |
| TAC 202 | Security Standards | Compliant |
| TAC 206 | Vendor Cybersecurity | Compliant |
| Vendor Assessment | DIR vendor assessment | Prepared |

**TX-RAMP Levels:**
- Level 1: Low Risk
- Level 2: Moderate Risk (HZ Navigator Target)
- Level 3: High Risk

### 2.3 California Requirements

| Program | Description | HZ Navigator Status |
|---------|-------------|---------------------|
| CCPA | California Consumer Privacy Act | Compliant |
| CPRA | California Privacy Rights Act | Compliant |
| CalOES | Emergency Services Requirements | Ready |
| CDT Standards | State Technology Standards | Compliant |

### 2.4 New York Requirements

| Program | Description | HZ Navigator Status |
|---------|-------------|---------------------|
| NY SHIELD Act | Data Security Requirements | Compliant |
| ITS Policy | State IT Security Policies | Compliant |
| NYDFS (if applicable) | Financial Services Cybersecurity | Ready |

### 2.5 Other State Programs

| State | Program | HZ Navigator Status |
|-------|---------|---------------------|
| FL | FL Digital Service Standards | Ready |
| VA | VITA Security Standards | Ready |
| OH | IT Security Requirements | Ready |
| PA | Commonwealth IT Policy | Ready |
| IL | BIPA (Biometric) | N/A |

---

## 3. SLED RAMP Implementation

### 3.1 Education Sector (FERPA)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FERPA COMPLIANCE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PROTECTED DATA TYPES                                                    │
│  ────────────────────                                                    │
│  • Student Education Records                                             │
│  • Personally Identifiable Information (PII)                             │
│  • Directory Information (with opt-out)                                  │
│  • Grades, Transcripts, Financial Aid                                    │
│                                                                          │
│  HZ NAVIGATOR CONTROLS                                                   │
│  ─────────────────────                                                   │
│  ✓ Role-based access (school official + legitimate interest)            │
│  ✓ Audit logging (who accessed what, when)                              │
│  ✓ Encryption at rest and in transit                                    │
│  ✓ Data minimization                                                    │
│  ✓ Parent/student access rights                                         │
│  ✓ Annual FERPA notification support                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Local Government (CJIS)

For HUBZone tracking involving criminal justice agencies:

| CJIS Requirement | Description | HZ Navigator Status |
|------------------|-------------|---------------------|
| Personnel Security | Background checks for personnel | Process Ready |
| Access Control | Two-factor authentication | Implemented |
| Auditing | Comprehensive audit trail | Implemented |
| Encryption | Advanced encryption standard | AES-256 |
| Policy Compliance | CJIS Security Policy | Compliant |

### 3.3 Healthcare (HIPAA)

While HZ Navigator doesn't process PHI directly, healthcare clients require:

| HIPAA Requirement | Description | HZ Navigator Status |
|-------------------|-------------|---------------------|
| Administrative Safeguards | Policies and procedures | Documented |
| Physical Safeguards | Cloud provider inheritance | Covered |
| Technical Safeguards | Access, audit, encryption | Implemented |
| BAA Capability | Business Associate Agreement | Template Ready |

---

## 4. Control Mapping Matrix

### 4.1 Cross-Framework Mapping

| Control Area | FedRAMP | CMMC | StateRAMP | TX-RAMP | CJIS | FERPA |
|--------------|---------|------|-----------|---------|------|-------|
| Access Control | AC-1:25 | AC.L2 | AC-1:25 | AC-1:25 | 5.5 | §99.31 |
| Audit | AU-1:16 | AU.L2 | AU-1:16 | AU-1:16 | 5.4 | §99.32 |
| Authentication | IA-1:12 | IA.L2 | IA-1:12 | IA-1:12 | 5.6.2.2 | - |
| Encryption | SC-8,13,28 | SC.L2 | SC-8,13,28 | SC-8,13,28 | 5.10 | §99.35 |
| Incident Response | IR-1:10 | IR.L2 | IR-1:10 | IR-1:10 | 5.3 | §99.33 |
| Risk Assessment | RA-1:6 | RA.L2 | RA-1:6 | RA-1:6 | 5.2 | - |

### 4.2 HZ Navigator Implementation Status

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CONTROL IMPLEMENTATION STATUS                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEGEND: ████ Implemented  ░░░░ Partial  ○○○○ Planned                      │
│                                                                             │
│  Access Control      [████████████████████░░░░]  92%                       │
│  Audit & Accountab.  [████████████████████████]  100%                      │
│  Authentication      [████████████████████████]  100%                      │
│  Configuration Mgmt  [████████████████████░░░░]  88%                       │
│  Incident Response   [████████████████████████]  100%                      │
│  Media Protection    [████████████████████░░░░]  90%                       │
│  Personnel Security  [████████████████░░░░░░░░]  75%                       │
│  Physical Security   [████████████████████████]  100% (inherited)          │
│  Risk Assessment     [████████████████████████]  100%                      │
│  System & Comms      [████████████████████████]  96%                       │
│  System Integrity    [████████████████████░░░░]  92%                       │
│                                                                             │
│  OVERALL COMPLIANCE SCORE: 94%                                              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Checklist

### 5.1 FCL Preparation Checklist

- [ ] **Organizational Preparation**
  - [ ] Identify sponsoring government agency
  - [ ] Obtain DD Form 254 from contracting officer
  - [ ] Designate FSO candidate
  - [ ] Identify Key Management Personnel (KMP)

- [ ] **FOCI Assessment**
  - [ ] Complete foreign ownership analysis
  - [ ] Document all foreign relationships
  - [ ] Prepare SF 328
  - [ ] Determine if FOCI mitigation needed

- [ ] **Documentation**
  - [ ] Gather Articles of Incorporation
  - [ ] Compile bylaws
  - [ ] Create organizational chart
  - [ ] List all officers, directors, partners

- [ ] **Security Program**
  - [ ] Draft Standard Practice Procedures (SPP)
  - [ ] Establish insider threat program
  - [ ] Create training curriculum
  - [ ] Document incident response procedures

- [ ] **Personnel Security**
  - [ ] Initiate KMP clearance processing
  - [ ] Complete SF 86 for all KMP
  - [ ] Enroll in Continuous Evaluation

- [ ] **DCSA Submission**
  - [ ] Submit via NISS portal
  - [ ] Track processing status
  - [ ] Prepare for vulnerability assessment
  - [ ] Address any findings

### 5.2 StateRAMP Checklist

- [ ] **Pre-Assessment**
  - [ ] Complete StateRAMP Readiness Assessment
  - [ ] Identify security level (Cat 1, 2, or 3)
  - [ ] Review reciprocity requirements

- [ ] **Documentation**
  - [ ] Complete System Security Plan (SSP)
  - [ ] Document control implementation
  - [ ] Prepare evidence packages

- [ ] **Assessment**
  - [ ] Engage StateRAMP-approved 3PAO
  - [ ] Complete security assessment
  - [ ] Remediate findings

- [ ] **Authorization**
  - [ ] Submit authorization package
  - [ ] Obtain StateRAMP Ready designation
  - [ ] Achieve StateRAMP Authorized status

### 5.3 TX-RAMP Checklist

- [ ] **Registration**
  - [ ] Register with Texas DIR
  - [ ] Complete vendor security questionnaire
  - [ ] Identify TX-RAMP level

- [ ] **Assessment**
  - [ ] Complete self-assessment
  - [ ] Engage approved assessor (if Level 2/3)
  - [ ] Submit assessment results

- [ ] **Certification**
  - [ ] Obtain TX-RAMP certification
  - [ ] List on DIR Cooperative Contracts
  - [ ] Maintain annual recertification

---

## 6. Agent Support

HZ Navigator provides automated compliance support through specialized agents:

### CENTURION Agent
- Security posture monitoring
- CMMC/FedRAMP compliance tracking
- Automated control testing
- Real-time security alerts

### WARDEN Agent
- FCL readiness assessment
- Personnel security management
- FOCI monitoring
- DCSA submission preparation

### SENTINEL Agent
- Continuous compliance monitoring
- HUBZone residency tracking
- Audit trail maintenance
- Grace period management

### GUARDIAN Agent
- Audit defense preparation
- Evidence package generation
- Documentation gap analysis
- Compliance history reporting

---

## 7. Contacts and Resources

### DCSA (Defense Counterintelligence and Security Agency)
- Website: dcsa.mil
- NISS Portal: niss.dcsa.mil
- Industrial Security: 1-888-282-7682

### StateRAMP
- Website: stateramp.org
- Member Portal: members.stateramp.org

### Texas DIR
- Website: dir.texas.gov
- TX-RAMP: dir.texas.gov/View-About-DIR/Information-Security

### FedRAMP
- Website: fedramp.gov
- Marketplace: marketplace.fedramp.gov

---

*Document Classification: CUI // SP-FEDCON*  
*Authorized Distribution: Internal + Authorized Partners*
