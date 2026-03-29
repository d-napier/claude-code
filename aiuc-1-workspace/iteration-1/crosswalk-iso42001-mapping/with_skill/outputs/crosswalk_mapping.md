# ISO 42001 to AIUC-1 Crosswalk Mapping

## Executive Summary

Your organization holds ISO 42001 certification, which provides a strong foundation in AI governance and management systems. However, AIUC-1 certification requires significant additional work, primarily in three areas:

1. **Independent technical testing** -- AIUC-1 mandates quarterly third-party evaluations for adversarial robustness, harmful outputs, hallucinations, and tool call safety that ISO 42001 does not require.
2. **Granular technical controls** -- AIUC-1 demands implemented-in-production controls for PII filtering, input/output safeguards, endpoint protection, and tool call restrictions that go well beyond ISO's management-system approach.
3. **AI-specific failure planning and accountability** -- AIUC-1 requires dedicated failure plans for security breaches, harmful outputs, and hallucinations, plus vendor due diligence and processing location documentation.

**Bottom line**: Of AIUC-1's 51 controls, approximately 10 are fully covered by ISO 42001, 15 have partial coverage requiring extension, and 26 are net-new requirements with no meaningful ISO 42001 equivalent.

---

## Coverage Classification Key

| Status | Definition |
|--------|-----------|
| **Covered** | ISO 42001 certification substantially satisfies this AIUC-1 control. Minimal additional work needed (documentation reformatting or minor evidence supplementation). |
| **Partial** | ISO 42001 addresses the governance/policy layer but AIUC-1 requires additional technical implementation, testing, or specificity. Gap-closing work required. |
| **Net-New** | ISO 42001 does not address this requirement. Full implementation required from scratch. |

---

## Domain A: Data & Privacy (7 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| A001 | Establish Input Data Policy | Mandatory | **Partial** | A.7.2 (Data Management) covers data governance broadly | AIUC-1 requires specific technical controls for automated retention/deletion, data subject rights processes, and AI-specific data policies (training usage, inference processing). ISO covers data management at a governance level but not with this technical specificity. |
| A002 | Establish Output Data Policy | Mandatory | **Partial** | A.7.2 (Data Management) | ISO does not specifically address AI output ownership, redistribution rights, or output deletion/opt-out mechanisms. Need to draft AI-specific output data policies. |
| A003 | Limit AI Agent Data Collection | Mandatory | **Net-New** | None | ISO 42001 does not address runtime data collection scoping for AI agents. Requires implementing code-level scoped access per role/workflow, monitoring for deviations, and authorization system integration. |
| A004 | Protect IP & Trade Secrets | Mandatory | **Net-New** | None | No ISO equivalent for preventing AI systems from leaking proprietary information. Requires user guidance, provider contract protections, IP detection in outputs, and disclosure monitoring. |
| A005 | Prevent Cross-Customer Data Exposure | Mandatory | **Net-New** | None | ISO does not address multi-tenant AI data isolation. Requires tenant-specific encryption, data flow boundary validation, and consent mechanisms for data combination. |
| A006 | Prevent PII Leakage | Mandatory | **Partial** | A.7.2 partially relevant | ISO addresses data protection governance but AIUC-1 requires specific PII detection/redaction in prompts, outputs, and logs, plus RBAC and MFA for PII-containing AI systems. |
| A007 | Prevent IP Violations | Mandatory (external) | **Net-New** | None | No ISO equivalent. Requires copyright/trademark detection and content filtering to prevent AI-generated IP infringement. |

**Domain A Summary**: 0 Covered, 3 Partial, 4 Net-New

---

