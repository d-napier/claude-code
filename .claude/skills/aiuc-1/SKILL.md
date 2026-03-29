---
name: aiuc-1
description: >
  Comprehensive skill for working with the AIUC-1 AI Agent Security Standard — the world's first
  certification framework for AI agent security, safety, and reliability, developed with 100+ Fortune 500
  CISOs. Use this skill whenever the user mentions AIUC-1, AI agent certification, AI agent compliance,
  AI safety standards, AI security audits, agentic AI governance, or wants to prepare an AI system for
  enterprise deployment. Also trigger when the user asks about gap analysis for AI agents, AI agent
  security controls, prompt injection testing requirements, hallucination prevention controls, AI vendor
  due diligence, AI failure planning, or mapping existing compliance (SOC 2, ISO 42001, NIST AI RMF,
  EU AI Act, OWASP) to AI-specific requirements. If the user is building or deploying AI agents and
  mentions security, safety, reliability, accountability, data privacy, or societal risk — this skill
  applies.
---

# AIUC-1: AI Agent Security, Safety & Reliability Standard

AIUC-1 is the first certification standard purpose-built for AI agents. Think of it as "SOC 2 for AI" —
it provides testable, auditable controls across six domains that enterprises use to evaluate whether an
AI agent is safe to deploy. Developed by the Artificial Intelligence Underwriting Company with 100+
Fortune 500 CISOs and contributors from Stanford, MIT, Cisco, MITRE, Microsoft, and others.

**Official site:** https://www.aiuc-1.com/

## What You Can Do With This Skill

1. **Gap Analysis** — Assess an AI agent's architecture, codebase, or documentation against AIUC-1 controls and identify what's missing
2. **Certification Prep** — Generate checklists, documentation templates, and evidence guides for AIUC-1 certification
3. **Compliance Documentation** — Draft policies, failure plans, risk taxonomies, and transparency reports aligned to AIUC-1
4. **Code Review** — Review agent code for AIUC-1 compliance (input filtering, PII protection, tool call restrictions, output safeguards)
5. **Framework Crosswalks** — Map existing SOC 2, ISO 42001, NIST AI RMF, EU AI Act, or OWASP controls to AIUC-1 requirements
6. **Remediation Plans** — Prioritize gaps and create actionable implementation roadmaps

## The Six Domains

AIUC-1 organizes 51 controls (across mandatory and optional) into six domains. Each control has an ID
prefix matching its domain:

| Domain | Prefix | Controls | Focus |
|--------|--------|----------|-------|
| Data & Privacy | A | 7 | Data policies, PII protection, IP safeguards, cross-customer isolation |
| Security | B | 9 | Adversarial testing, prompt injection defense, access controls, endpoint protection |
| Safety | C | 12 | Risk taxonomy, harmful/out-of-scope output prevention, third-party testing |
| Reliability | D | 4 | Hallucination prevention, tool call restrictions, third-party testing |
| Accountability | E | 17 | Failure plans, governance, vendor due diligence, logging, disclosure |
| Society | F | 2 | Cyber misuse prevention, catastrophic (CBRN) risk controls |

For the full control list with IDs, descriptions, and evidence requirements, read `references/controls.md`.

## How to Approach Each Task

### Gap Analysis

When a user wants to assess their AI agent against AIUC-1:

1. **Understand the agent** — Ask about: what it does, who uses it (internal/external), what modalities it supports (text/voice/image/video), whether it has tool/API access, what data it handles, and what compliance they already have
2. **Determine scope** — Use the scoping rules in `references/scoping.md` to figure out which controls apply. Simple internal agents need ~40 controls; complex external agents with sensitive data need all 65 mandatory controls
3. **Read the full control list** from `references/controls.md`
4. **Assess each applicable control** — For each, determine: implemented / partially implemented / not implemented / not applicable
5. **Produce a gap report** organized by domain with:
   - Control ID and name
   - Current status
   - What's missing
   - Priority (critical / high / medium / low)
   - Recommended remediation steps

### Certification Preparation

When helping prepare for AIUC-1 certification:

