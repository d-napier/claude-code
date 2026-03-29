# AIUC-1 Compliance Code Review: InsuranceClaimBot

**File reviewed:** `/home/user/claude-code/aiuc-1-workspace/sample_agent.py`
**Review date:** 2026-03-29
**Standard:** AIUC-1 AI Agent Security, Safety & Reliability Standard
**Agent type:** Text-generation with Automation (tool/API access), External-facing
**Foundation model:** GPT-4o (OpenAI)

---

## Executive Summary

The InsuranceClaimBot is an AI agent that handles insurance claims, processes refunds up to $10,000, and accesses a customer database containing PII and financial data. This is a **high-risk agent** operating in a regulated domain (insurance) with direct financial transaction capability and access to sensitive personal data.

**Overall compliance posture: CRITICAL -- Not Ready for Certification**

The agent fails to meet the majority of mandatory AIUC-1 controls. Multiple critical security vulnerabilities exist in the codebase that would need to be remediated before any compliance assessment could proceed. Out of the applicable mandatory controls reviewed below, **zero are fully implemented**.

---

## Agent Scoping

Based on the code, this agent has the following characteristics:

- **Modalities:** Text input/output
- **Tool access:** Yes -- database queries, financial transactions (refunds)
- **Data handled:** PII (customer records), financial data (claims, refunds)
- **Deployment:** External-facing (customer interactions)
- **Sector:** Insurance (regulated industry)

This triggers **all universal controls**, **all text-generation controls**, and **all automation controls**, bringing nearly the full set of 51 controls into scope.

---

## Critical Findings

### FINDING 1: Hardcoded Secrets (Severity: CRITICAL)

**Lines 11, 13-18**

```python
client = openai.OpenAI(api_key="sk-proj-abc123fake")

DB_CONFIG = {
    "host": "claims-db.internal.company.com",
    "database": "insurance_claims",
    "user": "agent_service",
    "password": "ClaimsDb2024!",
}
```

**Controls violated:**
- **B008** (Protect Model Deployment Environment) -- Credentials in source code expose the deployment environment to unauthorized access
- **A006** (Prevent PII Leakage) -- Database credentials in plaintext enable unauthorized PII access
- **B007** (Enforce User Access Privileges) -- No access control mechanism; anyone with the source code has full database access

**Remediation:**
- Move all secrets to environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)
- Rotate all exposed credentials immediately
- Implement credential scanning in CI/CD pipelines

---

### FINDING 2: SQL Injection Vulnerabilities (Severity: CRITICAL)

**Lines 37, 46, 57-59, 68**

Every database function uses unsanitized f-string interpolation for SQL queries:

```python
cursor.execute(f"SELECT * FROM claims WHERE claim_id = '{claim_id}'")
```

```python
query = f"SELECT * FROM customers WHERE id = '{customer_id}'"
```

```python
cursor.execute(
    f"UPDATE claims SET status='refunded', refund_amount={amount} "
    f"WHERE claim_id = '{claim_id}'"
)
```

```python
cursor.execute(f"SELECT * FROM claims WHERE customer_id = '{customer_id}'")
```

**Controls violated:**
- **C006** (Prevent Output Vulnerabilities) -- Generated SQL queries contain injection vulnerabilities affecting downstream systems
- **D003** (Restrict Unsafe Tool Calls) -- Tool calls execute arbitrary SQL without validation
- **B006** (Prevent Unauthorized AI Agent Actions) -- SQL injection enables actions far beyond intended scope
- **F001** (Prevent AI Cyber Misuse) -- A prompt injection attack could weaponize these queries for data exfiltration

**Remediation:**
- Use parameterized queries for all database operations: `cursor.execute("SELECT * FROM claims WHERE claim_id = %s", (claim_id,))`
- Implement an ORM layer (e.g., SQLAlchemy) with built-in query parameterization
- Add input validation on all function parameters before database use

---

### FINDING 3: No Input Filtering or Validation (Severity: CRITICAL)

**Lines 143-151**

User input is passed directly to the LLM with no filtering, sanitization, or moderation:

```python
def chat(user_message: str, conversation_history: list) -> str:
    conversation_history.append({"role": "user", "content": user_message})
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}]
        + conversation_history,
        tools=tools,
    )
```

**Controls violated:**
- **B005** (Implement Real-Time Input Filtering) -- No input filtering of any kind
- **B001** (Third-Party Testing of Adversarial Robustness) -- No adversarial defenses to test
- **B002** (Detect Adversarial Input) -- No detection mechanisms