## Domain B: Security (9 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| B001 | Third-Party Testing of Adversarial Robustness | Mandatory | **Net-New** | None | ISO 42001 has no requirement for independent adversarial testing, red teaming, jailbreak testing, or prompt injection assessments. Must establish quarterly third-party testing program. |
| B002 | Detect Adversarial Input | Optional | **Net-New** | None | No ISO equivalent for real-time adversarial input detection and monitoring. |
| B003 | Manage Public Release of Technical Details | Optional | **Partial** | General information security awareness | ISO addresses information security at a high level but not AI-specific technical disclosure management. |
| B004 | Prevent AI Endpoint Scraping | Mandatory | **Net-New** | None | ISO does not address rate limiting, query quotas, or zero-trust verification for AI endpoints. |
| B005 | Implement Real-Time Input Filtering | Optional | **Net-New** | None | No ISO equivalent for real-time prompt injection and jailbreak filtering. |
| B006 | Prevent Unauthorized AI Agent Actions | Mandatory | **Net-New** | None | ISO does not address runtime scope enforcement for AI agent tool/API access. |
| B007 | Enforce User Access Privileges | Mandatory | **Partial** | General access control principles | ISO supports access management governance but AIUC-1 requires AI-specific RBAC implementation with privilege management and access audit logs. |
| B008 | Protect Model Deployment Environment | Mandatory | **Partial** | General security management | ISO covers security governance but AIUC-1 requires specific encryption, access controls, and authorization for model deployment environments. |
| B009 | Limit Output Over-Exposure | Mandatory | **Net-New** | None | No ISO equivalent for output masking, response filtering, or fidelity reduction to prevent information leakage. |

**Domain B Summary**: 0 Covered, 3 Partial, 6 Net-New

---

## Domain C: Safety (12 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| C001 | Define AI Risk Taxonomy | Mandatory | **Covered** | 6.1.2, 8.2 (AI Risk Assessment) | ISO 42001 risk assessment maps well. May need to extend taxonomy to explicitly include AIUC-1 categories: harmful outputs, out-of-scope outputs, hallucinations, tool calls, and application-specific risks. |
| C002 | Conduct Pre-Deployment Testing | Mandatory | **Covered** | A.6.2.4 (Verification and Validation) | ISO's verification and validation processes cover pre-deployment testing. Ensure testing covers all AIUC-1 risk categories and document formal change reviews. |
| C003 | Prevent Harmful Outputs | Mandatory | **Net-New** | None | ISO does not require specific content filtering for distressed outputs, offensive content, bias, or deception. Requires implementing output moderation and filtering. |
| C004 | Prevent Out-of-Scope Outputs | Mandatory | **Net-New** | None | No ISO equivalent for scope boundary enforcement in AI outputs. |
| C005 | Prevent Customer-Defined High-Risk Outputs | Mandatory | **Net-New** | None | No ISO equivalent for customer-specific risk output blocking. |
| C006 | Prevent Output Vulnerabilities | Mandatory | **Net-New** | None | No ISO equivalent for preventing XSS, SQL injection, or other vulnerabilities in AI-generated content. |
| C007 | Flag High-Risk Outputs | Optional | **Net-New** | None | No ISO equivalent for real-time high-risk output alerting and human review workflows. |
| C008 | Monitor AI Risk Categories | Optional | **Covered** | 6.1.2, 8.2 (AI Risk Assessment) | ISO risk monitoring aligns. Extend dashboards to AIUC-1 risk categories. |
| C009 | Enable Real-Time Feedback and Intervention | Optional | **Net-New** | None | No ISO equivalent for user feedback and intervention mechanisms during AI operation. |
| C010 | Third-Party Testing for Harmful Outputs | Mandatory | **Partial** | A.6.2.4 partially relevant | ISO requires verification/validation but not independent quarterly third-party testing specifically for harmful output categories. |
| C011 | Third-Party Testing for Out-of-Scope Outputs | Mandatory | **Partial** | A.6.2.4 partially relevant | Same as C010 -- ISO V&V exists but quarterly third-party scope testing is new. |
| C012 | Third-Party Testing for Customer-Defined Risk | Mandatory | **Partial** | A.6.2.4 partially relevant | Same pattern -- ISO V&V foundation exists but AIUC-1 requires dedicated quarterly third-party evaluations. |

**Domain C Summary**: 3 Covered, 3 Partial, 6 Net-New

---

## Domain D: Reliability (4 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| D001 | Prevent Hallucinated Outputs | Mandatory | **Net-New** | None | ISO 42001 does not address hallucination prevention. Requires grounding mechanisms, RAG, citation requirements, or confidence scoring implementation. |
| D002 | Third-Party Testing for Hallucinations | Mandatory | **Partial** | A.6.2.4 partially relevant | ISO V&V foundation exists but AIUC-1 requires dedicated quarterly third-party hallucination evaluation. |
| D003 | Restrict Unsafe Tool Calls | Mandatory | **Net-New** | None | No ISO equivalent for tool call scope restrictions, authorization checks, and permission verification in AI agent systems. |
| D004 | Third-Party Testing of Tool Calls | Mandatory | **Partial** | A.6.2.4 partially relevant | ISO V&V provides a foundation but quarterly independent tool call testing is net-new. |

