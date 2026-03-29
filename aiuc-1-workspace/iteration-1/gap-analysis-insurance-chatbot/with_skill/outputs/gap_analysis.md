# AIUC-1 Gap Analysis: Insurance Claims AI Chatbot

**Date:** 2026-03-29
**System:** Customer-facing AI chatbot for insurance claims processing
**Model:** GPT-4o (OpenAI)
**Capabilities:** Text-based chat, claims database API access, refund payment initiation
**Deployment Context:** External (customer-facing)
**Existing Compliance:** SOC 2 (no AI-specific certifications)

---

## Scope Summary

This agent is classified as a **complex external agent** with sensitive financial/insurance data access and tool execution capabilities. Based on AIUC-1 scoping rules:

- **Universal controls**: All apply (A001-A006, B001, B004, B007, B008, C001, C002, C005, C006, C012, E001, E004-E006, E008, E010-E012, E015, E016)
- **Text modality controls**: A007, B005, B009, C003, C004, C010, C011, D001, D002, E002, E003, F001, F002
- **Automation controls**: B006, D003, D004 (plus F001 already triggered by text)
- **External-facing**: A007 (already triggered by text)

**Total mandatory controls in scope: 43**
**Optional controls worth considering: 8** (B002, B003, C007, C008, C009, E009, E013, E017)

---

## SOC 2 Coverage Assessment

SOC 2 provides partial coverage for general IT controls but lacks AI-specific requirements. The following areas have likely partial coverage from SOC 2:

- Access controls (B007, B008) -- SOC 2 covers general access management
- Change management (E004) -- SOC 2 covers change approval processes
- Logging (E015) -- SOC 2 covers audit logging
- Vendor management (E006) -- SOC 2 covers vendor oversight
- Incident response (E001) -- SOC 2 covers security incident plans
- Data processing locations (E011) -- SOC 2 covers infrastructure documentation

SOC 2 does **not** cover: AI-specific data policies, prompt injection defense, hallucination prevention, harmful output controls, AI risk taxonomy, AI failure plans, AI disclosure, tool call restrictions, adversarial testing, or third-party AI-specific evaluations.

---

## Domain A: Data & Privacy

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| A001 | Establish Input Data Policy | **Gap** | Critical | No AI-specific input data policy exists |
| A002 | Establish Output Data Policy | **Gap** | Critical | No AI-specific output data policy exists |
| A003 | Limit AI Agent Data Collection | **Partial** | High | SOC 2 may cover general data minimization, but AI-specific scoping is absent |
| A004 | Protect IP & Trade Secrets | **Partial** | High | SOC 2 covers confidentiality, but no AI-specific IP leakage controls |
| A005 | Prevent Cross-Customer Data Exposure | **Partial** | Critical | SOC 2 covers tenant isolation, but AI-specific data flow boundaries for LLM context need verification |
| A006 | Prevent PII Leakage | **Partial** | Critical | SOC 2 covers access controls/MFA, but no PII detection/redaction in AI prompts/outputs |
| A007 | Prevent IP Violations | **Gap** | High | No copyright/trademark detection in AI-generated outputs |

### Remediation Steps -- Domain A

1. **A001/A002 (Critical):** Draft AI-specific input and output data policies covering: how claims data is sent to OpenAI, data retention by the model provider, customer data rights (opt-out, deletion), output ownership. Include in Terms of Service and Privacy Policy. Review OpenAI's data processing agreement.
2. **A003 (High):** Implement scoped data access per user role -- the chatbot should only query claims relevant to the authenticated customer. Log and monitor any deviations.
3. **A004 (High):** Add user guidance warning against inputting trade secrets. Verify OpenAI's zero-data-retention configuration for API usage. Implement output monitoring for proprietary information.
4. **A005 (Critical):** Validate that LLM context windows cannot leak data between customers. Ensure session isolation -- no shared conversation memory across customers. Document tenant-specific encryption and data flow boundaries.
5. **A006 (Critical):** Implement PII detection and redaction before sending claims data to GPT-4o. Add PII filtering on outputs before displaying to customers. Integrate with DLP systems.
6. **A007 (High):** Implement content filtering to prevent generation of copyrighted or trademarked content in chatbot responses.

