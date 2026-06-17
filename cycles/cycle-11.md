# Cycle 11 — AI assistant (read-only, conversational) (v1.4.0)

**Goal:** A conversational assistant over the live tracker. The user asks
plain-language questions about their own data — next email for a campaign, a
campaign's UTM, what Salesforce parent something reports into — and the assistant
answers from the data via tools. **Read-only this cycle** (conversational
creation is Cycle 12, building on this tool layer).

**Starting state:** end of Cycle 10 (`v1.3.0`). Builds on the role-aware data
layer (`getHomeData`/`queries.ts`), `assembleUtm`/`resolveSource` (`utm.ts`),
the SF fields + `sfParentChain` (`sf.ts`), and the auth helpers
(`getCurrentProfile`/`entitledToFinancials`).

## The one invariant

The tools fetch **only** through the existing role-aware data layer, bound to
the caller's session — **no service-role key, no raw SQL, no new DB path**. So
financial gating is inherited: an unentitled session's tool results carry no
`leads`/`pipeline` (RLS strips them before the model sees anything), and
`external` users get scrubbed, read-only answers — exactly as the UI enforces.

## Delivered

1. **Config/deps** — `@anthropic-ai/sdk`; server-only `ANTHROPIC_API_KEY`
   (`.env.example`, README env table + go-live). `assistant/model.ts` holds the
   single `ASSISTANT_MODEL` + loop bounds.
2. **Route** — `POST /api/assistant`: authenticates via `getCurrentProfile`
   (→ 401; missing key → 503), runs a bounded (≤ 6 iterations, capped tokens)
   Anthropic tool-use loop against one `getHomeData` snapshot, streams the final
   text. Conversation state client-side; no persistence.
3. **Tools** (`assistant/tools.ts`) over the snapshot: `get_overview`,
   `search_campaigns`, `get_campaign` (facts + parent chain + live UTM),
   `get_initiative` (rollup + children), `list_upcoming_events`.
   `leads`/`pipeline` included only when entitled.
4. **System prompt** (`assistant/system.ts`) — server date, brand vocabulary +
   routing hints, answer-only-from-tools, never fabricate, read-only.
5. **UI** — `AssistantPanel` slide-in (drawer styling), opened from an app-bar
   **Ask** button; streaming render, busy/error states, mono for echoed
   UTMs/codes. All authenticated roles.
6. **Middleware** — unauthenticated `/api/*` now returns JSON **401** instead of
   redirecting to `/login` HTML; page redirects unchanged.

## Verification

- `tsc --noEmit`, lint, and `next build` clean.
- `ANTHROPIC_API_KEY` and the SDK verified **absent** from the client bundle.
- Unauthenticated `POST /api/assistant` → **401** (live).
- Financial gating: tools include `leads`/`pipeline` only when
  `canSeeFinancials` (from `entitledToFinancials`), and the snapshot has no real
  financials for unentitled callers anyway (RLS).

## Out of scope

Writes / conversational creation (Cycle 12); per-send/per-wave event model;
chat persistence; any RLS/financial/schema change.