**Domain D Summary**: 0 Covered, 2 Partial, 2 Net-New

---

## Domain E: Accountability (17 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| E001 | AI Failure Plan for Security Breaches | Mandatory | **Partial** | General risk management | ISO addresses risk treatment but not AI-specific failure plans with designated owners, notification procedures, and third-party support contacts (legal, PR, insurers). |
| E002 | AI Failure Plan for Harmful Outputs | Mandatory | **Net-New** | None | No ISO equivalent for harmful output incident response with accountable owners and remediation workflows. |
| E003 | AI Failure Plan for Hallucinations | Mandatory | **Net-New** | None | No ISO equivalent for hallucination-specific failure plans with financial impact assessment. |
| E004 | Assign Accountability | Mandatory | **Covered** | 5.1 Leadership, A.6.1.2 Responsible AI | ISO's governance and accountability structures map well. Extend to cover AI-specific change management with documented approvals. |
| E005 | Assess Cloud vs On-Prem Processing | Mandatory | **Partial** | General infrastructure governance | ISO addresses infrastructure at a governance level but AIUC-1 requires documented decision frameworks for cloud/on-prem AI processing with data sensitivity criteria. |
| E006 | Conduct Vendor Due Diligence | Mandatory | **Net-New** | None | ISO does not specifically address foundation model provider due diligence covering data handling, PII controls, and AI-specific security. |
| E007 | Document System Change Approvals | Optional | **Covered** | Merged with E004; ISO change management | ISO change management processes cover this. |
| E008 | Review Internal Processes | Mandatory | **Covered** | 9.1, 9.2, 9.3 (Internal audit, management review) | ISO's internal audit and management review processes satisfy this requirement. |
| E009 | Monitor Third-Party Access | Optional | **Partial** | General access management | ISO addresses access governance but AIUC-1 requires specific monitoring of third-party access to AI systems with logging and alerting. |
| E010 | Establish AI Acceptable Use Policy | Mandatory | **Covered** | 5.2 AI Policy | ISO's AI policy requirement maps directly. May need to extend to AIUC-1's specific acceptable use framing. |
| E011 | Record Processing Locations | Mandatory | **Net-New** | None | ISO does not specifically require documenting all AI data processing locations with data flow diagrams. |
| E012 | Document Regulatory Compliance | Mandatory | **Covered** | 4.1, 4.2 (Context, interested parties) | ISO's context analysis and compliance identification map well. Extend to reference AIUC-1's specific regulatory list (EU AI Act, NYC LL144, etc.). |
| E013 | Implement Quality Management System | Optional | **Covered** | ISO 42001 is itself a management system | ISO 42001 certification inherently satisfies QMS requirements. |
| E014 | Share Transparency Reports | Optional | **Covered** | Merged with E017 | See E017. |
| E015 | Log Model Activity | Mandatory | **Net-New** | None | ISO does not require specific AI model activity logging for incident investigation and auditing. Requires logging configuration, retention policies, and monitoring dashboards. |
| E016 | Implement AI Disclosure Mechanisms | Mandatory | **Partial** | A.8.2 (User Documentation) | ISO requires user documentation but AIUC-1 specifically mandates UI-level disclosure that users are interacting with AI, not humans. |
| E017 | Document System Transparency Policy | Optional | **Partial** | 5.2, A.8.2 | ISO covers AI policy and documentation but AIUC-1 requires specific model cards, datasheets, and interpretability reports. |

**Domain E Summary**: 7 Covered, 5 Partial, 5 Net-New

---

## Domain F: Society (2 controls)

| AIUC-1 Control | Name | Mandatory | Coverage | ISO 42001 Basis | Gap Description |
|----------------|------|-----------|----------|-----------------|-----------------|
| F001 | Prevent AI Cyber Misuse | Mandatory | **Net-New** | None | No ISO equivalent. Requires implementing guardrails preventing AI weaponization for cyberattacks, including prompt filters and output restrictions. |
| F002 | Prevent Catastrophic Misuse | Mandatory | **Net-New** | None | No ISO equivalent. Requires CBRN content filtering, restricted knowledge controls, and authorization-based output limitations. |

**Domain F Summary**: 0 Covered, 0 Partial, 2 Net-New

