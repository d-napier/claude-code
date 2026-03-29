# AIUC-1 Complete Control List

All 51 controls across 6 domains. Each entry includes: ID, name, mandatory/optional status,
applicability (which agent types it applies to), and description with evidence requirements.

## Table of Contents

- [Domain A: Data & Privacy (7 controls)](#domain-a-data--privacy)
- [Domain B: Security (9 controls)](#domain-b-security)
- [Domain C: Safety (12 controls)](#domain-c-safety)
- [Domain D: Reliability (4 controls)](#domain-d-reliability)
- [Domain E: Accountability (17 controls)](#domain-e-accountability)
- [Domain F: Society (2 controls)](#domain-f-society)

---

## Domain A: Data & Privacy

### A001: Establish Input Data Policy
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Define and communicate AI input data policies covering model training usage, inference processing, data retention periods, and customer data rights. Implement technical controls enforcing retention and deletion policies with automated mechanisms. Document processes for handling data subject rights including opt-in/opt-out, access, portability, and deletion requests.
- **Evidence**: Policy documentation (ToS, Privacy Policy, DPA); technical implementation showing automated deletion; data subject rights processes.
- **Review cycle**: Every 12 months.

### A002: Establish Output Data Policy
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish AI output ownership, usage, opt-out, and deletion policies communicated to customers. Clarify ownership distinctions between AI-generated outputs vs inputs, permitted commercial uses, redistribution rights, and modification allowances. Disclose opt-out and deletion procedures for stored outputs, specifying retention periods and permission revocation mechanisms.
- **Evidence**: Policy documentation (ToS, MSA, Privacy Policy, AI Addendum).
- **Review cycle**: Every 12 months.

### A003: Limit AI Agent Data Collection
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement safeguards restricting AI agent data access to task-relevant information based on user roles and operational context. Configure data collection limits reducing exposure through scoped access per role/workflow requirements, avoiding persistent or out-of-scope collection. May include monitoring mechanisms logging deviations and integration with existing authorization systems.
- **Evidence**: Code implementing scoping/filtering logic; authentication failure alerting; authorization system integration verification.
- **Review cycle**: Every 12 months.

### A004: Protect IP & Trade Secrets
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement safeguards preventing AI systems from leaking company intellectual property or confidential information. Provide user guidance instructing against inputting trade secrets, proprietary code, or confidential business data into AI systems. May leverage foundation model provider protections (zero data retention, training prohibition clauses), implement output monitoring for proprietary information detection, and establish human review workflows for flagged sensitive disclosures.
- **Evidence**: User guidance documentation; provider contract protections; IP detection implementation; disclosure monitoring logs.
- **Review cycle**: Every 12 months.

### A005: Prevent Cross-Customer Data Exposure
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement safeguards preventing cross-customer data exposure when combining customer data from multiple sources. Establish explicit consent and disclosure when combining competitor data, implementing customer data isolation controls through logical/physical separation, tenant-specific encryption, and data flow boundary validation. May employ privacy-enhancing technologies reducing competitive exposure risks.
- **Evidence**: Consent/disclosure policies (DPA, ToS); customer isolation controls in database architecture; privacy-enhancing technology implementation.
- **Review cycle**: Every 12 months.

### A006: Prevent PII Leakage
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish safeguards preventing personal data leakage through AI outputs and logs. Implement filtering mechanisms for prompts/outputs detecting and redacting personal identifiers before storage/display. Require authentication and authorization (RBAC, MFA) for PII-containing systems. May integrate with DLP systems monitoring/blocking policy-violating outputs.
- **Evidence**: PII detection and filtering code; access control implementation; DLP system integration.
- **Review cycle**: Every 12 months.

### A007: Prevent IP Violations
- **Status**: Mandatory
- **Applicability**: External-facing agents; triggered by text, voice, image, and video modalities
- **Description**: Implement safeguards and technical controls preventing AI outputs from violating copyrights, trademarks, or third-party intellectual property rights. Controls should detect and prevent generation of infringing content, including unauthorized use of protected materials in model outputs.
- **Evidence**: Content filtering implementation; copyright detection mechanisms; policy documentation.

---

## Domain B: Security

### B001: Third-Party Testing of Adversarial Robustness
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement an adversarial testing program to validate system resilience against adversarial inputs and prompt injection attempts aligned with adversarial threat taxonomy. Includes red teaming, jailbreak testing, and prompt injection vulnerability assessments.
- **Evidence**: Third-party evaluation reports; testing methodology documentation; remediation records.
- **Testing frequency**: Quarterly (every 3 months).

### B002: Detect Adversarial Input
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Implement monitoring capabilities to detect and respond to adversarial inputs and prompt injection attempts. Includes systems to identify jailbreaks and malicious prompts in real-time.
- **Evidence**: Detection system implementation; monitoring dashboards; alert configuration.

### B003: Manage Public Release of Technical Details
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Implement controls to prevent over-disclosure of technical information about AI systems and organizational details that could enable adversarial targeting. Manage information about system architecture, capabilities, and vulnerabilities.
- **Evidence**: Information disclosure policies; review processes for public communications.

### B004: Prevent AI Endpoint Scraping
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement safeguards preventing probing or scraping of external AI endpoints. Deploy rate limiting, query quotas, and zero-trust verification mechanisms.
- **Evidence**: Rate limiting configuration; query quota implementation; verification mechanisms.

### B005: Implement Real-Time Input Filtering
- **Status**: Optional
- **Applicability**: Text-generation, Voice-generation, Image-generation
- **Description**: Implement real-time input filtering using automated moderation tools to prevent prompt injection, jailbreaks, and adversarial input attacks before processing.
- **Evidence**: Input filtering code; moderation tool configuration; filter effectiveness metrics.

### B006: Prevent Unauthorized AI Agent Actions
- **Status**: Mandatory
- **Applicability**: Automation (agents with tool access)
- **Description**: Implement safeguards preventing AI agents from performing actions beyond intended scope and authorized privileges. Enforce contextual access controls limiting agent capabilities.
- **Evidence**: Access control implementation; scope limitation code; authorization verification.

### B007: Enforce User Access Privileges to AI Systems
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish and maintain user access controls and administrative privileges for AI systems aligned with organizational policy. Implement role-based access and privilege management.
- **Evidence**: RBAC implementation; privilege management documentation; access audit logs.

### B008: Protect Model Deployment Environment
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement security measures for AI model deployment environments including encryption, access controls, and authorization mechanisms to protect against unauthorized access and modification.
- **Evidence**: Encryption configuration; deployment access controls; security architecture documentation.

### B009: Limit Output Over-Exposure
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Implement output limitations and obfuscation techniques safeguarding against information leakage. Use response filtering, fidelity reduction, and output masking to prevent unauthorized disclosure.
- **Evidence**: Output filtering implementation; masking/redaction code; information exposure testing results.

---

## Domain C: Safety

### C001: Define AI Risk Taxonomy
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish risk categorization covering harmful outputs, out-of-scope outputs, hallucinated content, tool calls, and application-specific risks.
- **Evidence**: Risk taxonomy document; category definitions; risk assessment methodology.

### C002: Conduct Pre-Deployment Testing
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Perform internal testing across risk categories before deployment, requiring formal review for system changes.
- **Evidence**: Test plans and results; formal review records; change management documentation.

### C003: Prevent Harmful Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation, Image-generation
- **Description**: Implement safeguards or technical controls to prevent harmful outputs including distressed outputs, angry responses, high-risk advice, offensive content, bias, and deception.
- **Evidence**: Content filtering implementation; output moderation configuration; harmful output detection metrics.

### C004: Prevent Out-of-Scope Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Deploy safeguards preventing outputs beyond defined scope, such as political discussion, healthcare advice, or other topics outside the agent's intended domain.
- **Evidence**: Scope definition documentation; boundary enforcement code; out-of-scope detection implementation.

### C005: Prevent Customer-Defined High-Risk Outputs
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement controls blocking additional high-risk outputs identified in the organization's risk taxonomy beyond the standard categories.
- **Evidence**: Customer risk taxonomy; custom filter implementation; blocking rules documentation.

### C006: Prevent Output Vulnerabilities
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish safeguards preventing security vulnerabilities in outputs from affecting downstream users (e.g., XSS in generated code, SQL injection in generated queries).
- **Evidence**: Output sanitization code; vulnerability scanning results; downstream impact assessment.

### C007: Flag High-Risk Outputs
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Implement an alerting system that flags high-risk outputs for human review.
- **Evidence**: Alerting system configuration; flagging criteria; human review workflow documentation.

### C008: Monitor AI Risk Categories
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Deploy monitoring systems tracking AI performance across identified risk categories.
- **Evidence**: Monitoring dashboards; performance metrics; risk category tracking reports.

### C009: Enable Real-Time Feedback and Intervention
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Establish mechanisms allowing users to provide immediate feedback and intervene during AI operation.
- **Evidence**: Feedback mechanism implementation; intervention controls; user interface elements.

### C010: Third-Party Testing for Harmful Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation, Image-generation
- **Description**: Appoint expert third parties evaluating system robustness quarterly against distressed outputs, anger, risky advice, offensive content, bias, and deception.
- **Evidence**: Third-party evaluation reports; testing methodology; remediation records.
- **Testing frequency**: Quarterly.

### C011: Third-Party Testing for Out-of-Scope Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Conduct quarterly third-party evaluations assessing system resilience to out-of-scope output generation.
- **Evidence**: Third-party evaluation reports; scope boundary testing results.
- **Testing frequency**: Quarterly.

### C012: Third-Party Testing for Customer-Defined Risk
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Arrange quarterly expert evaluations examining system resistance to organization-specific high-risk outputs.
- **Evidence**: Third-party evaluation reports; custom risk testing results.
- **Testing frequency**: Quarterly.

---

## Domain D: Reliability

### D001: Prevent Hallucinated Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Implement safeguards or technical controls to prevent hallucinated outputs. May include grounding mechanisms, retrieval-augmented generation, citation requirements, confidence scoring, or human verification for high-stakes outputs.
- **Evidence**: Hallucination prevention implementation; grounding mechanisms; accuracy metrics.
- **Testing frequency**: Quarterly (third-party).

### D002: Third-Party Testing for Hallucinations
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Appoint expert third-parties to evaluate hallucinated outputs at least every 3 months.
- **Evidence**: Third-party evaluation reports; hallucination rate metrics; remediation records.
- **Testing frequency**: Every 3 months.

### D003: Restrict Unsafe Tool Calls
- **Status**: Mandatory
- **Applicability**: Automation (agents with tool/API access)
- **Description**: Implement safeguards or technical controls to prevent tool calls in AI systems from executing unauthorized actions, accessing restricted information, or making decisions beyond their intended scope. Includes input validation, permission checks, and scope enforcement for all tool invocations.
- **Evidence**: Tool call authorization code; scope restriction implementation; permission verification logs.
- **Testing frequency**: Quarterly (third-party).

### D004: Third-Party Testing of Tool Calls
- **Status**: Mandatory
- **Applicability**: Automation (agents with tool/API access)
- **Description**: Appoint expert third-parties to evaluate tool calls in AI systems, including unauthorized actions, restricted information access, or out-of-scope decision-making at least every 3 months.
- **Evidence**: Third-party evaluation reports; tool call testing methodology; remediation records.
- **Testing frequency**: Every 3 months.

---

## Domain E: Accountability

### E001: AI Failure Plan for Security Breaches
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Document an AI failure plan addressing privacy and security breaches, assigning accountable owners and establishing notification and remediation procedures with third-party support (legal, PR, insurers).
- **Evidence**: Failure plan document; owner assignments; notification procedures; third-party contact list.

### E002: AI Failure Plan for Harmful Outputs
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation, Image-generation
- **Description**: Document an AI failure plan for harmful outputs causing significant customer harm, assigning accountable owners and establishing remediation with third-party support.
- **Evidence**: Failure plan document; escalation procedures; remediation workflow.

### E003: AI Failure Plan for Hallucinations
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation
- **Description**: Document an AI failure plan for hallucinated outputs causing substantial customer financial loss, assigning accountable owners and establishing remediation procedures.
- **Evidence**: Failure plan document; financial impact assessment procedures; owner assignments.

### E004: Assign Accountability
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Document which AI system changes across the development and deployment lifecycle require formal review or approval, assign a lead accountable for each, and document their approval with supporting evidence.
- **Evidence**: Change management policy; approval records with timestamps; accountable owner assignments.

### E005: Assess Cloud vs On-Prem Processing
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish criteria for selecting cloud providers and circumstances for on-premises processing, considering data sensitivity, regulatory requirements, security controls, and operational needs.
- **Evidence**: Cloud/on-prem decision framework; provider assessment records; data classification scheme.

### E006: Conduct Vendor Due Diligence
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish AI vendor due diligence processes for foundation and upstream model providers covering data handling, PII controls, security, and compliance.
- **Evidence**: Vendor assessment questionnaire; due diligence reports; provider compliance documentation.

### E007: Document System Change Approvals
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Merged with E004 as of Q1 2026 update. Maintain records of system change approvals with timestamps and rationale.

### E008: Review Internal Processes
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish regular internal reviews of key processes and document review records and approvals.
- **Evidence**: Review meeting records; process audit documentation; approval records.

### E009: Monitor Third-Party Access
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Implement systems to monitor third-party access to AI systems.
- **Evidence**: Access monitoring configuration; third-party access logs; alert rules.

### E010: Establish AI Acceptable Use Policy
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Establish and implement an AI acceptable use policy governing appropriate system usage.
- **Evidence**: Acceptable use policy document; communication records; enforcement mechanisms.

### E011: Record Processing Locations
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Document all AI data processing locations where systems operate and store information.
- **Evidence**: Processing location inventory; data flow diagrams; infrastructure documentation.

### E012: Document Regulatory Compliance
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Document applicable AI laws and standards, required data protections, and strategies for achieving compliance. References EU AI Act, NYC Local Law 144, NIST AI RMF, ISO 42001, GDPR, and sector-specific regulations.
- **Evidence**: Regulatory inventory; compliance strategy documentation; gap assessment.

### E013: Implement Quality Management System
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Establish a quality management system for AI systems proportionate to organizational size.
- **Evidence**: QMS documentation; quality metrics; review records.

### E014: Share Transparency Reports
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Merged with E017 as of Q1 2026 update. Share transparency reports about AI system performance and incidents.

### E015: Log Model Activity
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Maintain logs of AI system processes, actions, and model outputs (where permitted) to support incident investigation, auditing, and explanation of AI behavior.
- **Evidence**: Logging configuration; example log entries; log retention policies; monitoring dashboards.

### E016: Implement AI Disclosure Mechanisms
- **Status**: Mandatory
- **Applicability**: Universal
- **Description**: Implement clear disclosure mechanisms to inform users when they interact with AI systems rather than humans.
- **Evidence**: UI screenshots showing disclosure; disclosure policy; implementation code.

### E017: Document System Transparency Policy
- **Status**: Optional
- **Applicability**: Universal
- **Description**: Establish a system transparency policy and maintain a repository of model cards, datasheets, and interpretability reports for major systems.
- **Evidence**: Transparency policy; model cards; datasheets; interpretability reports.

---

## Domain F: Society

### F001: Prevent AI Cyber Misuse
- **Status**: Mandatory
- **Applicability**: Text-generation, Automation, Voice-generation
- **Description**: Implement or document guardrails to prevent AI-enabled misuse for cyber attacks and exploitation. Evidence should demonstrate safeguards preventing the system from being weaponized for cyberattack purposes, including prompt filters, output restrictions, or documented policies limiting malicious use scenarios.
- **Evidence**: Cyber misuse prevention filters; output restriction implementation; policy documentation.

### F002: Prevent Catastrophic Misuse
- **Status**: Mandatory
- **Applicability**: Text-generation, Voice-generation, Image-generation
- **Description**: Implement or document guardrails to prevent AI-enabled catastrophic system misuse (chemical, biological, radiological, nuclear — CBRN). Evidence should demonstrate controls preventing generation of information facilitating CBRN weapons development or deployment, such as content filters, restricted knowledge access, or authorization-based output limitations.
- **Evidence**: CBRN content filtering implementation; restricted knowledge controls; policy documentation.

---

## Control Applicability by Modality

Controls triggered by specific input/output modalities:

**Text inputs/outputs trigger**: A007, B005, B009, C003, C004, C010, C011, D001, D002, E002, E003, F001, F002

**Voice inputs/outputs trigger**: A007, B005, B009, C003, C004, C010, C011, D001, D002, E002, E003, F001, F002

**Image inputs/outputs trigger**: A007, B005, C003, C010, E002, F002

**Video inputs/outputs trigger**: A007, B005, C003, C010, E002, F002

**Automation (tool access) triggers**: B006, D003, D004, F001

**Universal controls** (apply to all agents): A001-A006, B001, B002, B003, B004, B007, B008, C001, C002, C004-C009, C012, E001, E004-E017
