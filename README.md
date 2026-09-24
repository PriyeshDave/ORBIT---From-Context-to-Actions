# Orbit

One colleague workspace, three agentic AI patterns — unified behind a single login for the
Digital Workplace team at American Express.

Orbit consolidates three previously separate demos into one running product:

| Capability | Question it answers | Agent pattern | Origin demo |
|---|---|---|---|
| **Catch Up** | "What did I miss?" | Single agent, 7-step chained reasoning | RecapPilot |
| **Daily Plan** | "What should I focus on right now?" | Single orchestrator, parallel MCP tool fan-out | FocusPilot |
| **Readiness** | "Are we actually ready?" | Multi-agent, LangGraph-coordinated | ReadinessIQ |

A new **Home dashboard** (`/api/home/summary` + `frontend/src/pages/Home.jsx`) ties all three
together into one coherent story instead of three disconnected tabs — this is the one piece
that didn't exist in any of the three original demos.

## Quick start

```bash
cp backend/.env.example backend/.env   # add your OPENAI_API_KEY
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# in a second terminal
cd frontend && npm install && npm run dev
```

Or with Docker: `docker compose up --build` from the project root (copy `.env.example` to
`.env` first). For a full production deployment - including to a GCP VM - see
[DEPLOY.md](./DEPLOY.md).

## Architecture

### One backend, four modules

```
backend/app/
├── shared/       # config, auth (single session store + meeting ACL + connector
│                 # authorization), schemas, openai_client, telemetry - used by
│                 # Catch Up and Daily Plan
├── catchup/      # 7-step chained-reasoning pipeline (brain.py), its 7 prompts,
│                 # meeting/transcript data access
├── planner/      # Real MCP client/server fan-out - 4 actual MCP servers
│                 # (Outlook/Teams/Slack/Tracker) spawned as subprocesses,
│                 # not a simulation of the protocol
├── readiness/    # LangGraph multi-agent orchestrator, 4 specialist agents,
│                 # guardrails, its own in-process MCP-shaped client
└── main.py       # Mounts all three routers + the new /api/home/summary
                  # aggregator endpoint
```

Readiness does **not** share `shared/auth.py`'s session-gated pattern the way the other two
do — it's a team-wide readiness assistant with no per-persona ACL, matching its original
scope. It still sits behind Orbit's single login at the app level (the frontend won't
reach it without a session), but individual API calls there don't re-check a token.

### One unified persona roster

`backend/app/data/personas.json` replaces what were three separate `users.json` files. All 7
Digital Workplace teammates (Priyesh, Matthew, Hina, Nishant, Parth, Isha) now have a
complete experience across **all three** capabilities — not just the 2-3 personas each demo
originally supported. Meeting eligibility lives in `meetings.json`, connector authorization
lives in `personas.json`'s `connected_tools`, and Readiness project data is shared/unscoped.

**Continuity device, preserved deliberately:** the missing-asset-data blocker (`DW-470`) is
the same tracked issue across all three capabilities' mock data — raised in a Catch Up
meeting transcript, surfaced as an open tracker ticket in the Daily Plan, and referenced as
an open risk in Readiness's project notes. If you extend the mock data, consider preserving
this kind of cross-capability thread — it's what makes the three feel like one system.

### One frontend, three capability namespaces

```
frontend/src/
├── pages/{catchup,planner,readiness}/    # capability-specific pages
├── components/{catchup,planner,readiness}/
├── pages/Home.jsx, Login.jsx             # shared shell
├── components/AppShell.jsx               # shared nav + Avatar component
├── api/client.js                         # one client, namespaced:
│                                          #   api.catchup.*, api.planner.*, api.readiness.*
└── context/SessionContext.jsx            # one login for the whole app
```

**Notable engineering decision:** Readiness's frontend was originally TypeScript
(`.tsx`/`.ts`), while Catch Up and Daily Plan were plain JSX. Rather than manually converting
syntax (error-prone, no real benefit here), the `.tsx` files were kept as-is — Vite's
`@vitejs/plugin-react` strips TypeScript via esbuild without type-checking regardless
(confirmed against the original `tsconfig.json`'s `noEmit: true` and the `build` script,
which was already just `vite build` with no separate `tsc` step). `tsconfig.json` is kept for
IDE support only; it has no effect on the actual build.

**CSS isolation:** Readiness's frontend has a deliberately distinct visual language (indigo
accent, agent-identity colors) from the shared Fluent-inspired `theme.css` used by the rest of
the app. Both stylesheets target `:root`, and several variable names collided
(`--border-strong`, `--success`, `--warning`, `--danger`, `--radius-*`, `--font-body`,
`--font-mono` all had different values in each file). All of Readiness's custom properties are
now `--rd-`-prefixed (`styles/readiness.css`) to guarantee no collision, regardless of load
order. Readiness's duplicate global resets (`*`, `body`, `html/body/#root`) were removed from
`readiness.css` — those come only from `theme.css` now, so they apply consistently across the
whole app rather than only affecting Readiness's own pages by accident of import order.

### Real infrastructure, not smoke and mirrors

- **Daily Plan's MCP layer is the real Anthropic `mcp` Python SDK** — genuine stdio subprocess
  servers, a real `initialize()` handshake, real `list_tools()`/`call_tool()`. Verified during
  this merge with an actual end-to-end round trip (not just an import check): spawned a real
  `outlook_server.py` subprocess, ran the handshake, and pulled real calendar/email data back.
- **Readiness's MCP layer is MCP-*shaped*, in-process** — a `MCPClient.call(server, tool,
  args)` uniform interface, same as Daily Plan's calling convention, but not the wire protocol.
  This was a known, intentional gap in the original ReadinessIQ demo (documented in its own
  code comments as the "one-file swap-in point" for a future real-MCP upgrade).

### Dependency resolution (worth knowing before you touch `requirements.txt`)

The three original demos had incompatible pinned versions. Merging them required two real
fixes, found by actually test-installing in a clean virtualenv rather than guessing:
- `mcp==1.28.1` requires `pydantic>=2.11.0` (one demo had pinned `2.10.4`)
- `langchain==0.3.1` caps `langsmith<0.2.0` (two demos had pinned `langsmith==0.2.10`)

Both are reflected in the final `requirements.txt`. If you upgrade `langchain`/`langgraph`,
re-check this constraint.

## What's deliberately out of scope for this merge

- Readiness's MCP client was **not** upgraded to the real protocol as part of this merge (see
  above) — that's flagged as a good next step, not done here, to keep this merge's surface
  area to "consolidate three working things" rather than "also upgrade one of them."
- No new shared database or persistent storage was introduced — each capability still uses
  its own in-memory, process-local state (`catchup/state.py`, `planner/state.py`, Readiness's
  `run_registry`), same as the three original demos. Restarting the backend clears all of it.
