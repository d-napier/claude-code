# Claude Claw Project

## Overview
Claude Claw is an autonomous agent orchestration system built on the Claude Agent SDK.

## Architecture
- Backend: TypeScript + Node.js, Express 5, better-sqlite3, ws
- Frontend: Next.js 15, Tailwind CSS, shadcn/ui, Zustand
- Communication: REST API + WebSocket for real-time events

## Development
- `npm run dev` — Start backend + frontend concurrently
- `npm test` — Run vitest test suite
- `npm run build` — Build backend + frontend

## Key Files
- `src/index.ts` — Main orchestrator entry point
- `src/group-queue.ts` — Message queue with collect/followup/interrupt modes
- `src/agent-runner.ts` — Claude SDK wrapper
- `src/api/server.ts` — Express REST API
- `frontend/` — Next.js management console