---

## Domain B: Security

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| B001 | Third-Party Adversarial Testing | **Gap** | Critical | No adversarial/red team testing program for AI system |
| B004 | Prevent AI Endpoint Scraping | **Partial** | High | SOC 2 may cover general rate limiting, but AI-specific query quotas need verification |
| B005 | Real-Time Input Filtering (Optional) | **Gap** | High | No prompt injection or jailbreak filtering before LLM processing |
| B006 | Prevent Unauthorized AI Agent Actions | **Gap** | Critical | No documented scope restrictions on what actions the agent can take with claims DB and payment APIs |
| B007 | Enforce User Access Privileges | **Partial** | Medium | SOC 2 covers RBAC; verify it extends to AI system access specifically |
| B008 | Protect Model Deployment Environment | **Partial** | Medium | SOC 2 covers deployment security; verify AI-specific deployment protections |
| B009 | Limit Output Over-Exposure | **Gap** | High | No output filtering/masking to prevent information leakage in chatbot responses |

### Remediation Steps -- Domain B

1. **B001 (Critical):** Engage a third-party (e.g., Schellman or qualified red team firm) for quarterly adversarial testing including prompt injection, jailbreak attempts, and data extraction attacks against the chatbot.
2. **B004 (High):** Implement AI-specific rate limiting on the chatbot endpoint -- query quotas per user/session, zero-trust verification for API access.
3. **B005 (High):** Deploy real-time input filtering/moderation layer before GPT-4o processing to catch prompt injection, jailbreak, and adversarial inputs. Consider tools like OpenAI's moderation API or dedicated prompt firewalls.
4. **B006 (Critical):** Implement strict scope restrictions on the agent's tool access: define exactly which claims DB queries are allowed, enforce read-only where possible, restrict refund payment amounts/conditions, require human approval for payments above thresholds.
5. **B007 (Medium):** Extend existing RBAC to cover AI chatbot administration and configuration access. Document AI-specific access roles.
6. **B008 (Medium):** Document AI deployment security architecture -- verify encryption, access controls, and authorization for the GPT-4o integration and API keys.
7. **B009 (High):** Implement output filtering to prevent the chatbot from exposing internal system details, other customers' data, or excessive claims information beyond what the user is entitled to see.

---

## Domain C: Safety

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| C001 | Define AI Risk Taxonomy | **Gap** | Critical | No AI-specific risk taxonomy exists |
| C002 | Conduct Pre-Deployment Testing | **Gap** | Critical | No documented pre-deployment AI safety testing program |
| C003 | Prevent Harmful Outputs | **Gap** | Critical | No safeguards against distressed/angry/offensive/biased outputs for insurance customers |
| C004 | Prevent Out-of-Scope Outputs | **Gap** | Critical | No boundary enforcement -- chatbot could provide medical, legal, or financial advice outside insurance claims |
| C005 | Prevent Customer-Defined High-Risk Outputs | **Gap** | High | No custom high-risk output filters for insurance domain |
| C006 | Prevent Output Vulnerabilities | **Gap** | High | No output sanitization for downstream security vulnerabilities |
| C010 | Third-Party Testing for Harmful Outputs | **Gap** | Critical | No quarterly third-party evaluation program |
| C011 | Third-Party Testing for Out-of-Scope Outputs | **Gap** | Critical | No quarterly third-party scope testing |
| C012 | Third-Party Testing for Customer-Defined Risk | **Gap** | Critical | No quarterly third-party custom risk testing |

### Remediation Steps -- Domain C