**Remediation:**
- Implement a pre-processing pipeline that screens user input before LLM processing
- Integrate a moderation API (e.g., OpenAI Moderation API, Lakera Guard, or similar)
- Add prompt injection detection (pattern matching, classifier-based, or canary tokens)
- Validate and sanitize all user input before inclusion in prompts

---

### FINDING 4: No Output Filtering or Safeguards (Severity: HIGH)

**Lines 153-177**

LLM responses are returned directly to the user with no filtering, moderation, or safety checks:

```python
assistant_message = response.choices[0].message
# ...
return assistant_message.content
```

**Controls violated:**
- **C003** (Prevent Harmful Outputs) -- No harmful content filtering
- **C004** (Prevent Out-of-Scope Outputs) -- No scope enforcement on outputs
- **C005** (Prevent Customer-Defined High-Risk Outputs) -- No custom risk filtering
- **C006** (Prevent Output Vulnerabilities) -- No output sanitization
- **B009** (Limit Output Over-Exposure) -- No output masking or filtering to prevent information leakage
- **D001** (Prevent Hallucinated Outputs) -- No grounding, citation, or confidence scoring mechanisms

**Remediation:**
- Implement output moderation before returning responses to users
- Add scope-enforcement checks (e.g., classifier to detect off-topic responses)
- Implement PII redaction on outputs
- Add grounding mechanisms such as RAG or citation requirements for factual claims
- Implement output length limits and information exposure controls

---

### FINDING 5: Unrestricted Tool Calls / No Authorization (Severity: CRITICAL)

**Lines 129-140**

The `handle_tool_call` function executes any tool the LLM requests with no authorization checks, scope validation, or confirmation:

```python
def handle_tool_call(tool_call):
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    if name == "lookup_claim":
        return lookup_claim(args["claim_id"])
    elif name == "process_refund":
        return process_refund(args["claim_id"], args["amount"])
```

**Controls violated:**
- **D003** (Restrict Unsafe Tool Calls) -- No input validation, permission checks, or scope enforcement on tool invocations
- **B006** (Prevent Unauthorized AI Agent Actions) -- Agent can process refunds with no human approval, no amount limits enforced in code, no verification of caller identity
- **A003** (Limit AI Agent Data Collection) -- Agent has unrestricted `SELECT *` access to entire customer and claims tables

**Specific issues:**
- `process_refund` (line 53) has no amount validation -- the system prompt says "$10,000 limit" but this is not enforced in code. The LLM could be manipulated to process any amount.
- No verification that the requesting user is authorized to view a given claim or customer record
- No human-in-the-loop for financial transactions
- `SELECT *` queries return all columns, potentially exposing unnecessary sensitive fields

**Remediation:**
- Enforce the $10,000 refund limit in code, not just in the prompt
- Implement user authentication and authorization -- verify the caller owns the claim before allowing access
- Require human approval for refund transactions above a threshold
- Restrict `SELECT` queries to only necessary columns
- Add input validation on all tool call parameters (type checking, range checking, format validation)
- Implement a tool call allowlist with per-user permission scoping

---

### FINDING 6: No PII Protection (Severity: CRITICAL)

**Entire file**

The agent handles customer PII (names, policy details, financial data) with zero PII protection mechanisms.

**Controls violated:**
- **A006** (Prevent PII Leakage) -- No PII detection, redaction, or filtering in prompts, outputs, or logs
- **A005** (Prevent Cross-Customer Data Exposure) -- No tenant isolation; any user could potentially look up any customer's data via prompt manipulation
- **A003** (Limit AI Agent Data Collection) -- `SELECT *` returns all data fields regardless of necessity

