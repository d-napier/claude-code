# AIUC-1 Framework Crosswalks

AIUC-1 is built on and maps to nine core frameworks, plus additional regional/sector coverage.

## Core Frameworks

1. **EU AI Act** — Risk-level classification (minimal, limited, high, unacceptable)
2. **NIST AI RMF** — Four-function lifecycle (Govern, Map, Measure, Manage)
3. **ISO 42001** — AI management systems
4. **MITRE ATLAS** — Adversarial tactics and mitigation strategies
5. **OWASP Top 10 for LLM Applications** — Critical security threats
6. **OWASP AIVSS** — Agent risk quantification scoring (0-10)
7. **IBM AI Risk Atlas** — ML, GenAI, and AI agent risk taxonomy
8. **Cisco AI Security & Safety Framework** — 19 attacker objectives with 150+ subtechniques
9. **CSA AI Controls Matrix** — AI/ML-specific security controls

## Extended Frameworks (not duplicated, extended)
- SOC 2, ISO 27001, ISO 42006, EU GDPR, Canada AIDA

## Additional Regional/Sector Coverage
- Colorado AI Act, California SB 1001, NYC Local Law 144
- HIPAA, Fair Credit Reporting Act, Fair Housing Act, FTC guidance
- OECD AI Principles (five principles, 47+ countries)

---

## OWASP Top 10 for LLMs → AIUC-1 Mapping

### LLM01:25 — Prompt Injection
Manipulates LLM through crafted inputs to bypass safety measures.
- **B001**: Third-party testing of adversarial robustness
- **B002**: Detect adversarial input
- **B005**: Implement real-time input filtering

### LLM02:25 — Sensitive Information Disclosure
Exposure of PII, financial, or health data through outputs.
- **A005**: Prevent cross-customer data exposure
- **A006**: Prevent PII leakage
- **B003**: Manage public release of technical details
- **B004**: Prevent AI endpoint scraping
- **B007**: Enforce user access privileges
- **B009**: Limit output over-exposure

### LLM03:25 — Supply Chain
Risks from training data, models, and platform dependencies.
- **A004**: Protect IP & trade secrets
- **A007**: Prevent IP violations
- **E005**: Assess cloud vs on-prem processing
- **E006**: Conduct vendor due diligence
- **E009**: Monitor third-party access

### LLM04:25 — Data and Model Poisoning
Manipulated pre-training or fine-tuning data.
- **B001**: Third-party testing of adversarial robustness
- **B005**: Implement real-time input filtering

### LLM05:25 — Improper Output Handling
Inadequate validation before downstream use.
- **A004**, **A005**, **A006**, **A007**, **B001**, **B004**, **B009**
- **C003**: Prevent harmful outputs
- **C004**: Prevent out-of-scope outputs
- **C005**: Prevent customer-defined high-risk outputs
- **C006**: Prevent output vulnerabilities
- **D001**: Prevent hallucinated outputs
- **E009**: Monitor third-party access

### LLM06:25 — Excessive Agency
LLM systems gain unintended agency via tools/plugins.
- **A003**: Limit AI agent data collection
- **B007**: Enforce user access privileges
- **D003**: Restrict unsafe tool calls
- **D004**: Third-party testing of tool calls
- **E009**: Monitor third-party access

### LLM07:25 — System Prompt Leakage
Sensitive information in system prompts exposed to users.
- **B003**: Manage public release of technical details
- **B008**: Protect model deployment environment

### LLM08:25 — Vector and Embedding Weaknesses
RAG exploits via weak generation or retrieval mechanisms.
- **A003**, **A004**, **A005**, **A006**
- **B001**, **B002**, **B004**, **B006**, **B009**
- **D003**: Restrict unsafe tool calls

### LLM09:25 — Misinformation
False but credible outputs.
- **B009**: Limit output over-exposure
- **C003**: Prevent harmful outputs
- **D001**: Prevent hallucinated outputs
- **D002**: Third-party testing for hallucinations

### LLM10:25 — Unbounded Consumption
Resource exhaustion through excessive API usage.
- **A003**, **B002**, **B004**, **B005**, **B006**, **B007**
- **D003**: Restrict unsafe tool calls
- **E009**, **E010**, **E015**

---

## ISO 42001 → AIUC-1 Mapping (Key Controls)

| ISO 42001 Control | AIUC-1 Mapping | Gap |
|---|---|---|
| 4.1 Understanding Context | C001, E010 | Partial |
| 5.2 AI Policy | E010, E017 | No Gap |
| 6.1.2 AI Risk Assessment | C001, C008 | No Gap |
| 8.2 AI Risk Assessment (Operational) | C001, C008 | No Gap |
| A.6.2.4 Verification and Validation | C002, C010-C012, D002, D004, E007 | No Gap |
| A.7.2 Data Management | A001 | No Gap |
| A.8.2 User Documentation | E014, E016 | No Gap |

**Controls ISO 42001 covers that AIUC-1 does NOT:**
- 4.2 (Interested party needs)
- 6.2 (High-level AI objectives)
- 7.3 (Internal awareness training)
- A.6.1.2 and A.6.1.3 (Responsible AI objectives and processes)

**Key insight**: ISO 42001 emphasizes governance and management systems. AIUC-1 extends this with independent technical testing (adversarial robustness, hallucinations, tool call safety). Organizations often pursue AIUC-1 after achieving ISO 42001 to add the technical validation layer.

---

## Design Principles of AIUC-1 Crosswalks

- Customer-focused on pragmatic requirements
- Adaptable to regulatory evolution
- Transparent with public changelog
- Forward-looking with quarterly testing
- Insurance-enabling for direct harms/financial losses
- Predictable update schedule: January 15, April 15, July 15, October 15
