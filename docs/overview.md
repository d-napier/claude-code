# Presales Intelligence Engine

## Overview

The Presales Intelligence Engine is a system that automates the collection, analysis, and scoring of prospect data to help sales engineering and presales teams focus on the highest-value opportunities. It ingests signals from CRM records, public filings, technographic sources, and conversation transcripts to produce a qualification verdict and tailored engagement strategy for each opportunity.

---

## Opportunity Qualification Pipeline

The pipeline processes each opportunity through the following sequential stages:

### Stage 1 — Ingest & Data Collection

Gather raw data from all available sources for the target account and opportunity.

- **CRM sync**: Pull opportunity metadata (deal size, stage, close date, owner) from the CRM (e.g., Salesforce, HubSpot).
- **Firmographic enrichment**: Retrieve company profile data — industry, employee count, revenue, headquarters, subsidiaries — from providers such as Clearbit, ZoomInfo, or Dun & Bradstreet.
- **Technographic discovery**: Identify the prospect's current technology stack (cloud providers, languages, frameworks, SaaS tools) via BuiltWith, Wappalyzer, or similar sources.
- **Public signals**: Collect recent press releases, SEC filings, earnings call transcripts, job postings, and social media activity.
- **Conversation artifacts**: Import call recordings, email threads, meeting notes, and RFP/RFI documents tied to the opportunity.

**Output**: A unified raw-data payload per opportunity stored in the data lake.

---

### Stage 2 — Data Normalization & Entity Resolution

Transform raw inputs into a consistent schema and link records that refer to the same entity.

- **Schema mapping**: Convert heterogeneous source fields into a canonical data model (account, contact, opportunity, activity).
- **Deduplication**: Merge duplicate contacts, accounts, and activities using fuzzy matching on name, domain, and email.
- **Timestamp alignment**: Normalize all dates to UTC and attach a freshness score so downstream stages can weight recent signals more heavily.
- **Missing-data flagging**: Tag fields that could not be populated so the system can request manual input or schedule a re-fetch.

**Output**: A clean, deduplicated opportunity record with completeness metadata.

---

### Stage 3 — Need & Pain-Point Analysis

Determine what business problems the prospect is trying to solve and how urgent they are.

- **Keyword & topic extraction**: Run NLP over conversation transcripts and documents to surface recurring themes (e.g., "migration," "cost reduction," "compliance deadline").
- **Pain-point classification**: Map extracted topics to a taxonomy of known pain points (operational inefficiency, security gaps, scalability limits, regulatory pressure).
- **Urgency scoring**: Assign an urgency score (1–5) based on language intensity, mention of deadlines, and executive involvement.
- **Gap mapping**: Cross-reference identified pain points against your product's capability matrix to find alignment and white-space.

**Output**: A ranked list of prospect pain points with urgency scores and product-fit indicators.

---

### Stage 4 — Stakeholder & Buying Committee Mapping

Identify the people involved in the decision and their influence.

- **Contact discovery**: Enumerate all known contacts on the account and their titles/roles.
- **Role classification**: Categorize each contact as Economic Buyer, Technical Evaluator, Champion, End User, or Blocker using title heuristics and interaction history.
- **Influence scoring**: Score each stakeholder's influence based on seniority, email/meeting engagement frequency, and whether they initiated the evaluation.
- **Coverage gap detection**: Flag missing roles (e.g., no identified Economic Buyer) that could stall the deal.

**Output**: A stakeholder map with role labels, influence scores, and coverage gaps.

---

### Stage 5 — Competitive & Market Positioning

Understand the competitive landscape for this specific opportunity.

- **Competitor detection**: Identify competitors mentioned in transcripts, RFP requirements, or technographic data.
- **Feature comparison**: Auto-generate a feature-by-feature comparison matrix between your product and detected competitors.
- **Win/loss pattern matching**: Query historical win/loss data for deals with a similar competitor set, industry, and deal size to surface patterns.
- **Differentiation brief**: Produce a short narrative highlighting your strongest differentiators for this deal's context.

**Output**: Competitive intelligence brief with comparison matrix and historical win-rate context.

---