1. **C001 (Critical):** Create an AI risk taxonomy specific to the insurance claims chatbot. Categories must include: harmful outputs (distressed claimants receiving insensitive responses), out-of-scope outputs (medical/legal advice), hallucinated claim details, unauthorized refund initiations, and insurance-specific risks (incorrect coverage information, fraudulent claim facilitation).
2. **C002 (Critical):** Establish a pre-deployment testing program with formal review gates for any system changes. Test across all risk taxonomy categories before each release.
3. **C003 (Critical):** Implement output moderation for the insurance context -- prevent angry/dismissive responses to distressed claimants, block high-risk advice (e.g., "you should sue"), filter offensive content and bias.
4. **C004 (Critical):** Define the chatbot's scope strictly (insurance claims status, filing, refunds) and implement boundary enforcement to refuse medical advice, legal counsel, investment advice, and other out-of-scope topics.
5. **C005 (High):** Identify insurance-specific high-risk outputs (incorrect policy interpretations, misleading coverage statements) and implement blocking rules.
6. **C006 (High):** Sanitize all outputs to prevent XSS, injection, or other vulnerabilities in the chat interface.
7. **C010/C011/C012 (Critical):** Engage qualified third parties for quarterly testing across all safety categories. This is a recurring obligation -- budget accordingly.

---

## Domain D: Reliability

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| D001 | Prevent Hallucinated Outputs | **Gap** | Critical | No hallucination prevention -- critical for insurance claims with financial implications |
| D002 | Third-Party Testing for Hallucinations | **Gap** | Critical | No quarterly third-party hallucination evaluation |
| D003 | Restrict Unsafe Tool Calls | **Gap** | Critical | No documented restrictions on claims DB queries or refund payment tool calls |
| D004 | Third-Party Testing of Tool Calls | **Gap** | Critical | No third-party evaluation of tool call safety |

### Remediation Steps -- Domain D

1. **D001 (Critical):** Implement RAG (retrieval-augmented generation) grounding the chatbot's responses in actual claims database records. Add citation requirements for claim-specific information. Implement confidence scoring and route low-confidence responses to human agents. This is especially critical given that hallucinated claim amounts or policy details could cause direct financial harm.
2. **D002 (Critical):** Engage third parties for quarterly hallucination testing specific to insurance claim data accuracy.
3. **D003 (Critical):** Implement strict tool call restrictions:
   - Claims DB: read-only queries scoped to the authenticated customer's claims only
   - Refund payments: enforce maximum amount limits, require human approval above threshold, validate against actual claim amounts, prevent duplicate refunds
   - Add input validation, permission checks, and scope enforcement on every tool invocation
   - Log all tool calls with full context for audit
4. **D004 (Critical):** Engage third parties for quarterly tool call security testing, specifically testing for unauthorized data access and payment manipulation.

---

## Domain E: Accountability

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| E001 | AI Failure Plan -- Security Breaches | **Partial** | High | SOC 2 incident response plan exists but likely lacks AI-specific scenarios |
| E002 | AI Failure Plan -- Harmful Outputs | **Gap** | Critical | No plan for harmful AI outputs to insurance customers |
| E003 | AI Failure Plan -- Hallucinations | **Gap** | Critical | No plan for hallucinated claims data causing financial loss |
| E004 | Assign Accountability | **Partial** | Medium | SOC 2 covers change management; needs AI-specific accountability assignments |
| E005 | Assess Cloud vs On-Prem Processing | **Partial** | Medium | SOC 2 covers cloud assessment; verify AI-specific considerations (data sent to OpenAI) |
| E006 | Conduct Vendor Due Diligence | **Partial** | High | SOC 2 covers vendor management; needs AI-specific due diligence for OpenAI |
| E008 | Review Internal Processes | **Partial** | Medium | SOC 2 covers process reviews; extend to AI operations |
| E010 | AI Acceptable Use Policy | **Gap** | High | No AI-specific acceptable use policy |
| E011 | Record Processing Locations | **Partial** | Medium | SOC 2 covers infrastructure docs; must include OpenAI processing locations |
| E012 | Document Regulatory Compliance | **Gap** | High | No AI-specific regulatory compliance documentation (state insurance AI regulations, NAIC guidelines) |
| E015 | Log Model Activity | **Partial** | High | SOC 2 covers audit logging; needs AI-specific model activity logging |
| E016 | Implement AI Disclosure | **Gap** | Critical | No mechanism informing customers they are chatting with AI |

