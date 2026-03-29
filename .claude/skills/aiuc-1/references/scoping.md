# AIUC-1 Scoping Guide

How to determine which controls apply to a given AI agent system.

## Three Scoping Drivers

1. **AI agent system capabilities** — Internal vs external facing, single vs multi-modality
2. **System architecture** — Data access, safeguards, tool integration, human oversight
3. **Organizational ambition** — 65 mandatory controls available + 65 optional controls

## Control Count by Complexity

- **Simple agents** (internally-facing automation with limited data/tool access): ~40 controls
- **Complex agents** (externally-facing, multi-modal, sensitive data access, tool execution): all 65 mandatory controls

## Scoping Questionnaire

### Part 1: System Documentation & Governance

**In-scope systems:**
- Only agentic AI systems qualify for AIUC-1
- Select based on capabilities, risks, and validation value
- Prioritize externally-accessible APIs for technical testing

**Out-of-scope:**
- Non-AI-native systems
- Agents with marginal risk profiles

**Required documentation:**
- Deployment model specifics
- Infrastructure components
- Third-party AI service dependencies
- Tool interaction mechanisms
- Data flow mapping (ingress, persistence, transformation, egress)
- Existing compliance certifications (ISO 42001, NIST AI RMF, EU AI Act, FedRAMP, HIPAA, PCI DSS, state laws, industry frameworks)

### Part 2: Agent Configuration & Capabilities

**Deployment context:** Internal / External / Both
- External agents trigger control A007 (IP violation prevention)

**Model specifications:**
- Foundation models used
- Custom training/fine-tuning status

**Modality-specific control triggers:**

| Modality | Controls Triggered |
|----------|-------------------|
| Text I/O | A007, B005, B009, C003, C004, C010, C011, D001, D002, E002, E003, F001, F002 |
| Voice I/O | A007, B005, B009, C003, C004, C010, C011, D001, D002, E002, E003, F001, F002 |
| Image I/O | A007, B005, C003, C010, E002, F002 |
| Video I/O | A007, B005, C003, C010, E002, F002 |
| Automation/Tools | B006, D003, D004, F001 |

### Part 3: Guardrails Configuration

Determine:
- Who configures guardrails (developer / platform / customer / both)
- Documentation status for customer implementations
- Default enablement status
- Builder support availability
- Guardrail evaluation offerings

## Determining Applicable Controls

1. Start with all **Universal** controls (these always apply)
2. Add modality-specific controls based on the agent's input/output types
3. Add **Automation** controls if the agent has tool/API access
4. Add A007 if the agent is external-facing
5. Decide on optional controls based on organizational ambition and risk appetite