**Remediation:**
- Implement PII detection and redaction in logs and outputs
- Add tenant-scoping to all database queries (filter by authenticated user's customer ID)
- Restrict data fields returned from queries to only what is needed
- Implement RBAC with MFA for PII-containing systems
- Add DLP integration for output monitoring

---

### FINDING 7: No Logging or Audit Trail (Severity: HIGH)

**Entire file**

There is no logging of any kind -- no model activity logs, no tool call logs, no access logs, no error logs.

**Controls violated:**
- **E015** (Log Model Activity) -- No logging of AI system processes, actions, or model outputs
- **E016** (Implement AI Disclosure Mechanisms) -- No indication to users that they are interacting with AI (line 182 says "Insurance Claims Bot" but does not disclose it is AI)

**Remediation:**
- Implement structured logging for all LLM calls (input, output, model, tokens, latency)
- Log all tool calls with parameters and results
- Log all user interactions with session IDs
- Implement log retention policies
- Add clear AI disclosure: e.g., "You are chatting with an AI assistant. A human agent is available upon request."

---

### FINDING 8: No Error Handling (Severity: HIGH)

**Entire file**

No try/except blocks, no error handling for database failures, API failures, or malformed data.

**Lines 30-31, 34-39, 53-62, 129-140, 146-151**

**Controls violated:**
- **D003** (Restrict Unsafe Tool Calls) -- Unhandled errors in tool calls could leak stack traces or internal information
- **B009** (Limit Output Over-Exposure) -- Unhandled exceptions may expose internal system details
- **E001** (AI Failure Plan for Security Breaches) -- No failure handling or recovery mechanisms

**Remediation:**
- Wrap all database operations in try/except blocks with appropriate error handling
- Wrap LLM API calls with retry logic and error handling
- Return safe, generic error messages to users (never raw stack traces)
- Implement circuit breakers for external service calls

---

## Domain-by-Domain Compliance Assessment

### Domain A: Data & Privacy

| Control | Status | Notes |
|---------|--------|-------|
| A001: Input Data Policy | Not Implemented | No data policies defined or communicated |
| A002: Output Data Policy | Not Implemented | No output data policies |
| A003: Limit Data Collection | Not Implemented | `SELECT *` with no scoping (lines 37, 46, 57, 68) |
| A004: Protect IP & Trade Secrets | Not Implemented | No IP protection mechanisms |
| A005: Cross-Customer Data Exposure | Not Implemented | No tenant isolation (Finding 6) |
| A006: Prevent PII Leakage | Not Implemented | No PII detection or redaction (Finding 6) |
| A007: Prevent IP Violations | Not Implemented | No copyright/trademark filtering |

### Domain B: Security

| Control | Status | Notes |
|---------|--------|-------|
| B001: Third-Party Adversarial Testing | Not Implemented | No adversarial testing program |
| B004: Prevent Endpoint Scraping | Not Implemented | No rate limiting or quotas |
| B005: Real-Time Input Filtering | Not Implemented | No input filtering (Finding 3) |
| B006: Prevent Unauthorized Actions | Not Implemented | No scope enforcement (Finding 5) |
| B007: User Access Privileges | Not Implemented | No RBAC or authentication |
| B008: Protect Deployment Environment | Not Implemented | Hardcoded secrets (Finding 1) |
| B009: Limit Output Over-Exposure | Not Implemented | No output masking (Finding 4) |

### Domain C: Safety

| Control | Status | Notes |
|---------|--------|-------|
| C001: AI Risk Taxonomy | Not Implemented | No risk categorization |
| C002: Pre-Deployment Testing | Not Implemented | No test suite |
| C003: Prevent Harmful Outputs | Not Implemented | No output filtering (Finding 4) |
| C004: Prevent Out-of-Scope Outputs | Not Implemented | System prompt is weak guidance only |
| C005: Customer-Defined High-Risk Outputs | Not Implemented | No custom risk filtering |
| C006: Prevent Output Vulnerabilities | Not Implemented | SQL injection in generated queries (Finding 2) |
| C010: Third-Party Harmful Output Testing | Not Implemented | No third-party testing |
| C011: Third-Party Out-of-Scope Testing | Not Implemented | No third-party testing |
| C012: Third-Party Customer Risk Testing | Not Implemented | No third-party testing |

### Domain D: Reliability

| Control | Status | Notes |
|---------|--------|-------|
| D001: Prevent Hallucinations | Not Implemented | No grounding or citation mechanisms |
| D002: Third-Party Hallucination Testing | Not Implemented | No third-party testing |
| D003: Restrict Unsafe Tool Calls | Not Implemented | No tool call restrictions (Finding 5) |
| D004: Third-Party Tool Call Testing | Not Implemented | No third-party testing |

### Domain E: Accountability

| Control | Status | Notes |
|---------|--------|-------|
| E001: Failure Plan (Security) | Not Implemented | No failure plan |
| E002: Failure Plan (Harmful Outputs) | Not Implemented | No failure plan |
| E003: Failure Plan (Hallucinations) | Not Implemented | No failure plan |
| E004: Assign Accountability | Not Implemented | No change management |
| E005: Cloud vs On-Prem Assessment | Not Implemented | No assessment documented |
| E006: Vendor Due Diligence | Not Implemented | No vendor assessment of OpenAI |
| E008: Review Internal Processes | Not Implemented | No review processes |
| E010: Acceptable Use Policy | Not Implemented | No AUP |
| E011: Processing Locations | Not Implemented | No data flow documentation |
| E012: Regulatory Compliance | Not Implemented | No regulatory inventory (insurance is heavily regulated) |
| E015: Log Model Activity | Not Implemented | No logging (Finding 7) |
| E016: AI Disclosure | Not Implemented | No clear AI disclosure (Finding 7) |

### Domain F: Society

| Control | Status | Notes |
|---------|--------|-------|
| F001: Prevent Cyber Misuse | Not Implemented | SQL injection makes this exploitable (Finding 2) |
| F002: Prevent Catastrophic Misuse | Not Implemented | No content filtering |

---

## Prioritized Remediation Roadmap

### Phase 1: Critical Security Fixes (Week 1-2)

These must be fixed immediately regardless of certification timeline:

1. **Remove hardcoded credentials** (Finding 1) -- Move to environment variables/secrets manager. Rotate all exposed keys.
2. **Fix SQL injection vulnerabilities** (Finding 2) -- Convert all queries to parameterized queries.
3. **Enforce refund amount limits in code** (Finding 5, line 53) -- Add `if amount > 10000: raise ValueError`.
4. **Add basic error handling** (Finding 8) -- Wrap all external calls in try/except.

### Phase 2: Core Security Controls (Week 3-5)

5. **Implement user authentication and authorization** (B006, B007) -- Verify caller identity before any data access or transactions.
6. **Add input filtering/moderation** (B005) -- Integrate moderation API; add prompt injection detection.
7. **Add output filtering** (C003, C004, B009) -- Implement post-processing pipeline for harmful content, scope, and PII.
8. **Implement structured logging** (E015) -- Log all LLM calls, tool calls, and user interactions.
9. **Add AI disclosure** (E016) -- Clearly inform users they are interacting with an AI system.
10. **Implement PII detection and redaction** (A006) -- Scan inputs, outputs, and logs for PII.

### Phase 3: Data & Privacy Controls (Week 5-7)

11. **Implement tenant isolation** (A005) -- Scope all queries to authenticated user's data.
12. **Restrict data collection** (A003) -- Replace `SELECT *` with specific columns.
13. **Add rate limiting** (B004) -- Implement request throttling on the agent endpoint.
14. **Implement hallucination prevention** (D001) -- Add RAG, citation requirements, or confidence scoring.
15. **Add tool call restrictions** (D003) -- Input validation, permission checks, human-in-the-loop for refunds.

### Phase 4: Policy & Documentation (Week 7-10)

16. **Draft data policies** (A001, A002) -- Input/output data handling, retention, deletion.
17. **Create AI risk taxonomy** (C001) -- Document risk categories specific to insurance claims processing.
18. **Write failure plans** (E001, E002, E003) -- Security breach, harmful output, and hallucination response plans.
19. **Conduct vendor due diligence** (E006) -- Assess OpenAI's data handling, PII controls, security.
20. **Document regulatory compliance** (E012) -- Map insurance regulations, GDPR/CCPA, state insurance laws.
21. **Establish acceptable use policy** (E010) -- Define appropriate system usage boundaries.

### Phase 5: Third-Party Testing & Certification (Week 10-14)

22. **Engage third-party testers** (B001, C010, C011, C012, D002, D004) -- Quarterly adversarial, safety, and reliability testing.
23. **Conduct pre-deployment testing** (C002) -- Full test suite across all risk categories.
24. **Begin AIUC-1 certification process** -- Scoping, evidence gathering, audit.

---

## Summary of Violations by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 4 | Hardcoded secrets, SQL injection, no auth/authz, no tool call restrictions |
| High | 4 | No input filtering, no output safeguards, no logging, no error handling |
| Medium | 10+ | Missing policies, no PII protection, no tenant isolation, no disclosure |
| Low | 5+ | Missing documentation, transparency reports, monitoring dashboards |

**Total mandatory controls applicable:** ~40+
**Controls fully implemented:** 0
**Controls partially implemented:** 0
**Controls not implemented:** 40+

This agent requires substantial remediation across all six AIUC-1 domains before it can be considered for certification. The critical security vulnerabilities (hardcoded credentials, SQL injection, unrestricted financial transactions) represent immediate operational risk independent of any compliance framework.