---

## Aggregate Coverage Summary

| Domain | Total Controls | Covered | Partial | Net-New |
|--------|---------------|---------|---------|---------|
| A: Data & Privacy | 7 | 0 | 3 | 4 |
| B: Security | 9 | 0 | 3 | 6 |
| C: Safety | 12 | 3 | 3 | 6 |
| D: Reliability | 4 | 0 | 2 | 2 |
| E: Accountability | 17 | 7 | 5 | 5 |
| F: Society | 2 | 0 | 0 | 2 |
| **Total** | **51** | **10 (20%)** | **16 (31%)** | **25 (49%)** |

### By Mandatory/Optional Status

| Category | Covered | Partial | Net-New | Total |
|----------|---------|---------|---------|-------|
| Mandatory controls | 7 | 12 | 18 | 37 |
| Optional controls | 3 | 4 | 7 | 14 |

---

## What ISO 42001 Gives You That AIUC-1 Does Not Require

Your ISO 42001 certification covers several governance areas that AIUC-1 does not explicitly test but that strengthen your overall posture:

- **4.2** -- Understanding needs of interested parties
- **6.2** -- High-level AI objectives and planning
- **7.3** -- Internal awareness and training programs
- **A.6.1.2 / A.6.1.3** -- Responsible AI objectives and processes
- **9.x** -- Internal audit and management review cycles

These are valuable assets. Your ISO governance infrastructure will accelerate AIUC-1 implementation even where controls are classified as "net-new" because the organizational processes for policy creation, review, and approval already exist.

---

## Prioritized Action Plan

### Phase 1: Critical Foundations (Weeks 1-3)

These are mandatory controls with no ISO coverage that block certification.

| Priority | Control(s) | Action | Effort |
|----------|-----------|--------|--------|
| P0 | B001 | Engage a qualified third-party testing firm (e.g., through Schellman) for adversarial robustness testing. Schedule quarterly cadence. | High -- vendor selection, contracting, initial test cycle |
| P0 | C010, C011, C012, D002, D004 | Extend third-party testing engagement to cover harmful outputs, out-of-scope outputs, customer-defined risks, hallucinations, and tool call safety. These can all be scoped into one quarterly evaluation program. | High -- bundled with B001 vendor |
| P0 | E001, E002, E003 | Draft three AI failure plans: (1) security breaches, (2) harmful outputs, (3) hallucinations. Assign accountable owners. Establish notification chains including legal, PR, and insurance contacts. | Medium -- documentation, stakeholder alignment |
| P0 | C001 | Extend your existing ISO risk taxonomy to explicitly categorize: harmful outputs, out-of-scope outputs, hallucinations, tool call risks, and application-specific risks per AIUC-1 format. | Low -- extend existing artifact |

### Phase 2: Technical Controls Implementation (Weeks 2-5)

Implement production-level technical safeguards.

| Priority | Control(s) | Action | Effort |
|----------|-----------|--------|--------|
| P1 | A006 | Implement PII detection and redaction in prompts, outputs, and logs. Add RBAC + MFA for PII-containing systems. | High |
| P1 | A005 | Implement tenant data isolation with tenant-specific encryption and data flow boundaries. | High |
| P1 | D001 | Implement hallucination prevention: grounding mechanisms, RAG, citations, or confidence scoring. | High |
| P1 | D003 | Implement tool call scope restrictions with input validation, permission checks, and authorization logging. | High |
| P1 | C003, C004 | Implement output content filtering (harmful content, bias, deception) and scope boundary enforcement. | High |
| P1 | C006 | Implement output sanitization to prevent XSS, SQL injection, and other vulnerabilities in generated content. | Medium |
| P1 | B004 | Deploy rate limiting, query quotas, and zero-trust verification on AI endpoints. | Medium |
| P1 | B006 | Implement contextual access controls limiting AI agent actions to intended scope. | Medium |
| P1 | F001, F002 | Implement guardrails preventing cyber misuse and CBRN content generation. | Medium |

### Phase 3: Policy and Documentation Extension (Weeks 3-5)

Extend ISO governance artifacts to meet AIUC-1 specificity.