### Stage 6 — Qualification Scoring

Apply a structured qualification framework to produce a composite score.

- **Framework alignment**: Score the opportunity against a standard framework (MEDDPICC, BANT, or a custom model):
  - **Metrics**: Can the prospect quantify the value of solving this problem?
  - **Economic Buyer**: Is the budget holder identified and engaged?
  - **Decision Criteria**: Are the evaluation criteria known?
  - **Decision Process**: Is the procurement/approval workflow mapped?
  - **Paper Process**: Are legal, security, and procurement steps understood?
  - **Identified Pain**: Is there a validated, urgent pain point?
  - **Champion**: Is there an internal advocate actively selling on your behalf?
  - **Competition**: Is the competitive position favorable?
- **Weighted composite score**: Combine individual dimension scores using configurable weights into a single 0–100 qualification score.
- **Confidence interval**: Attach a confidence band based on data completeness — sparse data widens the interval.

**Output**: Qualification score (0–100), per-dimension breakdown, and confidence interval.

---

### Stage 7 — Risk Assessment

Identify factors that could cause the deal to slip, shrink, or be lost.

- **Timeline risk**: Flag deals where the stated close date is inconsistent with the remaining decision-process steps.
- **Budget risk**: Detect mismatches between deal size and the prospect's known budget cycles or spending patterns.
- **Champion risk**: Alert if the champion has gone silent, changed roles, or left the company.
- **Competitive risk**: Elevate risk if a competitor with a strong historical win rate in this segment is involved.
- **Stagnation detection**: Trigger warnings if no meaningful activity (emails, meetings, document exchanges) has occurred within a configurable window.

**Output**: Risk register with severity ratings (low / medium / high / critical) per risk category.

---

### Stage 8 — Engagement Strategy Generation

Synthesize all upstream outputs into an actionable presales plan.

- **Demo customization recommendations**: Suggest which product capabilities to highlight based on mapped pain points and competitive positioning.
- **Proof-of-concept scoping**: Recommend POC scenarios that address the prospect's top pain points and decision criteria.
- **Stakeholder engagement plan**: Propose specific actions per stakeholder — technical deep-dives for evaluators, ROI workshops for the economic buyer, reference calls for skeptics.
- **Content recommendations**: Surface relevant case studies, white papers, and ROI calculators from the content library that match the prospect's industry and pain points.
- **Objection preparation**: Pre-generate responses to likely objections based on competitive positioning and risk factors.

**Output**: A structured engagement playbook tailored to the opportunity.

---

### Stage 9 — Continuous Monitoring & Re-scoring

Keep the qualification current as the deal progresses.

- **Event-driven re-evaluation**: Re-run scoring whenever a new signal arrives (CRM stage change, new meeting transcript, stakeholder departure).
- **Trend tracking**: Track score trajectory over time and alert on significant positive or negative shifts.
- **Decay modeling**: Gradually reduce confidence and qualification score if no new data arrives within the freshness window.
- **Feedback loop**: Capture win/loss outcomes and feed them back into the scoring model weights to improve accuracy over time.

**Output**: Updated scores, trend charts, and alerts delivered to the presales team via CRM, Slack, or email.

---

## Architecture Summary

```
 Sources              Pipeline Stages                    Consumers
+-----------+    +-----------------------------+    +----------------+
| CRM       |--->| 1. Ingest & Collection      |    | CRM Dashboards |
| Firmograph|--->| 2. Normalize & Resolve      |    | Slack Alerts   |
| Techno    |--->| 3. Need & Pain Analysis     |--->| Email Digests  |
| Public    |--->| 4. Stakeholder Mapping      |    | Presales Portal|
| Calls/Docs|--->| 5. Competitive Positioning  |    | BI / Analytics |
+-----------+    | 6. Qualification Scoring    |    +----------------+
                 | 7. Risk Assessment          |
                 | 8. Engagement Strategy      |
                 | 9. Continuous Monitoring    |
                 +-----------------------------+
```

Each stage is implemented as an independent, idempotent processor that reads from and writes to a shared data store, allowing stages to be run in parallel where there are no data dependencies and individually retried on failure.