### Remediation Steps -- Domain E

1. **E001 (High):** Extend existing incident response plan with AI-specific scenarios: prompt injection breach, mass data leakage via chatbot, unauthorized refund processing. Include AI-specific contacts (OpenAI support, AI security consultants).
2. **E002 (Critical):** Create an AI failure plan for harmful outputs -- define what constitutes harmful output in the insurance context, assign accountable owners, establish notification procedures for affected claimants, define remediation steps.
3. **E003 (Critical):** Create an AI failure plan for hallucinated outputs causing financial loss -- this is especially critical since the chatbot processes claims and can initiate refunds. Include financial impact assessment procedures and customer remediation steps.
4. **E004 (Medium):** Assign named individuals accountable for AI system changes. Document approval requirements for model updates, prompt changes, tool access modifications.
5. **E005 (Medium):** Document the decision to use OpenAI (cloud) for processing sensitive insurance data. Assess regulatory implications for sending claims data to third-party cloud AI.
6. **E006 (High):** Conduct formal AI-specific vendor due diligence on OpenAI covering: data handling practices, PII controls, data retention, security certifications, training data usage, and compliance with insurance regulations.
7. **E010 (High):** Draft an AI acceptable use policy defining what the chatbot should and should not be used for, both for customers and internal staff.
8. **E011 (Medium):** Update processing location inventory to include all locations where OpenAI processes data.
9. **E012 (High):** Document applicable AI regulations including state insurance department AI guidelines, NAIC model bulletins, potential EU AI Act applicability, and NIST AI RMF alignment.
10. **E015 (High):** Implement comprehensive AI activity logging: all prompts, responses, tool calls, refund actions, and model metadata. Ensure logs support incident investigation and auditing.
11. **E016 (Critical):** Add clear, prominent AI disclosure to the chat interface so customers know they are interacting with an AI, not a human agent. Include information about the chatbot's limitations.

---

## Domain F: Society

| Control | Name | Status | Priority | Notes |
|---------|------|--------|----------|-------|
| F001 | Prevent AI Cyber Misuse | **Gap** | High | No guardrails preventing the chatbot from being manipulated for cyber attacks |
| F002 | Prevent Catastrophic Misuse | **Gap** | Medium | Lower risk for insurance domain but still required -- CBRN content filters needed |

### Remediation Steps -- Domain F

1. **F001 (High):** Implement guardrails preventing the chatbot from being weaponized -- block requests for system exploitation techniques, prevent social engineering enablement, restrict output of sensitive technical details about the claims infrastructure.
2. **F002 (Medium):** Implement CBRN content filters. While lower risk for an insurance chatbot, these are mandatory controls. Leverage GPT-4o's built-in safety filters and add explicit restrictions.

---

## Gap Summary

### By Status

| Status | Count | Percentage |
|--------|-------|------------|
| **Gap** (not implemented) | 28 | 65% |
| **Partial** (SOC 2 provides some coverage) | 13 | 30% |
| **Implemented** | 0 | 0% |
| **Not Applicable** | 0 | 0% |
| **Optional (not assessed)** | 8 | -- |
| **Total Mandatory In-Scope** | 43* | -- |

*Two controls (E007, E014) merged into E004 and E017 respectively as of Q1 2026.

### By Priority

| Priority | Count | Controls |
|----------|-------|----------|
| **Critical** | 19 | A001, A002, A005, A006, B001, B006, C001, C002, C003, C004, C010, C011, C012, D001, D002, D003, D004, E002, E003, E016 |
| **High** | 15 | A003, A004, A007, B004, B005, B009, C005, C006, E001, E006, E010, E012, E015, F001, D004 |
| **Medium** | 7 | B007, B008, E004, E005, E008, E011, F002 |

---

## Recommended Implementation Roadmap

### Phase 1: Immediate (Weeks 1-3) -- Critical Gaps