| Priority | Control(s) | Action | Effort |
|----------|-----------|--------|--------|
| P2 | A001, A002 | Extend data policies to cover AI-specific input/output ownership, retention, training usage, opt-out, and deletion. Add automated enforcement mechanisms. | Medium |
| P2 | A004, A007 | Draft IP protection guidance; implement IP detection in outputs and copyright/trademark filtering. | Medium |
| P2 | E006 | Create foundation model vendor due diligence questionnaire and conduct initial assessments. | Medium |
| P2 | E011 | Document all AI data processing locations with data flow diagrams. | Low |
| P2 | E015 | Implement model activity logging with retention policies and monitoring dashboards. | Medium |
| P2 | E016 | Implement UI-level AI disclosure mechanisms across all user touchpoints. | Low |
| P2 | E010 | Extend AI policy into AIUC-1-formatted acceptable use policy. | Low |
| P2 | E005 | Document cloud vs. on-prem decision framework with data sensitivity criteria. | Low |

### Phase 4: Strengthen Partial Controls (Weeks 4-6)

Close remaining gaps where ISO provides a foundation.

| Priority | Control(s) | Action | Effort |
|----------|-----------|--------|--------|
| P3 | B007 | Extend access controls to AI-specific RBAC with privilege management and audit logs. | Medium |
| P3 | B008 | Document and verify encryption, access controls, and authorization for model deployment environments. | Medium |
| P3 | C005 | Implement customer-specific risk output blocking rules. | Medium |
| P3 | B009 | Implement output masking and fidelity reduction for information leakage prevention. | Medium |
| P3 | A003 | Implement code-level data collection scoping per role and workflow with monitoring. | Medium |

### Phase 5: Optional Controls and Certification Readiness (Weeks 5-8)

| Priority | Control(s) | Action | Effort |
|----------|-----------|--------|--------|
| P4 | B002, B003, B005 | Optional security enhancements: adversarial input detection, technical disclosure management, real-time input filtering. | Medium each |
| P4 | C007, C008, C009 | Optional safety enhancements: high-risk output flagging, risk category monitoring, real-time feedback mechanisms. | Medium each |
| P4 | E009, E013, E017 | Optional accountability: third-party access monitoring, QMS (likely covered), transparency reports with model cards. | Low-Medium each |
| P4 | -- | Compile all evidence per AIUC-1 evidence guide. Conduct internal mock audit against full control list. Engage Schellman or AIUC for formal certification. | High |

---

## Estimated Timeline

| Phase | Duration | Key Milestones |
|-------|----------|---------------|
| Phase 1: Critical Foundations | Weeks 1-3 | Third-party testing firm engaged; failure plans drafted; risk taxonomy extended |
| Phase 2: Technical Controls | Weeks 2-5 | PII filtering, hallucination prevention, tool call restrictions, output safeguards deployed |
| Phase 3: Policy Extension | Weeks 3-5 | Data policies, vendor due diligence, logging, and disclosure implemented |
| Phase 4: Partial Gap Closure | Weeks 4-6 | Remaining access controls, deployment security, and output limitations in place |
| Phase 5: Certification Prep | Weeks 5-8 | Evidence compiled, mock audit complete, formal certification engagement |
| **AIUC-1 Certification Audit** | Weeks 6-10 | Scoping, evidence review, technical testing, final report and certificate |

**Total estimated time to certification: 10-14 weeks** from project initiation, assuming ISO 42001 artifacts are current and the organization has engineering capacity to implement technical controls in parallel with documentation work.

---

## Key Recommendations

1. **Start with third-party testing procurement immediately.** This is the longest lead-time item and is on the critical path. AIUC-1's quarterly testing cadence means you need a testing partner in place before anything else.

2. **Leverage your ISO 42001 management review cycle.** Your existing internal audit and review processes (ISO 9.x) satisfy E008 and E013 and provide the governance backbone for implementing all other controls.

3. **Bundle the six quarterly third-party testing requirements** (B001, C010, C011, C012, D002, D004) into a single engagement with one testing firm to reduce cost and coordination overhead.

4. **Treat Domains A and B as the highest-effort areas.** These have zero "Covered" controls from ISO 42001 and represent the largest net-new investment in both technical implementation and documentation.

5. **Use AIUC's gap support resources.** AIUC provides policy templates, technical safeguard blueprints, and guidance documents that can accelerate Phases 2-3 significantly.

6. **Plan for ongoing quarterly retesting.** AIUC-1 certificates are valid for 12 months but technical tests must be rerun every 3 months. Build this into your operational budget and testing calendar from day one.
