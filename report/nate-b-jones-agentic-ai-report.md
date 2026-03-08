# Agentic AI, Knowledge Work Automation, and Frameworks from Nate B Jones

**Source:** 10 latest videos from AI News & Strategy Daily (YouTube: @natebjones)
**Period covered:** February 26, 2026 - March 7, 2026
**Report generated:** March 8, 2026

---

## Executive Summary

Across ten consecutive daily videos, Nate B Jones builds an interconnected thesis: we are in a pivotal transition from chat-based AI to agentic AI, and the winners will be determined not by which model they choose but by the infrastructure, memory systems, and operational skills they build around those models. He introduces several original frameworks -- the Prompting Hierarchy, Frontier Operations, the Capability-Dissipation Gap, the Harness Theory, and the Open Brain architecture -- that collectively describe how knowledge workers and organizations should adapt to an agent-driven future.

---

## Table of Contents

1. [The Agentic AI Shift](#1-the-agentic-ai-shift)
2. [Harness Theory: Why the Body Matters More Than the Brain](#2-harness-theory-why-the-body-matters-more-than-the-brain)
3. [The Enterprise Context Platform Thesis](#3-the-enterprise-context-platform-thesis)
4. [The Four-Level Prompting Hierarchy](#4-the-four-level-prompting-hierarchy)
5. [Frontier Operations: The Five Skills of the AI Age](#5-frontier-operations-the-five-skills-of-the-ai-age)
6. [The Open Brain Architecture](#6-the-open-brain-architecture)
7. [The Capability-Dissipation Gap](#7-the-capability-dissipation-gap)
8. [Education and Cognitive Foundations](#8-education-and-cognitive-foundations)
9. [Key Model Evaluations and Findings](#9-key-model-evaluations-and-findings)
10. [Implications for Knowledge Workers](#10-implications-for-knowledge-workers)

---

## 1. The Agentic AI Shift

A central theme across all ten videos is that AI has crossed a fundamental threshold: models are no longer chat partners -- they are autonomous workers. Jones tracks several convergent signals:

- **Agent session duration is doubling quarterly.** Between October 2025 and January 2026, the longest autonomous Claude Code sessions nearly doubled, then doubled again by March.
- **Agents are operating at enterprise scale.** Telus reports 13,000 custom AI solutions internally. Zapier reports 800+ agents. Jones argues the companies not issuing press releases likely have an order of magnitude more.
- **OpenClaw passed 190,000 GitHub stars** and spawned over 1.5 million autonomous agents within weeks of its launch.
- **OpenAI's GPT-5.4 release** is explicitly positioned as agentic infrastructure: the word "agent" appears more than "intelligence" or "reasoning" in the release notes.

Jones argues that this shift from synchronous chat to autonomous agent work is the single most important transformation in how knowledge work functions, and that most professionals are unprepared for it because they are still operating with 2025-era synchronous prompting skills.

### Key Agentic Capabilities Emerging

| Capability | Description | Source Video |
|---|---|---|
| Progressive tool discovery | Agents find and load tools at runtime rather than pre-loading all definitions | GPT-5.4 Review (Mar 7) |
| Multi-agent orchestration | Claude Code spawns sub-agents with dedicated context windows and shared task lists | Claude Code vs Codex (Mar 6) |
| Long-running autonomous execution | GPT-5.4 ran a 56-minute schema migration eval autonomously | GPT-5.4 Review (Mar 7) |
| Computer use | Agents operate software, navigate UIs, and drive applications | GPT-5.4 Review (Mar 7) |
| Sustained workflow management | Agents maintain coherence across hours/days through structured artifacts | Claude Code vs Codex (Mar 6) |

---

## 2. Harness Theory: Why the Body Matters More Than the Brain

**Source:** "Claude Code vs Codex" (March 6, 2026)

Jones introduces the concept of the **harness** as the everything-else surrounding a model: execution environment, memory systems, tool integrations, context management, and multi-agent architecture. His core argument is that harnesses now matter more than models for determining work output quality.

### The Core Evidence

The same Claude model (identical weights, identical training) scored **78% on the SWE-bench benchmark** when running inside Claude Code's harness, but only **42% when running inside SmolAgents** -- a different harness built by another startup. Same brain, nearly double the performance.

> "The harness is not an optimization layer on top of a model. It's a performance multiplier that determines whether the model's intelligence actually translates into useful work."

### Five Dimensions of Harness Divergence

Jones identifies five specific architectural dimensions where Claude Code and Codex are diverging:

#### 1. Execution Philosophy
- **Claude Code:** "Bash is all you need." Uses composable Unix primitives (grep, git, npm) chained together, keeping the context window lean. Trust boundary = your entire workstation.
- **Codex:** Wired Chrome DevTools protocol directly into the agent. Gives each agent its own ephemeral observability stack (VictoriaLogs, VictoriaMetrics). Trust boundary = isolated cloud container.

#### 2. State and Memory
- **Claude Code:** Structured artifacts (progress files, feature lists as JSON, git commits) that every coding agent reads at session start and updates at session end. *The agent remembers.*
- **Codex:** Institutional memory pushed into the repo. Architecture decisions, bug principles, documentation all encoded in the codebase. *The codebase remembers.*

#### 3. Context Management
- **Claude Code:** Manages context through compacting the context window and delegating to sub-agents with their own windows.
- **Codex:** Each task runs in a clean sandbox. Tasks don't compete for space. Better for independent parallel tasks.

#### 4. Tool Integration
- **Claude Code:** Built around MCP from the start. Uses "skills" (markdown files) where only short descriptions are loaded; full definitions read only when invoked. Context-stingy by design.
- **Codex:** Bidirectional JSON-RPC harness (app server) exposing tools as RPC endpoints. Deep integration assumes a server-mediated cloud environment.

#### 5. Multi-Agent Architecture
- **Claude Code:** Orchestrated collaboration. Coordinator manages workflow. Sub-agents share task lists and can message each other. Uses fast/cheap models (Haiku) for exploration and expensive models (Opus) for decisions.
- **Codex:** Isolation model. Each task in its own sandbox. Coordination through the codebase (git branches merged). Inherently safer for autonomous operation.

### Harness Lock-In

Jones draws an explicit analogy to the early cloud wars (2010): just as AWS and Azure looked similar on virtual machines but diverged on architecture (Lambda vs Azure Functions), Claude Code and Codex are diverging on philosophy in ways that will determine what's possible in 2028.

**The compounding lock-in mechanism:** Calvin French-Owen's workflow evolution illustrates how harness investment compounds -- starting with a simple `/commit` skill, growing to `/worktree`, `/implement`, `/implement-all`, each building on Claude Code's specific architecture. Moving to a different harness means rebuilding the entire chain from scratch.

> "The question everyone has been asking -- which model is best -- is a 2022 or 2023 question. The real question is: which architectural philosophy matches how your team works?"

---

## 3. The Enterprise Context Platform Thesis

**Source:** "OpenAI Leaked GPT-5.4. It's a Distraction." (March 5, 2026)

Jones presents a thesis that the company that first achieves enterprise-scale context -- stored, retrievable, reasoned about, acted upon at a trillion-token scale -- doesn't just win the AI market. It becomes the new enterprise data platform, subsuming the entire SaaS stack.

### The Four Compound Bets

Jones identifies four capabilities that must work together for this vision to succeed. Failure of any one causes the entire bet to collapse:

| Bet | Description | Key Challenge |
|---|---|---|
| **1. Intelligence x Context** | Reasoning quality determines how much context can be productively used. The relationship is multiplicative, not additive. | If reasoning plateaus, the context layer degrades from institutional memory to an expensive RAG pipeline that hallucinates organizational knowledge. |
| **2. Memory That Doesn't Rot** | Institutional memory must maintain, resolve contradictions, deprecate stale knowledge, and track what is current vs. superseded. | This is an open research question, not an engineering problem with a known solution. |
| **3. Retrieval at Unprecedented Scale** | Finding 2,000 relevant tokens in 10 trillion when relevance is defined by causal chains across 8 months. | Current RAG cannot handle relational queries across time. Requires hybrid architecture with structured indexing, temporal state tracking, and hierarchical memory. |
| **4. Execution at the Speed of Trust** | Even a 5% per-task failure rate compounds into systemic risk. Target: 99.5%+ accuracy sustained across diverse tasks. | Must work even when organizational context is ambiguous, contradictory, or incomplete. |

### Comprehension Lock-In

Jones introduces the concept of **comprehension lock-in** (or intelligence lock-in): when an enterprise's organizational understanding lives on a context platform, switching means losing the synthesis layer that connects every other system. Unlike data lock-in (data is portable), synthesized organizational knowledge is not portable.

> "Salesforce's lock-in comes from data. The context platform's lock-in comes from understanding. This is the deepest form of technology lock-in that has ever existed in enterprise software."

### The Race: OpenAI vs Anthropic

- **OpenAI's approach:** Top-down, infrastructure-first. Building a stateful runtime environment with AWS. $600B+ in infrastructure investment. Signing CIOs to enterprise contracts.
- **Anthropic's approach:** Bottom-up, organic. Claude Code has captured over half of the enterprise coding market. Generating infinite claude.md files, workflow patterns, and project histories session by session. The context accumulation is organic and product-driven.

Jones argues Anthropic has a 6-12 month window to productize its organic context advantage before OpenAI's infrastructure play comes online.

---

## 4. The Four-Level Prompting Hierarchy

**Source:** "'Prompting' Just Split Into 4 Skills" (February 27, 2026)

Jones defines a hierarchy of four distinct prompting disciplines, each operating at a different altitude and time horizon. They are cumulative -- skipping a level creates failures at scale.

### The Four Disciplines

```
Level 4: SPECIFICATION ENGINEERING
         ↑ Writing agent-executable documents across the organization
         ↑ Time horizon: weeks/months
         ↑ Scope: entire organizational document corpus
         ↑
Level 3: INTENT ENGINEERING
         ↑ Encoding organizational purpose, goals, trade-off hierarchies
         ↑ Time horizon: days/weeks
         ↑ Scope: organizational strategy and decision boundaries
         ↑
Level 2: CONTEXT ENGINEERING
         ↑ Curating the optimal set of tokens for an LLM task
         ↑ Time horizon: session/project
         ↑ Scope: system prompts, tool definitions, memory, MCP
         ↑
Level 1: PROMPT CRAFT
         Structuring individual queries with clear instructions
         Time horizon: single interaction
         Scope: one prompt in one session
```

#### Level 1: Prompt Craft (Table Stakes)
The original skill: structuring queries with clear instructions, examples, guardrails, output formats. Jones calls this "table stakes" in 2026 -- the equivalent of being able to type in 1998.

#### Level 2: Context Engineering
Curating the entire information environment an agent operates within. Your 200-token prompt is 0.02% of a million-token context window. The other 99.98% is context engineering. This produces claude.md files, agent specifications, RAG pipeline design, and memory architectures.

> "People who are 10x more effective with AI than their peers are not writing 10x better prompts. They're building 10x better context infrastructure."

#### Level 3: Intent Engineering
Encoding organizational purpose into infrastructure agents can act against. Jones cites Klarna's cautionary tale: their AI agent resolved 2.3 million customer conversations in the first month, but optimized for resolution time instead of customer satisfaction. Perfect context, terrible intent alignment.

Key distinction: failure at higher levels is increasingly serious. A bad prompt wastes a morning. Bad intent engineering can damage a company.

#### Level 4: Specification Engineering
Writing documents that autonomous agents can execute against over extended time horizons without human intervention. This is about treating your entire organizational document corpus as agent-readable, agent-fungible specification.

Jones frames this as the highest-order prompting skill: "Your corporate strategy is a specification. Your product strategy is a specification. Your OKRs are a specification."

### The Five Specification Primitives

Jones defines five learnable primitives for specification engineering:

1. **Self-Contained Problem Statements** -- Can you state a problem with enough context that the task is plausibly solvable without the agent going out and fetching more information?
2. **Acceptance Criteria** -- Three sentences an independent observer could use to verify the output without asking any questions.
3. **Constraint Architecture** -- Musts, must-nots, preferences, and escalation triggers that turn a loose specification into a reliable one.
4. **Decomposition** -- Breaking large tasks into subtasks each under 2 hours, with clear input/output boundaries, independently verifiable.
5. **Evaluation Design** -- 3-5 test cases with known good outputs, run periodically (especially after model updates).

### Toby Lutke Connection

Jones frequently references Shopify CEO Toby Lutke as a practitioner exemplar:
- Maintains a personal folder of prompts run against every new model release
- Coined the term "context engineering" for everyday use
- Observed that better AI prompting makes him a better human communicator
- Provocative thesis: "A lot of what people in big companies call politics is actually bad context engineering for humans."

---

## 5. Frontier Operations: The Five Skills of the AI Age

**Source:** "Why Every AI Skill You Learned 6 Months Ago Is Already Wrong" (March 1, 2026)

Jones introduces the **Expanding Bubble metaphor**: AI capability is a bubble whose interior represents everything agents can do reliably. As it expands, the surface area (the frontier) also grows, creating more places for human judgment, not fewer.

> "Every prior workforce skill -- literacy, numeracy, computer literacy, coding -- was a destination. You reached it, you got it, you're done. Frontier operations has no fixed destination because the surface is always expanding outward."

### The Five Frontier Operations Skills

| Skill | Definition | Practical Example |
|---|---|---|
| **1. Boundary Sensing** | Maintaining accurate, up-to-date operational intuition about where the human-agent boundary sits for a given domain. | A product manager lets agents draft competitive analysis but reserves stakeholder dynamics for themselves, because the agent has never observed executive politics. |
| **2. Seam Design** | Structuring work so transitions between human and agent phases are clean, verifiable, and recoverable. | A software engineering lead routes ticket triage to agents, reserves architectural decisions for humans, and defines specific verification checks at the boundary. |
| **3. Failure Model Maintenance** | Maintaining a differentiated mental model of how agents fail at the *current* capability level -- not just that they fail, but the specific texture and shape of failure. | A corporate counsel knows agents catch boilerplate issues but miss the interaction between a liability cap and a carve-out buried in an exhibit. |
| **4. Capability Forecasting** | Making reasonable short-term predictions (6-12 months) about where the bubble boundary will move and investing learning accordingly. | A UX researcher watching agents improve at survey design invests in interpretive synthesis -- the skill of turning coded data into product insights. |
| **5. Leverage Calibration** | Deciding where to spend human attention -- now the scarcest resource in an agent-rich environment. | An engineering manager develops hierarchical attention: most agent code flows through automated tests, a subset gets human review, only architectural decisions get deep engagement. |

### Organizational Implications

Jones identifies two emerging team structures:

- **Team of One:** A single person with strong frontier operations runs multiple agent workflows across a domain. Output looks like what a 5-10 person team produced previously.
- **Team of Five (Pod):** One frontier operator sets seams and maintains failure models. 2-3 people with developing skills execute within those structures. One domain specialist with irreplaceable expertise.

> "Output scales with leverage, and leverage scales with how well a small number of humans operate at that boundary."

### Hiring Signals for Frontier Operators

Jones argues traditional hiring signals (credentials, years of experience, tool proficiency) are unreliable. Instead look for:
- Can this person articulate specifically what an agent handles today and where it doesn't?
- When encountering a new capability, does she immediately start redesigning a workflow?
- Does she have a differentiated failure model, not generic skepticism?
- Does she track where agents surprise her?

---

## 6. The Open Brain Architecture

**Source:** "You Don't Need SaaS" (March 2, 2026)

Jones proposes a personal knowledge infrastructure called **Open Brain** -- a database-backed, AI-accessible knowledge system designed to solve the memory fragmentation problem across AI tools.

### The Problem

- Claude's memory doesn't know what you told ChatGPT
- ChatGPT's memory doesn't follow you into Cursor
- Phone apps don't share context with coding agents
- Each platform's memory is a lock-in mechanism

> "What you've really got is five separate piles of sticky notes on five separate desks."

### Architecture

```
CAPTURE (any tool)
    ↓
Slack/Messaging → Supabase Edge Function
    ↓                    ↓
Vector Embedding    Metadata Extraction
(meaning)          (people, topics, actions)
    ↓                    ↓
    └──── PostgreSQL + pgvector ────┘
                    ↓
           MCP Server (retrieval)
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
  Claude         ChatGPT         Cursor
  (any MCP-compatible client)
```

### Key Design Principles

- **PostgreSQL as the foundation** -- "the most boring battle-tested technology you can imagine." Not VC-backed, not chasing growth metrics, not deprecating.
- **Vector embeddings for semantic search** -- find notes by meaning, not keywords. Query "career changes" and find a note about "considering consulting" even if "career" was never used.
- **MCP as the universal protocol** -- "the USB-C of AI." One protocol, every AI, your data stays in one place.
- **Cost: $0.10-0.30/month** on free tiers of Slack and Supabase.

### The Human-Agent Web Fork

Jones argues the internet is forking into two webs:
- **Human web:** Fonts, layouts, what you read
- **Agent web:** APIs, structured data, machine-to-machine readability

Your notes need to exist on both. Building for the agent web (a real database with vector search and MCP) gives you downstream human benefits: any new AI tool plugs in without additional effort.

### Four Lifecycle Prompts

1. **Memory Migration** -- Extract everything your existing AI tools know about you and import it into Open Brain
2. **Open Brain Spark** -- An interview prompt that discovers how the system fits your specific work and suggests what to capture regularly
3. **Quick Capture Templates** -- Sentence starters optimized for clean metadata extraction (decision capture, person note, insight, meeting debrief)
4. **Weekly Review** -- End-of-week synthesis that clusters by topic, scans for unresolved actions, detects patterns, finds connections

---

## 7. The Capability-Dissipation Gap

**Source:** "Don't Fall For the Stock Market Hype" (February 26, 2026)

Jones presents an economic framework built around two curves:

```
Performance
    │    ╱ AI Capability Curve (exponential)
    │   ╱
    │  ╱
    │ ╱   ← THE GAP (where economic opportunity lives)
    │╱___________________________
    │         ___________________  Societal Dissipation Curve (flat)
    │________/
    └──────────────────────────── Time
```

### The Two Curves

- **Curve 1: AI Capability** -- Goes up fast. Model intelligence, reasoning depth, agentic endurance. Gemini doubled its reasoning in three months.
- **Curve 2: Societal Dissipation** -- The rate at which capabilities actually permeate the economy. Way flatter. Governed by four inertia forces.

### Four Forces of Social Inertia

| Force | Example |
|---|---|
| **Regulatory Inertia** | Financial services AI for compliance needs regulatory approval from bodies that haven't finished writing the rules. COBOL runs 95% of US ATM transactions -- no one migrates because a startup published a blog post. |
| **Organizational Inertia** | Headcount decisions filtered through HR policies, employment law, union agreements, severance obligations. The gap between "Claude can technically do this job" and "we've reorganized workflows and confidently reduced headcount" is enormous. |
| **Cultural Inertia** | Toby Lutke -- one of the most AI-fluent CEOs on the planet -- had to issue a company-wide mandate and build AI into performance reviews to drive adoption. Multiply that difficulty by a million mid-market firms. |
| **Trust Inertia** | Enterprises do not and should not trust AI output by default. Building verification systems, audit trails, and institutional trust takes time that no benchmark improvement can compress. |

### The Economic Opportunity

The gap between the two curves is where asymmetric economic returns concentrate. Because social inertia is strong, the advantage for early adopters doesn't erode quickly -- it persists and compounds.

> "The bears assume the gap closes really fast with rapid labor displacement. The bulls assume the gap closes really fast with rapid technical adaptation. Both are wrong about the speed."

### The $7,000 AI Raise

Michael Bloke's analysis (cited by Jones): AI agents compressing service costs (mortgage services, tax preparation, insurance brokerage, travel booking) by 40-70% could return $4,000-7,000 in annual gain per median US household -- tax-free, no legislation required.

---

## 8. Education and Cognitive Foundations

**Source:** "My 10-Year-Old Vibe Codes" (February 28, 2026)

Jones proposes seven principles for education in the AI age, grounded in a parallel to the 1970s calculator debate:

### Seven Principles for AI-Era Education

1. **Foundation Before Leverage** -- Reading, math, writing by hand. Not because AI can't do these, but because the child can't evaluate AI output without domain understanding.
2. **Specification Is the New Literacy** -- Teach kids to say what they want: the goal, the constraints, what "done" looks like.
3. **Be a Director, Not a Passenger** -- Define the ask, the task, the output, what to keep/revise/reject.
4. **Sequence the Autonomy** -- Start with bounded tools with guardrails, graduate to open-ended tools with guidance, then agent-level autonomy.
5. **Teach Kids to Catch the Machine** -- AI will be confidently, fluently wrong. Train kids to sanity-check against their understanding.
6. **Build, Don't Browse** -- Making things with AI develops cognition. Consuming AI output does not. Constructionism (Seymour Papert) applies.
7. **Attempt Before Augmenting** -- Try it yourself first. Then use AI to extend what you've started.

### The Vibe Coding as Pedagogy Insight

Jones's 10-year-old learning to specify game requirements ("add three enemies that spawn from the right side of the screen, move left at medium speed") teaches specification quality -- debugging her own intent, not debugging code. This maps directly to professional AI work.

---

## 9. Key Model Evaluations and Findings

**Source:** "GPT-5.4 Let Mickey Mouse Into a Production Database" (March 7, 2026)

Jones ran blind evaluations (independent judging, outputs labeled by number) across GPT-5.4, Claude Opus 4.6, and Gemini 3.1 Pro. Key findings:

### GPT-5.4 Strengths
- **Quantitative modeling:** Produced a 6-tab workbook with Pythagorean win expectation, ELO-like rating system, Poisson binomial distribution, and honest self-critique
- **File type processing:** 99.1% coverage (461/465 files) in the "eval from hell" -- handled CSVs, Excel, JSON, PDFs, VCF contacts, handwritten receipts via OCR, corrupted JSON
- **Self-knowledge:** ~90% correct knowledge about its own capabilities and the competitive landscape
- **Thinking mode vs Auto mode:** Massive quality gap. In thinking mode, competes for first place on epistemic calibration. In auto mode, drops to dead last.

### GPT-5.4 Weaknesses
- **Writing quality:** "Not a close call." Cannot match Opus 4.6 on tone, voice, or business communication.
- **Data judgment:** "Builds infrastructure without judgment." Let Mickey Mouse (fake customer) and a $25K car wash order (test data) into a production database. Produced 394 flags in a flat list with zero categorization.
- **Speed:** 56 minutes on schema migration vs Claude's 15 minutes and Gemini's 21 minutes.
- **De-duplication:** 278 customers when the correct number was 176.

### The "Builds Infrastructure Without Judgment" Pattern

> "ChatGPT 5.4 treats tasks as pipelines to execute, not problems to understand. It will build you a beautiful complete system but will not stop to ask why you're going to the car wash in the first place."

---

## 10. Implications for Knowledge Workers

Synthesizing across all ten videos, Jones's actionable guidance for knowledge workers:

### Immediate Actions
1. **Build your personal context layer** -- Write a claude.md equivalent for your work: goals, constraints, communication preferences, quality standards, institutional context
2. **Build an Open Brain** -- Deploy a PostgreSQL + pgvector + MCP server system for cross-tool memory (~45 minutes, ~$0.10/month)
3. **Track where agents surprise you** -- Surprises are signals. If your agent hasn't surprised you recently, you're not at the frontier.
4. **Test new models systematically** -- Maintain a personal eval suite (like Toby Lutke's "Toby Eval") run against every model release

### Organizational Actions
1. **Create explicit frontier operations roles** -- People whose job is to sense where the human-agent boundary sits and redesign workflows as it shifts
2. **Treat harness decisions as strategic commitments** -- Not procurement decisions
3. **Build specification engineering as a competency** -- Every organizational document should be agent-readable
4. **Encode intent infrastructure** -- Decision frameworks, quality thresholds, escalation triggers written down and available to agents
5. **Maximize feedback density** -- 10 real tasks delegated daily to agents beats a 40-hour AI course

### Strategic Questions to Ask
1. Where is your organization's true understanding actually accumulating? If engineers use Claude, product uses ChatGPT, and analysts use Gemini, you're building separate context silos, not shared understanding.
2. Are you running a flywheel? Is there compound improvement in your AI systems, or are people just trying things?
3. What is your understanding switching cost? If you've built 20-30% of an internal context layer, at what point would you switch to an enterprise offering?

---

## Framework Summary Table

| Framework | Video | Core Idea |
|---|---|---|
| **Harness Theory** | Claude Code vs Codex (Mar 6) | The execution environment around a model matters more than the model itself. Harness decisions are strategic commitments with compounding lock-in. |
| **Four-Level Prompting Hierarchy** | Prompting Split Into 4 Skills (Feb 27) | Prompt Craft → Context Engineering → Intent Engineering → Specification Engineering. Each level has higher stakes and broader scope. |
| **Frontier Operations** | Every AI Skill Is Already Wrong (Mar 1) | Five simultaneous skills (boundary sensing, seam design, failure model maintenance, capability forecasting, leverage calibration) for operating at the expanding AI-human boundary. |
| **Expanding Bubble Metaphor** | Every AI Skill Is Already Wrong (Mar 1) | AI capability is an expanding bubble. As the interior grows, the surface area (frontier) also grows, creating more places for human judgment. |
| **Open Brain Architecture** | You Don't Need SaaS (Mar 2) | PostgreSQL + pgvector + MCP server = cross-tool persistent memory you own. Agent-readable, platform-independent, ~$0.10/month. |
| **Capability-Dissipation Gap** | Stock Market Hype (Feb 26) | Two curves: AI capability (exponential) vs societal dissipation (flat). The gap is where economic opportunity concentrates. Four inertia forces keep it wide. |
| **Four Compound Bets** | OpenAI Leaked GPT-5.4 (Mar 5) | Intelligence x Context, Memory That Doesn't Rot, Retrieval at Scale, Execution at Speed of Trust. All four must work for the enterprise context platform to succeed. |
| **Seven Education Principles** | 10-Year-Old Vibe Codes (Feb 28) | Foundation before leverage, specification as literacy, director not passenger, sequence autonomy, catch the machine, build don't browse, attempt before augmenting. |
| **The Calculator Parallel** | 10-Year-Old Vibe Codes (Feb 28) | Like the 1970s calculator debate: the answer is both -- build the foundation AND give them the tool. Foundation first, then leverage. |
| **Comprehension Lock-In** | OpenAI Leaked GPT-5.4 (Mar 5) | Unlike data lock-in (portable), synthesized organizational understanding is not portable. The deepest form of technology lock-in in enterprise software history. |

---

## Source Videos

| Date | Title | URL |
|---|---|---|
| 2026-03-07 | GPT-5.4 Let Mickey Mouse Into a Production Database | https://www.youtube.com/watch?v=-_vL1KXd2rc |
| 2026-03-06 | Claude Code vs Codex: The Decision That Compounds Every Week | https://www.youtube.com/watch?v=09sFAO7pklo |
| 2026-03-05 | OpenAI Leaked GPT-5.4. It's a Distraction. | https://www.youtube.com/watch?v=JYcidOS9ozU |
| 2026-03-04 | Everyone You Know Is About to Try Claude | https://www.youtube.com/watch?v=O7SSQfiPDXA |
| 2026-03-03 | Dario Amodei Made One Mistake. Sam Altman Got $110 Billion. | https://www.youtube.com/watch?v=pTtueIqrg0Q |
| 2026-03-02 | You Don't Need SaaS. The $0.10 System That Replaced My AI Workflow | https://www.youtube.com/watch?v=2JiMmye2ezg |
| 2026-03-01 | Why Every AI Skill You Learned 6 Months Ago Is Already Wrong | https://www.youtube.com/watch?v=RnjgLlQTMf0 |
| 2026-02-28 | My 10-Year-Old Vibe Codes. She Also Does Math by Hand. | https://www.youtube.com/watch?v=2ghhiPLg-jg |
| 2026-02-27 | 'Prompting' Just Split Into 4 Skills | https://www.youtube.com/watch?v=BpibZSMGtdY |
| 2026-02-26 | Don't Fall For the Stock Market Hype | https://www.youtube.com/watch?v=q6pbQ5li5Cg |