Focus on the highest-risk items given the customer-facing nature and financial transaction capability:

1. **AI Disclosure (E016):** Add "You are chatting with an AI assistant" disclosure -- quick win
2. **Tool Call Restrictions (D003, B006):** Implement strict guardrails on refund payments (approval thresholds, amount limits, scope restrictions) -- highest financial risk
3. **PII Protection (A006):** Deploy PII detection/redaction before data reaches GPT-4o
4. **Cross-Customer Isolation (A005):** Validate session isolation and prevent context leakage
5. **Input/Output Data Policies (A001, A002):** Draft and publish AI-specific data policies

### Phase 2: Short-Term (Weeks 3-6) -- Safety and Reliability

1. **AI Risk Taxonomy (C001):** Define all risk categories for the insurance domain
2. **Hallucination Prevention (D001):** Implement RAG grounding with claims database
3. **Harmful Output Prevention (C003):** Deploy output moderation tuned for insurance context
4. **Scope Enforcement (C004):** Restrict chatbot to insurance claims topics only
5. **AI Failure Plans (E001, E002, E003):** Draft all three failure plans

### Phase 3: Medium-Term (Weeks 6-10) -- Testing and Compliance

1. **Third-Party Testing (B001, C010, C011, C012, D002, D004):** Engage qualified third-party auditor for initial adversarial, safety, and reliability testing
2. **Vendor Due Diligence (E006):** Complete formal OpenAI assessment
3. **Regulatory Documentation (E012):** Map all applicable AI regulations
4. **Pre-Deployment Testing Program (C002):** Establish ongoing testing framework
5. **Remaining security controls (B004, B005, B009):** Rate limiting, input filtering, output masking

### Phase 4: Certification Readiness (Weeks 10-14)

1. Address remaining medium-priority gaps
2. Compile evidence for all controls
3. Conduct internal readiness assessment
4. Engage AIUC-1 authorized auditor (Schellman)
5. Enter formal 4-phase certification process (additional 5-10 weeks)

---

## Key Risk Callouts

1. **Refund Payment Capability:** The ability to initiate payments makes D003 (tool call restrictions) and D004 (third-party tool call testing) among the highest-priority items. An adversarial user or prompt injection attack could potentially trigger unauthorized refunds.

2. **Sensitive Insurance Data:** Claims data includes health information, financial details, and personal identifiers. Sending this to OpenAI's GPT-4o API requires careful evaluation under insurance regulations and robust PII controls (A006).

3. **Customer-Facing with Vulnerable Users:** Insurance claimants may be in distressed states (accident, loss, health crisis). Harmful or insensitive outputs (C003) carry elevated risk of reputational damage and regulatory scrutiny.

4. **Hallucination Risk with Financial Impact:** Hallucinated claim amounts, policy details, or coverage information could lead to direct financial harm to customers and E&O liability for the insurer (D001, E003).

5. **No AI-Specific Certifications:** While SOC 2 provides a foundation for general IT controls, it does not address any of the AI-specific requirements in AIUC-1. Approximately 65% of controls are complete gaps.

---

## Optional Controls Worth Considering

Given the high-risk nature of this system, the following optional controls are strongly recommended:

| Control | Name | Recommendation |
|---------|------|----------------|
| B002 | Detect Adversarial Input | **Strongly recommended** -- real-time adversarial detection for customer-facing financial system |
| B003 | Manage Public Technical Disclosure | Recommended -- prevent attackers from learning system architecture |
| C007 | Flag High-Risk Outputs | **Strongly recommended** -- human review for high-risk insurance responses |
| C008 | Monitor AI Risk Categories | **Strongly recommended** -- ongoing monitoring dashboards |
| C009 | Enable Real-Time Feedback | **Strongly recommended** -- allow customers to flag incorrect information |
| E009 | Monitor Third-Party Access | Recommended -- monitor OpenAI API access patterns |
| E013 | Quality Management System | Recommended -- QMS for ongoing AI quality |
| E017 | System Transparency Policy | Recommended -- model cards and transparency reporting |
