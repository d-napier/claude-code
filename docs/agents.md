# Presales Intelligence Engine — Agent Catalog

## How Agents Work

Each agent is a specialized, autonomous unit that receives a scoped brief from the orchestrator, executes a focused task, and writes its output to a deterministic result file. Agents can run in parallel within a phase when their inputs are independent. The orchestrator reads the opportunity context, selects which agents to invoke (some are conditional — e.g., industry specialists are chosen based on the prospect's sector), and assembles the final deliverable from their combined outputs.

### Output Convention

Every agent writes to a predictable path under the opportunity workspace:

```
opportunities/<opportunity-id>/
├── orchestration-summary.md
├── opportunity-monitor.md
├── 1-company-research.md
├── 1-data-normalization.md
├── 2-stakeholder-map.md
├── 2-lead-conversation-starter.md
├── 2-pain-point-analysis.md
├── ...
├── 3-deal-risk-assessment.md
├── ...
├── 4-engagement-strategy.md
├── 4-interactive-demos.md
├── demos/
│   ├── workflow-automation.html
│   └── data-pipeline.html
├── 7-meeting-debrief-2026-02-22.md
├── win-loss-analysis.md
└── account-expansion.md
```

The numeric prefix indicates the phase. Files without a prefix are cross-cutting artifacts produced outside the linear pipeline.

---

## Agent Reference

### Cross-Cutting — Orchestration & Lifecycle

These agents operate outside the linear phase sequence. They coordinate the pipeline, analyze outcomes, and plan forward.

---

#### `orchestration-summary`

| | |
|---|---|
| **Phase** | — (coordinates all phases) |
| **Result file** | `orchestration-summary.md` |

**Purpose.** The meta-agent that drives the entire pipeline. It reads the opportunity brief, determines which phases and agents to invoke, manages execution order and parallelism, and produces a single executive summary that stitches together every agent's output.

**Responsibilities:**
- Parse the incoming opportunity context (CRM record, account name, known contacts, deal stage).
- Select the correct industry specialist based on the prospect's sector classification.
- Invoke Phase 1–7 agents in dependency order, parallelizing where possible.
- Collect all result files and generate a unified executive briefing with key findings, recommended next steps, qualification score, and risk flags.
- Track which agents completed, which were skipped (and why), and flag any data gaps.

**Inputs:** Opportunity ID, CRM metadata, user-supplied context (e.g., meeting notes, RFP).
**Outputs:** `orchestration-summary.md` — executive briefing covering the full opportunity picture with links to each agent's detailed report.

---

#### `win-loss-analyzer`

| | |
|---|---|
| **Phase** | — (post-outcome) |
| **Result file** | `win-loss-analysis.md` |

**Purpose.** Runs after a deal closes (won or lost) to extract lessons that improve future pipeline accuracy and presales execution.

**Responsibilities:**
- Compare the original qualification score and risk assessment against the actual outcome.
- Identify which signals were predictive and which were misleading.
- Analyze competitor dynamics — was the winner predicted correctly?
- Surface patterns by tagging the analysis with industry, deal size, competitor set, and sales cycle length for cross-deal querying.
- Recommend weight adjustments to the qualification scoring model.
- Capture qualitative feedback from the account executive and solutions engineer.

**Inputs:** Closed opportunity record, all prior agent outputs, AE/SE debrief notes.
**Outputs:** `win-loss-analysis.md` — structured post-mortem with scoring-model feedback, pattern tags, and actionable takeaways.

---

#### `account-expansion-planner`

| | |
|---|---|
| **Phase** | — (post-win) |
| **Result file** | `account-expansion.md` |

**Purpose.** Activates after a deal is won to identify expansion, upsell, and cross-sell opportunities within the account.

**Responsibilities:**
- Map the customer's remaining unaddressed pain points from the original need analysis.
- Identify adjacent business units, geographies, or use cases that could benefit from the solution.
- Track product usage signals and adoption metrics to time expansion conversations.
- Build a 30/60/90-day engagement plan for the post-sale period.
- Recommend which agents to re-run (e.g., `stakeholder-mapper` for a new business unit, `use-case-ideator` for new departments).

**Inputs:** Won opportunity record, all prior agent outputs, product usage data, customer success notes.
**Outputs:** `account-expansion.md` — expansion roadmap with prioritized opportunities, stakeholder targets, and timing recommendations.

---

#### `opportunity-monitor`

| | |
|---|---|
| **Phase** | — (continuous, runs throughout deal lifecycle) |
| **Result file** | `opportunity-monitor.md` |

**Purpose.** Provide always-on, event-driven monitoring of the opportunity from pipeline entry through close. Detects signal changes, triggers agent re-runs, tracks score trajectories, and applies decay modeling to keep intelligence current.

**Responsibilities:**
- **Event-driven re-evaluation**: Watch for triggering events — CRM stage changes, new meeting transcripts, stakeholder departures, competitor mentions, email activity spikes or drops — and invoke the appropriate agents to refresh affected outputs.
- **Trend tracking**: Maintain a time-series of qualification scores, risk levels, and engagement metrics. Alert the presales team when the trajectory shifts significantly (positive or negative) with an explanation of the driving factors.
- **Decay modeling**: Gradually reduce the confidence level and effective qualification score when no new data arrives within a configurable freshness window (e.g., 7/14/30 days). Flag stale data points that need refresh.
- **Re-run orchestration**: Determine which agents need to re-run in response to each event type (e.g., new competitor detected → `competitive-intelligence`; champion left → `stakeholder-mapper` + `deal-risk-assessor`; new meeting → `meeting-debrief-analyzer`).
- **Feedback loop**: After deal close, feed the outcome (won/lost, actual revenue, cycle length) back into the scoring model weights used by `deal-qualification-scorer` and `deal-risk-assessor` to improve future accuracy.
- **Alert generation**: Produce configurable alerts delivered via CRM, Slack, or email for critical events: score drops below threshold, risk escalation, stagnation warnings, and champion changes.

**Inputs:** CRM event stream, email/calendar activity feed, all prior agent outputs, scoring model configuration.
**Outputs:** `opportunity-monitor.md` — current health dashboard, score trend history, active alerts, decay status, and re-run log. Updated continuously.

---

## Phase 1 — Research & Data Collection

Gather comprehensive intelligence on the target company before any direct engagement.

---

#### `company-research-presales`

| | |
|---|---|
| **Phase** | 1 |
| **Result file** | `1-company-research.md` |

**Purpose.** Produce a deep-dive company profile that gives the presales team full situational awareness before the first conversation.

**Responsibilities:**
- Compile firmographic data: industry, sub-industry, headquarters, employee count, revenue, funding history, ownership structure.
- Summarize recent news: earnings reports, M&A activity, executive hires/departures, product launches, partnerships.
- Extract strategic priorities from earnings calls, annual reports, investor presentations, and press releases.
- Map the technology landscape: known cloud providers, SaaS tools, development platforms, and legacy systems (from job postings, technographic providers, and public documentation).
- Identify organizational structure: key business units, subsidiaries, and geographic footprint.
- Flag regulatory or compliance context relevant to the prospect's industry and geography.

**Inputs:** Company name, domain, CRM account record, optional user-supplied context.
**Outputs:** `1-company-research.md` — structured company dossier covering financials, strategy, technology, organization, and news.

---

#### `data-normalizer`

| | |
|---|---|
| **Phase** | 1 |
| **Result file** | `1-data-normalization.md` |

**Purpose.** Transform raw, heterogeneous data from all ingestion sources into a clean, deduplicated, and consistently structured opportunity record that downstream agents can consume reliably.

**Responsibilities:**
- Map fields from CRM, firmographic providers, technographic tools, and conversation artifacts into the canonical data model (account, contact, opportunity, activity).
- Deduplicate contacts and accounts using fuzzy matching on name, email domain, title, and company affiliation.
- Resolve entity conflicts — when two sources disagree on a field value (e.g., employee count), apply a source-priority hierarchy and flag the discrepancy.
- Normalize all timestamps to UTC and assign a freshness score to each data point so downstream agents can weight recent signals more heavily.
- Detect and tag missing or incomplete fields, recording which sources were consulted and which returned no data.
- Produce a data-completeness scorecard showing coverage percentage per data category (firmographic, technographic, stakeholder, financial, conversation).
- Output a clean, merged record that becomes the single source of truth for all Phase 2+ agents.

**Inputs:** `1-company-research.md`, raw CRM export, firmographic API responses, technographic feeds, conversation transcripts.
**Outputs:** `1-data-normalization.md` — merged canonical record, deduplication log, entity-resolution decisions, freshness scores, and data-completeness scorecard.

---

## Phase 2 — Analysis & Intelligence

With research in hand, analyze the opportunity from multiple angles. Most Phase 2 agents run in parallel.

---

#### `stakeholder-mapper`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-stakeholder-map.md` |

**Purpose.** Identify and map the buying committee — every person who influences, evaluates, approves, or can block the deal.

**Responsibilities:**
- Enumerate known contacts from CRM, meeting invites, email threads, and LinkedIn.
- Classify each stakeholder by role: Economic Buyer, Technical Evaluator, Champion, Coach, End User, Gatekeeper, Blocker.
- Score influence and engagement level per contact (seniority, interaction frequency, initiative ownership).
- Detect coverage gaps — missing roles that must be filled for the deal to advance.
- Recommend relationship-building actions for each stakeholder.
- Map reporting lines and political dynamics where data is available.

**Inputs:** CRM contacts, meeting attendees, email metadata, `1-company-research.md`.
**Outputs:** `2-stakeholder-map.md` — visual-ready stakeholder grid with roles, influence scores, engagement status, and gap analysis.

---

#### `lead-conversation-starter`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-lead-conversation-starter.md` |

**Purpose.** Generate personalized, insight-led conversation openers and outreach messaging for each key stakeholder.

**Responsibilities:**
- Synthesize company research and stakeholder profiles into tailored talking points.
- Craft persona-specific ice-breakers: technical depth for engineers, business outcomes for executives, operational efficiency for line managers.
- Reference recent company events (funding rounds, product launches, regulatory changes) to demonstrate preparation.
- Suggest discovery questions that surface pain points naturally without sounding scripted.
- Produce email templates, LinkedIn message drafts, and call-opener scripts.
- Adapt tone and vocabulary to the prospect's industry and corporate culture.

**Inputs:** `1-company-research.md`, `2-stakeholder-map.md`.
**Outputs:** `2-lead-conversation-starter.md` — per-stakeholder outreach messaging with discovery questions and conversation guides.

---

#### `ai-opportunity-analyzer`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-ai-opportunity-analysis.md` |

**Purpose.** Assess the prospect's AI and automation maturity, identify where AI can address their pain points, and gauge their readiness to adopt AI-powered solutions.

**Responsibilities:**
- Evaluate current AI/ML adoption: existing models in production, data infrastructure maturity, internal AI teams.
- Score AI readiness across dimensions: data availability, technical talent, executive sponsorship, budget allocation, and organizational culture.
- Identify high-impact AI use cases specific to the prospect's business and industry.
- Map the prospect's stated priorities to AI-addressable problems.
- Assess competitive pressure — are peers or competitors already deploying AI in ways that create urgency?
- Flag potential blockers: data quality issues, regulatory constraints, organizational resistance.

**Inputs:** `1-company-research.md`, technographic data, job postings, public AI/ML mentions.
**Outputs:** `2-ai-opportunity-analysis.md` — AI readiness scorecard, prioritized use-case list, and adoption roadmap recommendations.

---

#### `competitive-intelligence`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-competitive-intelligence.md` |

**Purpose.** Map the competitive landscape for this specific deal and arm the presales team with differentiation strategies.

**Responsibilities:**
- Identify which competitors are in the evaluation (from CRM intel, RFP requirements, prospect mentions, technographic signals).
- Build a feature-by-feature comparison matrix for each detected competitor.
- Surface historical win/loss rates against each competitor, filtered by industry, deal size, and region.
- Identify each competitor's known weaknesses and common objections prospects raise about them.
- Draft positioning statements and battlecard talking points specific to this deal's context.
- Flag competitive risks: incumbent advantage, existing contracts, relationship depth.

**Inputs:** `1-company-research.md`, CRM competitor fields, RFP/RFI documents, win/loss database.
**Outputs:** `2-competitive-intelligence.md` — competitor profiles, comparison matrix, battlecard, and win-rate analysis.

---

#### `brand-aligned-design-doc`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-brand-design-spec.md` |

**Purpose.** Produce a design specification that ensures all customer-facing deliverables (demos, proposals, presentations) align with the prospect's brand identity.

**Responsibilities:**
- Extract the prospect's brand elements: primary/secondary colors, logo usage, typography, and visual tone from their website and public materials.
- Define a design spec for demos, slide decks, and documents that blend your brand with the prospect's — signaling partnership rather than a generic pitch.
- Specify layout templates, color palettes, and typography pairings for interactive demos.
- Provide CSS variables or design tokens that downstream agents (e.g., `interactive-demo-builder`) can consume directly.
- Include guidance on tone of voice, imagery style, and data visualization conventions that match the prospect's corporate communication patterns.

**Inputs:** Prospect's website URL, `1-company-research.md`, internal brand guidelines.
**Outputs:** `2-brand-design-spec.md` — brand alignment guide with color codes, typography, layout specs, CSS tokens, and tone guidance.

---

#### `pain-point-analyzer`

| | |
|---|---|
| **Phase** | 2 |
| **Result file** | `2-pain-point-analysis.md` |

**Purpose.** Extract, classify, and score the prospect's business pain points from conversation transcripts, documents, and public signals to build a structured problem map that drives use-case selection, value engineering, and engagement strategy.

**Responsibilities:**
- Run NLP-based keyword and topic extraction across all conversation artifacts (call recordings, email threads, meeting notes, RFP/RFI documents) to surface recurring themes (e.g., "data silos," "manual processes," "compliance deadline," "cost overruns").
- Classify extracted topics into a taxonomy of known pain-point categories: operational inefficiency, security gaps, scalability limits, regulatory pressure, talent shortage, customer experience degradation, time-to-market delays, and data quality issues.
- Assign an urgency score (1–5) to each pain point based on language intensity ("critical," "must have," "by Q3"), mention of hard deadlines, executive involvement, and frequency of recurrence across conversations.
- Perform gap mapping: cross-reference each identified pain point against the product capability matrix to determine alignment (strong fit, partial fit, no fit) and white-space (prospect needs with no current product answer).
- Rank pain points by a composite of urgency, business impact, and product fit to produce a prioritized problem list.
- Track pain-point evolution across multiple conversations to detect whether issues are escalating or being resolved independently.

**Inputs:** `1-company-research.md`, `1-data-normalization.md`, conversation transcripts, RFP/RFI documents, email threads, meeting notes.
**Outputs:** `2-pain-point-analysis.md` — classified and ranked pain-point inventory with urgency scores, product-fit indicators, gap map, and evolution timeline.

---

### Industry Specialist Agents

Industry specialists are conditionally invoked — the orchestrator selects exactly one based on the prospect's sector classification. Each specialist contributes domain-specific context that generic agents cannot provide.

All industry specialists share a common responsibility set, specialized to their vertical:

- **Regulatory landscape**: Key regulations, compliance frameworks, and upcoming legislative changes.
- **Industry pain points**: Sector-specific challenges and how they manifest in technology decisions.
- **Buying patterns**: Typical procurement cycles, budget timing, decision hierarchies, and evaluation criteria.
- **Use-case library**: Curated list of high-impact use cases proven in the vertical.
- **Terminology & language**: Industry jargon, acronyms, and framing that resonates with practitioners.
- **Reference context**: Relevant customer stories, case studies, and proof points from the vertical.
- **Risk factors**: Industry-specific deal risks (regulatory shifts, seasonal budget freezes, long procurement cycles).

| Agent | Result File | Sector Coverage |
|---|---|---|
| `fsi-specialist` | `2-fsi-specialist.md` | Banking, insurance, capital markets, payments, fintech |
| `healthcare-life-sciences-specialist` | `2-healthcare-specialist.md` | Hospitals, pharma, biotech, medical devices, payers |
| `manufacturing-specialist` | `2-manufacturing-specialist.md` | Discrete & process manufacturing, industrial IoT, supply chain |
| `retail-cpg-specialist` | `2-retail-cpg-specialist.md` | Retail, e-commerce, consumer packaged goods, grocery |
| `saas-tech-specialist` | `2-saas-tech-specialist.md` | Software companies, cloud platforms, developer tools |
| `sports-entertainment-specialist` | `2-sports-entertainment-specialist.md` | Sports leagues, venues, ticketing, live entertainment, gaming |
| `energy-utilities-specialist` | `2-energy-utilities-specialist.md` | Oil & gas, renewables, utilities, grid operators |
| `telecommunications-specialist` | `2-telecommunications-specialist.md` | Telcos, ISPs, cable, network infrastructure, 5G |
| `transportation-logistics-specialist` | `2-transportation-logistics-specialist.md` | Freight, shipping, airlines, fleet management, last-mile delivery |
| `government-public-sector-specialist` | `2-government-public-sector-specialist.md` | Federal, state/local, defense, public safety, civic tech |
| `hospitality-travel-specialist` | `2-hospitality-travel-specialist.md` | Hotels, airlines, OTAs, cruise lines, restaurants |
| `real-estate-construction-specialist` | `2-real-estate-construction-specialist.md` | Commercial/residential real estate, property management, construction |
| `education-specialist` | `2-education-specialist.md` | K-12, higher education, edtech, corporate training |
| `media-advertising-specialist` | `2-media-advertising-specialist.md` | Publishing, streaming, ad tech, content platforms, agencies |
| `professional-services-specialist` | `2-professional-services-specialist.md` | Consulting, legal, accounting, staffing, managed services |
| `agriculture-food-specialist` | `2-agriculture-food-specialist.md` | Farming, agtech, food processing, distribution, ag commodities |

**Inputs (all specialists):** `1-company-research.md`, `2-ai-opportunity-analysis.md`, CRM industry tags.
**Outputs:** `2-<industry>-specialist.md` — regulatory brief, vertical pain points, buying-pattern guidance, curated use cases, terminology glossary, and reference stories.

---

## Phase 3 — Discovery & Qualification

Deepen understanding through technical discovery and formal qualification scoring.

---

#### `technical-discovery`

| | |
|---|---|
| **Phase** | 3 |
| **Result file** | `3-technical-discovery.md` |

**Purpose.** Conduct a structured technical assessment of the prospect's environment to identify integration points, constraints, and architectural fit.

**Responsibilities:**
- Map the prospect's current architecture: cloud infrastructure, data stores, APIs, CI/CD pipelines, security posture.
- Identify integration requirements: what systems must the solution connect to, what protocols and formats are in use.
- Assess data readiness: volume, velocity, quality, governance, and accessibility of relevant data assets.
- Document technical constraints: on-prem requirements, air-gapped environments, latency SLAs, data residency rules.
- Generate a technical discovery questionnaire tailored to gaps in current knowledge.
- Produce an architecture compatibility matrix comparing the prospect's environment against solution requirements.

**Inputs:** `1-company-research.md`, technographic data, meeting transcripts, RFP/RFI technical sections.
**Outputs:** `3-technical-discovery.md` — architecture assessment, integration map, data readiness evaluation, constraints register, and tailored discovery questions.

---

#### `use-case-ideator`

| | |
|---|---|
| **Phase** | 3 |
| **Result file** | `3-use-cases.md` |

**Purpose.** Brainstorm, evaluate, and prioritize concrete use cases that demonstrate clear value for the prospect.

**Responsibilities:**
- Generate a long list of candidate use cases by combining pain-point analysis, industry specialist output, and AI opportunity analysis.
- Score each use case across dimensions: business impact, technical feasibility, time to value, data readiness, and organizational readiness.
- Prioritize into tiers: quick wins (< 30 days), medium-term (1–3 months), and strategic (3–12 months).
- For each top-tier use case, outline: problem statement, proposed solution, expected outcomes, required data, integration points, and success metrics.
- Map use cases to stakeholders who would champion or benefit from each.
- Flag dependencies between use cases and suggest a sequencing strategy.

**Inputs:** `1-company-research.md`, `2-ai-opportunity-analysis.md`, `2-<industry>-specialist.md`, `3-technical-discovery.md`.
**Outputs:** `3-use-cases.md` — scored and prioritized use-case catalog with detailed briefs for top candidates.

---

#### `deal-qualification-scorer`

| | |
|---|---|
| **Phase** | 3 |
| **Result file** | `3-deal-qualification.md` |

**Purpose.** Apply a formal qualification framework to produce an objective, evidence-backed score for the opportunity.

**Responsibilities:**
- Score the opportunity against MEDDPICC dimensions:
  - **Metrics** — Can the prospect quantify the business impact?
  - **Economic Buyer** — Is the budget holder identified and engaged?
  - **Decision Criteria** — Are evaluation criteria defined and favorable?
  - **Decision Process** — Is the approval workflow mapped with timeline?
  - **Paper Process** — Are legal, procurement, and security steps understood?
  - **Identified Pain** — Is there a validated, urgent pain point?
  - **Champion** — Is there an active internal advocate?
  - **Competition** — Is the competitive position favorable?
- Assign per-dimension scores (0–10) with evidence citations from upstream agent outputs.
- Compute a weighted composite score (0–100) with configurable weights.
- Calculate a confidence interval based on data completeness across dimensions.
- Generate a gap analysis: which dimensions are weakest and what actions would improve them.
- Recommend a deal stage and forecast category based on the score.

**Inputs:** All Phase 1 and Phase 2 outputs, `3-technical-discovery.md`, `3-use-cases.md`.
**Outputs:** `3-deal-qualification.md` — MEDDPICC scorecard, composite score, confidence interval, gap analysis, and stage recommendation.

---

#### `deal-risk-assessor`

| | |
|---|---|
| **Phase** | 3 |
| **Result file** | `3-deal-risk-assessment.md` |

**Purpose.** Identify deal-execution risks — factors that could cause the opportunity to slip, shrink, stall, or be lost — and recommend mitigations distinct from the regulatory/compliance risks handled by `risk-compliance-guardian`.

**Responsibilities:**
- **Timeline risk**: Flag deals where the stated close date is inconsistent with the remaining decision-process steps, procurement lead times, or budget cycle timing.
- **Budget risk**: Detect mismatches between the proposed deal size and the prospect's known budget cycles, spending authority levels, or recent cost-cutting signals.
- **Champion risk**: Alert if the identified champion has gone silent (no activity in a configurable window), changed roles, or left the company.
- **Competitive risk**: Elevate risk severity if a competitor with a strong historical win rate in this segment, or an incumbent with deep integration, is in the evaluation.
- **Stagnation detection**: Trigger warnings if no meaningful activity (emails, meetings, document exchanges, CRM stage changes) has occurred within a configurable window.
- **Scope creep risk**: Flag when requirements are expanding without corresponding budget or timeline adjustments.
- **Single-thread risk**: Warn when the deal depends on a single stakeholder relationship with no multi-threaded engagement.
- Produce a risk register with severity ratings (low / medium / high / critical), evidence citations, and recommended mitigation actions for each risk.

**Inputs:** `3-deal-qualification.md`, `2-stakeholder-map.md`, `2-competitive-intelligence.md`, `2-pain-point-analysis.md`, CRM activity log, historical win/loss patterns.
**Outputs:** `3-deal-risk-assessment.md` — risk register with severity ratings, evidence, mitigation recommendations, and an aggregate deal-health score.

---

## Phase 4 — Solution Design & Validation

Design the solution, prove its value, and build the artifacts that move the deal forward.

---

#### `value-engineer`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-value-engineering.md` |

**Purpose.** Build a quantified business case that translates technical capabilities into financial outcomes the Economic Buyer cares about.

**Responsibilities:**
- Construct an ROI model for each prioritized use case: cost savings, revenue uplift, productivity gains, risk reduction.
- Estimate Total Cost of Ownership (TCO) including licensing, implementation, training, maintenance, and opportunity cost.
- Benchmark against industry averages and comparable customer outcomes.
- Model scenarios: conservative, expected, and optimistic projections with stated assumptions.
- Calculate payback period, NPV, and IRR for executive-level business cases.
- Produce presentation-ready value narratives and visualizations.

**Inputs:** `3-use-cases.md`, `3-deal-qualification.md`, `2-<industry>-specialist.md`, customer benchmark data.
**Outputs:** `4-value-engineering.md` — ROI models, TCO analysis, scenario projections, and executive-ready business case.

---

#### `poc-builder`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-poc-specification.md` |

**Purpose.** Design a proof-of-concept that validates the top use case(s) with minimal effort and maximum impact.

**Responsibilities:**
- Select the use case(s) best suited for POC: high impact, demonstrable in a short timeframe, data available.
- Define POC scope: what will be built, what is out of scope, and what success looks like.
- Specify technical requirements: data sources, APIs, environments, access, and infrastructure.
- Draft a timeline with milestones, checkpoints, and a go/no-go decision framework.
- Identify risks to POC success and mitigation strategies.
- Define success criteria with quantitative thresholds agreed upon by both parties.
- Outline resource requirements from both vendor and prospect sides.

**Inputs:** `3-use-cases.md`, `3-technical-discovery.md`, `4-value-engineering.md`.
**Outputs:** `4-poc-specification.md` — POC scope document, timeline, success criteria, resource plan, and risk mitigations.

---

#### `risk-compliance-guardian`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-risk-compliance.md` |

**Purpose.** Proactively identify regulatory, compliance, and security concerns that could derail or delay the deal, and prepare responses.

**Responsibilities:**
- Map applicable regulations based on industry, geography, and data types involved (GDPR, HIPAA, SOC 2, FedRAMP, PCI-DSS, etc.).
- Assess the solution's compliance posture against each applicable framework.
- Pre-populate security questionnaire responses using the internal compliance knowledge base.
- Identify data residency, sovereignty, and cross-border transfer requirements.
- Flag areas where additional certifications, audits, or contractual clauses may be needed.
- Prepare a compliance narrative that positions the solution as a risk-reducer rather than a risk-introducer.

**Inputs:** `1-company-research.md`, `2-<industry>-specialist.md`, `3-technical-discovery.md`, internal compliance docs.
**Outputs:** `4-risk-compliance.md` — regulatory matrix, pre-filled security questionnaire, compliance gap analysis, and risk-mitigation narrative.

---

#### `reference-story-builder`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-reference-stories.md` |

**Purpose.** Surface and tailor customer success stories that resonate with this specific prospect's situation.

**Responsibilities:**
- Query the reference database for customers matching the prospect's industry, size, use case, and technical environment.
- Rank references by relevance: same vertical > same use case > same scale > same region.
- Draft tailored reference narratives that emphasize parallels to the prospect's situation.
- Suggest specific reference contacts willing to participate in calls and their areas of expertise.
- Prepare prospect-specific talking points for the reference contact to maximize impact.
- Identify anti-patterns: references to avoid due to industry rivalry or negative associations.

**Inputs:** `1-company-research.md`, `3-use-cases.md`, `2-<industry>-specialist.md`, reference database.
**Outputs:** `4-reference-stories.md` — ranked reference list, tailored narratives, suggested contacts, and talking-point guides.

---

#### `change-management-advisor`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-change-management.md` |

**Purpose.** Anticipate organizational adoption challenges and provide a change management blueprint that de-risks the implementation.

**Responsibilities:**
- Assess organizational readiness: culture, change fatigue, executive sponsorship strength, and prior transformation outcomes.
- Identify adoption barriers: skill gaps, workflow disruption, role changes, and political resistance.
- Design a stakeholder communication plan: who needs to hear what, when, and from whom.
- Recommend a training and enablement strategy tailored to different user personas.
- Propose success metrics that track adoption (not just deployment).
- Outline a phased rollout plan that manages risk and builds internal momentum.

**Inputs:** `2-stakeholder-map.md`, `3-use-cases.md`, `2-<industry>-specialist.md`, `1-company-research.md`.
**Outputs:** `4-change-management.md` — readiness assessment, barrier analysis, communication plan, training strategy, and phased rollout recommendation.

---

#### `partner-solution-architect`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-partner-architecture.md` |

**Purpose.** Design the partner ecosystem integration strategy — which implementation partners, ISVs, or system integrators should be involved and how.

**Responsibilities:**
- Identify relevant partners from the partner ecosystem that have expertise in the prospect's industry, geography, or technology stack.
- Recommend a partner engagement model: co-sell, co-build, referral, or managed service.
- Map partner capabilities to solution gaps — what the partner delivers vs. what you deliver.
- Design the joint architecture: integration points, responsibility boundaries, and support model.
- Draft a joint value proposition that positions the combined solution.
- Flag potential partner conflicts or overlapping capabilities.

**Inputs:** `3-technical-discovery.md`, `3-use-cases.md`, `2-<industry>-specialist.md`, partner catalog.
**Outputs:** `4-partner-architecture.md` — partner recommendations, engagement model, joint architecture, and combined value proposition.

---

#### `interactive-demo-builder`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-interactive-demos.md` + `demos/*.html` |

**Purpose.** Create interactive, browser-based demo experiences tailored to the prospect's use cases and brand identity.

**Responsibilities:**
- Select the top 1–3 use cases that are best demonstrated interactively.
- Build self-contained HTML/CSS/JS playground files that simulate the solution in action using realistic (but synthetic) data modeled on the prospect's domain.
- Apply the brand design spec from `brand-aligned-design-doc` — prospect colors, typography, and visual style.
- Include guided walkthroughs with annotations explaining each step and its business impact.
- Design interactive elements: input fields the prospect can modify, toggles that show before/after states, live-updating visualizations.
- Produce a companion document explaining each demo's narrative arc, talking points, and anticipated questions.
- Ensure demos work offline and can be shared as standalone files.

**Inputs:** `3-use-cases.md`, `2-brand-design-spec.md`, `3-technical-discovery.md`, `4-value-engineering.md`.
**Outputs:** `4-interactive-demos.md` — demo catalog with narratives and talking points; `demos/*.html` — standalone interactive playground files.

---

#### `engagement-strategist`

| | |
|---|---|
| **Phase** | 4 |
| **Result file** | `4-engagement-strategy.md` |

**Purpose.** Synthesize all upstream analysis into a unified, actionable engagement playbook that orchestrates the presales team's interactions across stakeholders, content, and milestones.

**Responsibilities:**
- **Demo customization plan**: Specify which product capabilities to highlight in each demo based on the prospect's mapped pain points, competitive positioning, and stakeholder priorities. Reference the interactive demos built by `interactive-demo-builder` where available.
- **Stakeholder engagement plan**: Propose specific actions per stakeholder — technical deep-dives for evaluators, ROI workshops for the economic buyer, reference calls for skeptics, executive briefings for sponsors — with sequencing and timing.
- **Content recommendations**: Surface relevant case studies, white papers, ROI calculators, solution briefs, and analyst reports from the content library that match the prospect's industry, pain points, and buying stage.
- **Objection preparation**: Pre-generate responses to likely objections based on competitive positioning, deal risks, and common procurement pushback patterns. Map each objection to the stakeholder most likely to raise it.
- **Milestone calendar**: Define a sequence of engagement touchpoints from current deal stage through close, with objectives, deliverables, and success criteria for each.
- **Channel strategy**: Recommend the optimal mix of engagement channels (in-person, video, async, self-service) based on the prospect's preferences and geographic distribution.

**Inputs:** `2-stakeholder-map.md`, `2-pain-point-analysis.md`, `2-competitive-intelligence.md`, `3-deal-qualification.md`, `3-deal-risk-assessment.md`, `4-value-engineering.md`, `4-poc-specification.md`, `4-interactive-demos.md`, `4-reference-stories.md`, content library index.
**Outputs:** `4-engagement-strategy.md` — unified engagement playbook with per-stakeholder action plans, demo customization notes, content recommendations, objection-response matrix, and milestone calendar.

---

## Phase 5 — Pricing & Packaging

Translate the solution design into a commercially viable offer.

---

#### `pricing-strategist`

| | |
|---|---|
| **Phase** | 5 |
| **Result file** | `5-pricing-strategy.md` |

**Purpose.** Develop a pricing and packaging strategy that maximizes deal value while aligning with the prospect's budget reality and procurement preferences.

**Responsibilities:**
- Analyze the prospect's likely budget range based on company size, industry benchmarks, and stated constraints.
- Recommend a pricing model: per-seat, consumption-based, platform fee, tiered, or hybrid.
- Design packaging tiers that map to the prospect's phased adoption plan (land, expand, enterprise).
- Model discount scenarios and their impact on ACV, margin, and LTV.
- Benchmark against competitive pricing intelligence to ensure market alignment.
- Prepare pricing objection responses and negotiation boundaries (walk-away, target, stretch).
- Factor in partner economics if a channel partner is involved.

**Inputs:** `3-deal-qualification.md`, `4-value-engineering.md`, `2-competitive-intelligence.md`, `4-partner-architecture.md`, pricing guidelines.
**Outputs:** `5-pricing-strategy.md` — pricing model recommendation, tier design, discount scenarios, competitive benchmarks, and negotiation boundaries.

---

## Phase 6 — Proposal & Documentation

Package everything into a compelling, send-ready proposal.

---

#### `proposal-generator`

| | |
|---|---|
| **Phase** | 6 |
| **Result file** | `6-proposal.md` |

**Purpose.** Assemble a polished, comprehensive proposal document that synthesizes all prior analysis into a persuasive narrative.

**Responsibilities:**
- Structure the proposal with standard sections: executive summary, problem statement, proposed solution, use cases, architecture, implementation plan, pricing, terms, and next steps.
- Write the executive summary to speak directly to the Economic Buyer's priorities and success metrics.
- Incorporate ROI projections and value engineering data as quantitative anchors.
- Embed relevant reference stories and competitive differentiators naturally.
- Include a clear implementation timeline with milestones and responsibilities.
- Attach POC results or demo summaries as evidence of fit.
- Tailor tone, depth, and formatting to the prospect's industry and corporate communication norms.
- Produce modular sections that can be assembled in different orders depending on the audience.

**Inputs:** All prior phase outputs, `2-brand-design-spec.md`, proposal templates.
**Outputs:** `6-proposal.md` — complete, send-ready proposal with all sections and supporting appendices.

---

## Phase 7 — Negotiation & Close

Support the final deal stages with real-time intelligence and strategic guidance.

---

#### `negotiation-strategist`

| | |
|---|---|
| **Phase** | 7 |
| **Result file** | `7-negotiation-strategy.md` |

**Purpose.** Prepare the sales team for negotiation by modeling scenarios, identifying leverage points, and defining concession strategies.

**Responsibilities:**
- Analyze the prospect's likely negotiation tactics based on industry patterns, procurement culture, and stakeholder personalities.
- Define the negotiation range: best case (stretch), target, and walk-away thresholds for price, terms, and scope.
- Identify value trade-offs: concessions that cost little to give but are valued highly by the prospect (e.g., extended onboarding support, training credits, early access features).
- Model multi-variable scenarios: discounts vs. commitment length, scope reductions vs. phased rollout, payment terms vs. upfront commitment.
- Prepare responses for common procurement tactics: budget constraints, competitor bids, silence, escalation threats.
- Draft red-line guidance for legal/contract terms: acceptable modifications, firm boundaries, and alternative language.

**Inputs:** `5-pricing-strategy.md`, `3-deal-qualification.md`, `2-stakeholder-map.md`, `2-competitive-intelligence.md`.
**Outputs:** `7-negotiation-strategy.md` — negotiation playbook with scenarios, concession strategy, red-line guidance, and counter-tactic preparation.

---

#### `meeting-debrief-analyzer`

| | |
|---|---|
| **Phase** | 7 |
| **Result file** | `7-meeting-debrief-[date].md` |

**Purpose.** Analyze meeting transcripts and notes immediately after key conversations to capture intelligence, track sentiment shifts, and recommend follow-up actions.

**Responsibilities:**
- Extract key decisions, commitments, and open questions from the meeting transcript.
- Identify sentiment shifts: positive signals (budget confirmation, timeline acceleration) and negative signals (new objections, scope reduction, stakeholder disengagement).
- Update the stakeholder map with new contacts and revised influence/engagement scores.
- Compare what was said against prior qualification scoring to flag changes.
- Generate a structured follow-up plan: action items, owners, deadlines, and next meeting objectives.
- Detect buying signals or stall signals that require immediate action.
- Recommend which agents should be re-run based on new information (e.g., new competitor mentioned triggers `competitive-intelligence` re-run).

**Inputs:** Meeting transcript or notes, all prior agent outputs for the opportunity.
**Outputs:** `7-meeting-debrief-[date].md` — meeting summary, sentiment analysis, updated intelligence, action items, and re-run recommendations.

---

## Agent Execution Summary

| Agent | Phase | Result File | Parallel | Conditional |
|---|---|---|---|---|
| `orchestration-summary` | — | `orchestration-summary.md` | — | Always |
| `opportunity-monitor` | — | `opportunity-monitor.md` | — | Always (continuous) |
| `company-research-presales` | 1 | `1-company-research.md` | — | Always |
| `data-normalizer` | 1 | `1-data-normalization.md` | No | Always |
| `stakeholder-mapper` | 2 | `2-stakeholder-map.md` | Yes | Always |
| `lead-conversation-starter` | 2 | `2-lead-conversation-starter.md` | Yes | Always |
| `ai-opportunity-analyzer` | 2 | `2-ai-opportunity-analysis.md` | Yes | Always |
| `competitive-intelligence` | 2 | `2-competitive-intelligence.md` | Yes | Always |
| `brand-aligned-design-doc` | 2 | `2-brand-design-spec.md` | Yes | Always |
| `pain-point-analyzer` | 2 | `2-pain-point-analysis.md` | Yes | Always |
| `fsi-specialist` | 2 | `2-fsi-specialist.md` | Yes | Industry = FSI |
| `healthcare-life-sciences-specialist` | 2 | `2-healthcare-specialist.md` | Yes | Industry = Healthcare |
| `manufacturing-specialist` | 2 | `2-manufacturing-specialist.md` | Yes | Industry = Manufacturing |
| `retail-cpg-specialist` | 2 | `2-retail-cpg-specialist.md` | Yes | Industry = Retail/CPG |
| `saas-tech-specialist` | 2 | `2-saas-tech-specialist.md` | Yes | Industry = SaaS/Tech |
| `sports-entertainment-specialist` | 2 | `2-sports-entertainment-specialist.md` | Yes | Industry = Sports/Ent. |
| `energy-utilities-specialist` | 2 | `2-energy-utilities-specialist.md` | Yes | Industry = Energy |
| `telecommunications-specialist` | 2 | `2-telecommunications-specialist.md` | Yes | Industry = Telecom |
| `transportation-logistics-specialist` | 2 | `2-transportation-logistics-specialist.md` | Yes | Industry = Transport |
| `government-public-sector-specialist` | 2 | `2-government-public-sector-specialist.md` | Yes | Industry = Gov/Public |
| `hospitality-travel-specialist` | 2 | `2-hospitality-travel-specialist.md` | Yes | Industry = Hospitality |
| `real-estate-construction-specialist` | 2 | `2-real-estate-construction-specialist.md` | Yes | Industry = Real Estate |
| `education-specialist` | 2 | `2-education-specialist.md` | Yes | Industry = Education |
| `media-advertising-specialist` | 2 | `2-media-advertising-specialist.md` | Yes | Industry = Media/Ad |
| `professional-services-specialist` | 2 | `2-professional-services-specialist.md` | Yes | Industry = Prof. Svc. |
| `agriculture-food-specialist` | 2 | `2-agriculture-food-specialist.md` | Yes | Industry = Ag/Food |
| `technical-discovery` | 3 | `3-technical-discovery.md` | Yes | Always |
| `use-case-ideator` | 3 | `3-use-cases.md` | Yes | Always |
| `deal-qualification-scorer` | 3 | `3-deal-qualification.md` | No | Always |
| `deal-risk-assessor` | 3 | `3-deal-risk-assessment.md` | No | Always |
| `value-engineer` | 4 | `4-value-engineering.md` | Yes | Always |
| `poc-builder` | 4 | `4-poc-specification.md` | Yes | Always |
| `risk-compliance-guardian` | 4 | `4-risk-compliance.md` | Yes | Always |
| `reference-story-builder` | 4 | `4-reference-stories.md` | Yes | Always |
| `change-management-advisor` | 4 | `4-change-management.md` | Yes | Always |
| `partner-solution-architect` | 4 | `4-partner-architecture.md` | Yes | If partners relevant |
| `interactive-demo-builder` | 4 | `4-interactive-demos.md` | No | Always |
| `engagement-strategist` | 4 | `4-engagement-strategy.md` | No | Always |
| `pricing-strategist` | 5 | `5-pricing-strategy.md` | — | Always |
| `proposal-generator` | 6 | `6-proposal.md` | — | Always |
| `negotiation-strategist` | 7 | `7-negotiation-strategy.md` | Yes | Always |
| `meeting-debrief-analyzer` | 7 | `7-meeting-debrief-[date].md` | Yes | Per meeting |
| `win-loss-analyzer` | — | `win-loss-analysis.md` | — | Post-close |
| `account-expansion-planner` | — | `account-expansion.md` | — | Post-win |

---

## Dependency Graph

```
Phase 1 (sequential) ────────────────────────────────────────────────
  company-research-presales
          │
          ▼
  data-normalizer
          │
          ▼
Phase 2 (parallel) ──────────────────────────────────────────────────
  stakeholder-mapper          ai-opportunity-analyzer
  lead-conversation-starter*  competitive-intelligence
  brand-aligned-design-doc    pain-point-analyzer
  <industry-specialist>
          │
          ▼
Phase 3 (partially parallel) ────────────────────────────────────────
  technical-discovery ──┐
  use-case-ideator ─────┼──▶ deal-qualification-scorer
                        │              │
                        │              ▼
                        │    deal-risk-assessor
                        │
          ▼             ▼
Phase 4 (parallel, then sequential) ─────────────────────────────────
  value-engineer          risk-compliance-guardian
  poc-builder             reference-story-builder
  change-management-advisor   partner-solution-architect
  interactive-demo-builder*
          │
          ▼
  engagement-strategist (synthesizes all Phase 4 outputs)
          │
          ▼
Phase 5 (sequential) ────────────────────────────────────────────────
  pricing-strategist
          │
          ▼
Phase 6 (sequential) ────────────────────────────────────────────────
  proposal-generator
          │
          ▼
Phase 7 (parallel, event-driven) ────────────────────────────────────
  negotiation-strategist
  meeting-debrief-analyzer (triggered per meeting)

Post-close ───────────────────────────────────────────────────────────
  win-loss-analyzer ──▶ feedback to opportunity-monitor scoring model
  account-expansion-planner (wins only)

Continuous ───────────────────────────────────────────────────────────
  opportunity-monitor (always-on; triggers agent re-runs on events,
                       tracks score trends, applies decay modeling)

* lead-conversation-starter depends on stakeholder-mapper
* interactive-demo-builder depends on brand-aligned-design-doc
* deal-risk-assessor depends on deal-qualification-scorer
* engagement-strategist depends on all other Phase 4 agents
```
