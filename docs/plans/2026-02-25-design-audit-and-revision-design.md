# Design Audit & Revision Plan

> Comprehensive audit of the three claude-claw design documents, with a revision plan
> to scope down to what's actually implementable with the Claude Agent SDK.

## Audit Summary

Three docs were audited across four lenses: feasibility gaps, missing pieces, over-engineering, and consistency issues.

**Total findings: 6 Critical, 34 Major, 25+ Minor**

### Critical Findings

1. **SDK doesn't support steering/preemption** — The architecture's four queue modes including `steer` (inject between tool calls) and the `GroupQueue` built on V2 sessions can't work. The SDK controls the ReAct loop internally; no mid-run injection is possible.

2. **`EZ()` loop pseudocode implies developer control that doesn't exist** — The developer calls `query()` or `createSession()` and consumes the stream. No tool-boundary hooks, no context injection, no `AsyncIterable` prompt source in the public API.

3. **Container-per-invocation contradicts long-lived container IPC** — Core Invariant 6 says ephemeral containers. Section 14 keeps containers alive. The implementation guide uses in-process `runAgent()`. Three conflicting models.

4. **Management console WebSocket has no backend** — Frontend doc describes a rich WS protocol. Architecture doc describes a separate internal gateway. Implementation guide has no WebSocket server at all.

5. **Single-session vs. multi-session per agent** — Architecture doc defines multi-session keys. Implementation guide and frontend both assume one session per agent.

6. **Core methods never implemented** — `pipeToActiveSession()` and `GroupQueue.shutdown()` called but never defined.

## Revision Strategy

**Scope down to reality**: Remove features that can't work with the current SDK. Fix contradictions. Fill missing pieces. Result: buildable design.

### AUTONOMOUS_AGENT_DESIGN.md

- Rewrite §4: SDK is a black box, not a controllable loop
- Collapse queue modes from 5 to 3 (remove `steer`, `steer-backlog`)
- Resolve container model: in-process default, container as optional hardened mode
- Remove §13 code-transform skills (separate doc/product)
- Trim multi-agent patterns to 2-3 (Supervisor, Fan-Out)
- Fix invariants that can't be enforced
- Add: context window management, API rate limits, dead letter queue spec

### IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md

- Fix V1/V2 confusion; remove "zero behavioral difference" claim
- Rewrite GroupQueue: V1 `query()` per turn, no session-based steering
- Implement missing methods and dead-letter handling
- Fix all SDK API misuse (types, hooks, message subtypes)
- Add: debouncing, deduplication, webhook auth, `dmScope`, container timeouts
- Choose one execution model (in-process primary, container optional)

### FRONTEND_DESIGN.md

- Fix WS auth (cookie-based, not URL token)
- Add reconnect state reconciliation
- Fix Zustand Map issue (use `Record<string, T>` or immer)
- Unify identifiers (`folder` canonical)
- Align to single-session-per-agent model
- Remove infeasible features (Fork, Rewind, Skill UI, git history, push notifications)
- Add: RBAC enforcement, WS error handling, Strict Mode safety, eviction policies
- Fix REST API route conflicts
- Define all event interfaces