1. Run a gap analysis first (above)
2. Read `references/certification.md` for the 4-phase process and timeline
3. Generate an evidence checklist — for each control, specify what documentation or technical evidence is needed (see `references/evidence.md`)
4. Draft any missing policy documents using the templates and guidance in the controls reference
5. Create a project plan with the 4 phases: Scoping & Kick-off (1-2 weeks), Gather Evidence (3-5 weeks), Technical Testing (1-3 weeks), Finalize Audit

### Compliance Documentation

When drafting AIUC-1-aligned documents:

- **AI Failure Plans** (E001-E003): Include accountable owners, notification procedures, remediation steps, and third-party support contacts (legal, PR, insurers)
- **Risk Taxonomy** (C001): Cover harmful outputs, out-of-scope outputs, hallucinations, tool call risks, and application-specific risks
- **Acceptable Use Policy** (E010): Define appropriate system usage boundaries
- **Transparency Policy** (E017): Model cards, datasheets, interpretability reports
- **Input/Output Data Policies** (A001-A002): Retention, deletion, ownership, opt-out rights
- **Vendor Due Diligence** (E006): Foundation model provider assessment covering data handling, PII, security

### Code Review for AIUC-1 Compliance

When reviewing agent code, check for:

- **Input filtering** (B005): Real-time filtering before LLM processing to catch prompt injection, jailbreaks
- **PII protection** (A006): Detection and redaction in prompts, outputs, and logs; RBAC + MFA for PII systems
- **Tool call restrictions** (D003): Scope limits, authorization checks, preventing out-of-scope actions
- **Output safeguards** (C003-C006): Harmful content filtering, scope enforcement, vulnerability prevention
- **Data isolation** (A005): Tenant separation, tenant-specific encryption, data flow boundaries
- **Logging** (E015): Model activity logs for incident investigation and auditing
- **AI disclosure** (E016): Clear indicators when users interact with AI rather than humans
- **Rate limiting** (B004): Endpoint scraping prevention, query quotas, zero-trust verification

### Framework Crosswalks

When mapping from other frameworks to AIUC-1, read `references/crosswalks.md` for detailed mappings.
The key relationships:

- **ISO 42001** → AIUC-1 covers most ISO controls and extends them with technical testing. ISO focuses on management systems; AIUC-1 adds concrete testable requirements
- **OWASP Top 10 for LLMs** → Every OWASP threat maps to specific AIUC-1 controls. AIUC-1 certification covers all 10 OWASP threats
- **NIST AI RMF** → AIUC-1 operationalizes NIST's four functions (Govern, Map, Measure, Manage) into auditable controls
- **EU AI Act** → AIUC-1 maps risk classifications and makes abstract requirements concrete
- **SOC 2** → SOC 2 lacks AI specificity; AIUC-1 extends SOC 2's trust principles to AI-unique risks

## Certification Quick Reference

- **Timeline**: 4-8 weeks typically (5-10 weeks for most organizations)
- **Validity**: 12 months, with quarterly technical retesting
- **Issuer**: Only the Artificial Intelligence Underwriting Company issues AIUC-1 certificates
- **Auditors**: Must be accredited (Schellman is the first authorized auditor)
- **Updates**: Quarterly (January, April, July, October 15)
- **What you get**: Certificate, comprehensive audit report with third-party attestation, AIUC-1 badge

## Evidence Types

Controls require different kinds of evidence:

1. **Documentation** — Policies, procedures, terms of service, DPAs
2. **Technical Implementation** — Code, configuration files, system demos showing controls in production
3. **Operational Practice** — Meeting notes, change logs, review records, audit trails
4. **Third-Party Evaluation** — Risk taxonomy, methodology, findings, remediation timelines
5. **Logs & Monitoring** — System logs, audit trails, dashboards
6. **Product/User-Facing** — Screenshots of disclosures, warnings, AI indicators

Controls must be actually implemented, not merely planned. Technical controls deployed in production.
Policies documented and communicated. Monitoring actively capturing events.

## Reference Files

- `references/controls.md` — Complete list of all 51 controls with IDs, descriptions, evidence requirements, and applicability
- `references/scoping.md` — How to determine which controls apply based on agent capabilities and architecture
- `references/certification.md` — The 4-phase certification process, timeline, and deliverables
- `references/evidence.md` — Evidence types, submission guidelines, and examples per control
- `references/crosswalks.md` — Detailed mappings to ISO 42001, OWASP Top 10, NIST AI RMF, EU AI Act, and others
