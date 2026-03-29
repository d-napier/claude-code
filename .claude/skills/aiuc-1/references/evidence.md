# AIUC-1 Evidence Guide

## Six Evidence Categories

### 1. Documentation Evidence
Policy documents, procedures, decision records.

**Examples**: Terms of Service, Privacy Policies, Data Processing Agreements, risk taxonomies, internal policies, acceptable use policies.

### 2. Technical Implementation Evidence
Code screenshots, configuration files, system demonstrations showing controls are actually deployed.

**Formats**: Code implementing data collection restrictions, configuration file settings, screenshots of code filtering inputs.

**Key requirement**: Controls must be actually implemented in production, not merely planned.

### 3. Operational Practice Evidence
Meeting notes, change logs, review records, audit trails.

**Examples**: Quarterly review documentation, incident tracking records, decision logs with timestamps.

### 4. Third-Party Evaluation Evidence
Must include:
- Risk taxonomy tested
- Methodology used
- Findings
- Remediation timelines with documentation

### 5. Log and Monitoring Evidence
System logs, audit trails, monitoring dashboards.

**Examples**: Screenshot of logging configuration, monitoring dashboard, example log entries with timestamps.

### 6. Product/User-Facing Evidence
Screenshots demonstrating what users see.

**Examples**: Warnings, disclosures, interface elements indicating AI involvement, consent mechanisms.

## Evidence Submission by Tag Type

| Tag | What to Submit |
|-----|---------------|
| **Config** | Screenshots of actual deployment showing settings active in production |
| **Logs** | System logs proving activities occurred, with timestamps and relevant metadata |
| **Demonstration** | Screenshots or recordings showing user-facing features and system responses |
| **Report** | Formal assessments from qualified third parties documenting scope, methodology, findings, and remediation |

## Key Principles

- Controls must be **actually implemented**, not merely planned
- Technical controls must be **deployed in production**
- Policies must be **documented and communicated**
- Monitoring/logging must be **actively capturing relevant events**
- Reviews and approvals must be **documented with rationale and timestamps**
- Third-party assessments must be completed **quarterly** for high-risk areas
- Acceptable tools for evidence: Jira, GitHub, Datadog, etc.

## Evidence by Domain (Quick Reference)

| Domain | Primary Evidence Types |
|--------|----------------------|
| Data & Privacy (A) | Policy docs (ToS, DPA, Privacy Policy), code (filtering, isolation, redaction), access control configs |
| Security (B) | Third-party test reports, filtering code, rate limiting configs, RBAC implementation, encryption settings |
| Safety (C) | Risk taxonomy doc, test plans/results, content filtering code, third-party evaluation reports |
| Reliability (D) | Hallucination prevention code, tool call authorization code, third-party test reports |
| Accountability (E) | Failure plans, approval records, vendor assessments, logging configs, disclosure UI screenshots |
| Society (F) | Content filtering code, policy documents, CBRN prevention controls |
