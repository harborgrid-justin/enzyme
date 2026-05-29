# Enterprise AI Studio — `@missionfabric-js/enzyme` example

A multi-provider AI chat workspace (think Claude.ai / ChatGPT for the enterprise)
built on enzyme. It supports models from **five real LLM providers** —
Anthropic, OpenAI, Microsoft Foundry, Hugging Face, and Google — and lets you
swap providers mid-conversation, with each provider's own wire format applied
under the hood.

**Plus a Claude-style Artifacts pane**: ask for a landing page, dashboard, SVG
logo, or markdown brief and the assistant streams a live preview alongside the
chat. Each iteration ("make it darker", "add a CTA") creates a new version in
the timeline. Renderers are code-split and lazy-loaded on demand via enzyme's
`streaming.StreamBoundary` + `performance.createLazyComponent`.

The whole thing runs **in the browser with no backend**: MSW intercepts the
REST endpoints and serves a Server-Sent Events stream from the completions
route, so the client-side stream parser exercises the same codepath it would
hit against a real provider.

## Run it

```bash
cd examples/enterprise-ai-studio
npm install        # also runs `msw init` to add public/mockServiceWorker.js
npm run dev        # http://localhost:3004
```

The framework is consumed directly from the repo's local `src/` via Vite/TS
aliases, so no publish or `npm run build` of the library is needed.

## What it demonstrates

| Capability | enzyme module | Key API |
| --- | --- | --- |
| Identity + "sign in as…" | `auth` | `AuthProvider`, `useAuth().login/logout` |
| RBAC (chat / share / manage models) | `auth` | `useAuth().hasPermission` |
| Conversation list + history | `api` | `useApiRequest` |
| Optimistic create / rename / delete | `api` | `useApiMutation` |
| **Streaming completions (SSE)** | `api` | `apiClient.request({ responseType: 'stream' })` |
| UI state + multi-tab sync | `state` | Zustand + `state.useBroadcastSync` |
| Beta-model gating | `flags` | `useFeatureFlag(BETA_FEATURES)` |
| Light/dark theme | `theme` | `ThemeProvider`, `useThemeContext` |
| Error isolation + recovery | `monitoring` | `GlobalErrorBoundary`, `ErrorBoundary`, `addBreadcrumb` |
| Live Web Vitals | `performance` | `PerformanceProvider`, `usePerformanceMonitor` |
| **Lazy artifact renderers (code-split)** | `performance` | `createLazyComponent` (HtmlPreview, SvgPreview, MarkdownPreview, CodePreview) |
| **Streamed artifact boundaries** | `streaming` | `StreamProvider`, `StreamBoundary` with priority + placeholder |
| XSS-safe rendering of model output | `security` | `useSafeText` (chat) + sandboxed iframe (HTML artifacts) |

## Providers

The studio ships **19 models across 5 real providers**, sourced from each
provider's live documentation as of May 2026:

| Provider | Wire format | Models |
| --- | --- | --- |
| **Anthropic** | `messages` API (system as top-level field, `thinking` block) | Claude Opus 4.7 · Sonnet 4.6 · Haiku 4.5 |
| **OpenAI** | `chat/completions` (`max_completion_tokens`, `service_tier`, `reasoning`) | GPT-5.5 · GPT-5.4 · GPT-5.4 mini · GPT-5.4 nano |
| **Microsoft Foundry** | Azure OpenAI-compatible (deployment in path, `api-version` query) | Phi-4 · Mistral Large 2 · Llama 4 Scout (10M ctx) · DeepSeek V4 Pro |
| **Hugging Face** | OpenAI-compatible router (`:fastest` / `:cheapest` / `:provider` suffix) | GPT-OSS 120B · DeepSeek V4 Pro · Llama 4 Scout · Qwen3 235B |
| **Google** | Gemini `streamGenerateContent` (roles user/model, `systemInstruction`, `generationConfig`) | Gemini 3.1 Pro · 3.5 Flash · 3 Flash · 2.5 Flash-Lite |

The mock backend swaps voice + token cadence per provider so each one feels
distinct. Token usage + cost are computed from each provider's real per-million
token pricing so the usage meter is meaningful out of the box.

### Provider-specific options

The right-rail Settings panel surfaces the options each provider actually
exposes — not a least-common-denominator union:

- **Anthropic** → Extended-thinking level (off / 1k / 4k / 16k budget)
- **OpenAI** → Service tier (auto/default/flex/priority) + reasoning effort
- **Microsoft Foundry** → `api-version` and deployment name override
- **Hugging Face** → Provider routing (auto / fastest / cheapest / Together / Fireworks / SambaNova / Groq / Cerebras / preferred)
- **Google** → Thinking budget slider (-1=dynamic / 0=off / 1-32k) + code-execution toggle

Below the panel, a **Request preview** expander shows the actual JSON body
+ URL the studio would post upstream for each provider — toggle a provider
option and watch the body update live. The cURL view is copy-pasteable.

## Things to try

### Artifacts + iteration (the headline flow)

1. Start a new conversation, then send **"Build me a landing page"** — the
   assistant streams a real HTML document into the right pane (sandboxed iframe,
   Tailwind CDN inside).
2. Follow up with **"make it darker"** — a new version appears in the timeline
   at the bottom of the artifact pane. Click v1 to flip back.
3. Try **"add a CTA"**, **"use a different palette"**, or **"tighten the
   layout"** — each produces another version.
4. Send **"design a dashboard"** to spin up an analytics dashboard, **"create
   a brand logo as SVG"** for an SVG artifact, or **"draft a quarterly review
   memo"** for a markdown artifact. Each renderer is a separate lazy chunk —
   open the Network tab and watch them load on first use only.
5. Click ⧉ to copy the source, ↓ to download the artifact as `.html` / `.svg`
   / `.md` / `.ts`.

### Multi-provider chat

- **Sign in as Ada (Admin), Eli (Engineer), Ana (Analyst), or Gus (Guest)** to
  see RBAC in action — Gus can browse shared conversations but the composer
  hides; Ana can chat in private threads but can't share to the workspace.
- **Change the model in the composer** mid-thread — the same conversation
  cycles through providers, and each turn's message body shows which model
  produced it.
- **Stop a streaming response** mid-flight to see the abort path roll the
  placeholder back.
- **Edit the system prompt** in the right rail — the next turn picks it up.
- **Toggle "Beta models"** in Settings to reveal Llama 4 405B.
- **Toggle the theme** and watch the **Live Web Vitals** in the Usage meter.
- **Open a second tab** — the selected conversation, temperature, and max
  tokens stay in sync via `state.useBroadcastSync`.
- **Type `<script>alert(1)</script>`** — both user and model responses route
  through `security.useSafeText`, so the markup renders as inert text.

### Power-user enhancements

A second wave of workflow features layered on top of the core flow:

- **It remembers where you left off.** Generation settings (temperature, max
  tokens, provider options), the active conversation, starred models, and the
  right-rail panel layout are persisted to `localStorage` and restored on
  reload. Unsent composer text is saved as a **per-conversation draft**.
- **Composer power-ups.** Press **↑ / ↓** on an empty composer to recall
  previously sent messages (shell-style). Slash commands now include
  `/retry` (regenerate), `/title …` (rename), `/temp …` (set temperature), and
  `/export` (download the transcript) alongside `/clear` and `/share`.
- **Conversation actions (⋯ menu).** Duplicate a thread, export it as
  **Markdown** or **JSON**, pin it, or **archive** it (archived threads collapse
  behind a sidebar toggle).
- **Message tools.** Long messages collapse behind *Show more*; each shows a
  word count, and assistant turns show a per-turn cost from the model's pricing.
- **Settings quick-controls.** Temperature presets (Precise / Balanced /
  Creative), max-token presets, a **Reset** button, an estimated
  max-response-cost readout, and **★ favorite models** that float to the top of
  the picker.
- **More command-palette reach (⌘K).** Export or duplicate the current
  conversation, nudge temperature, reset settings, and toggle the right-rail
  panels — all keyboard-driven.
- **Collapsible right rail + ⌘. shortcut**, and the **browser tab title**
  tracks the active conversation. Curated **system-prompt presets** drop into
  the editor with one click.

### Pro features

A third wave focused on power workflows, organization, and per-message tools:

- **Composer.** A live **context-window meter** (thread + draft vs the model's
  limit), a **prompt-snippet library**, **quote-reply** from any message, an
  **expand** editor, an **Enter-to-send** preference, and the `/system` slash
  command. New chats **auto-title** from your first prompt.
- **Per-message tools.** Bookmark messages (with a *★-only* filter), 👍/👎
  feedback, **read-aloud** (Web Speech), **copy code blocks**, quote-reply, and
  **edit-and-re-ask** a previous prompt — plus **in-thread search**.
- **Organization.** Conversation **tags** (with a sidebar tag filter), sidebar
  **sort** (recent / cost / title), and a per-conversation **insights** panel
  (turns, tokens by role, models used).
- **Models & sampling.** Advanced **top-p / frequency-penalty / seed** knobs, a
  **model comparison** matrix, **recently-used** models, and **promote** a
  per-turn override to the conversation default.
- **Spend.** A **cost budget** with an over-budget banner and a
  **cost-by-conversation** bar chart in the Usage meter.
- **Workspace.** **Global content search** across every conversation (⌘⇧F),
  **export the whole workspace** as JSON, a distraction-free **focus mode**
  (⌘\\), **compact density**, **⌘J** to cycle models, and one-click
  conversation **templates** on the welcome screen.

## Design workspace — an enterprise visual-prototyping platform

Toggle **Design** in the top bar to switch from the chat studio to the **Design
workspace**: a second surface that turns one-shot artifacts into a managed,
collaborative, deployable design system. It's positioned as an enterprise-grade
answer to Claude-style "prompt → page" visual prototyping — closing the gaps
that single-page generators leave open (no reusable components, no backend, no
collaboration, no governance) while keeping the no-backend, MSW-friendly model
of the rest of this example.

The workspace ships **55 capabilities** grouped into nine themes. Each is a
self-contained panel in `src/studio/design/panels/`, backed by Zustand stores
(`design/store.ts` for the core 25, `design/advancedStore.ts` for the
enterprise 30 — both persisted to `localStorage`) and a set of pure,
unit-tested helpers in `design/lib/` that carry the real logic.

| # | Capability | What it does | Core helper |
| --- | --- | --- | --- |
| **Design depth** | | | |
| 1 | **Design tokens** | Edit color/type/spacing tokens, compile to CSS vars, re-skin any page | `lib/tokens` |
| 2 | **Component library** | Extract a markup block into a reusable `{{prop}}` component | `lib/componentize` |
| 3 | **Multi-page prototypes** | Linked, navigable pages with an in-prototype route graph | store |
| 4 | **Responsive matrix** | Preview the active page across device breakpoints side-by-side | store |
| 5 | **Version diff** | LCS line diff + DOM tag-delta between two pages | `lib/diff` |
| 6 | **Inspector** | Click an element, edit text/style, round-trip into the source | `lib/inspector` |
| 7 | **Figma interop** | Import frames → page; export a page → Figma-style JSON | `lib/figma` |
| 8 | **Accessibility audit** | WCAG sniff (alt/lang/contrast/headings) with one-click autofixes | `lib/a11y` |
| 9 | **Brand guardrails** | Lint a page against the brand palette/fonts; snap off-brand colors | `lib/brand` |
| 10 | **Asset manager** | Upload/manage images, icons, fonts (data-URI or URL) | store |
| **Collaboration** | | | |
| 11 | **Live presence** | Simulated multiplayer cursors + presence avatars | store |
| 12 | **Comments** | Threaded, resolvable comments with `@mentions` | store |
| 13 | **Approvals** | Draft → in-review → approved sign-off with required approvers | store |
| 14 | **Workspaces** | Org → team → project hierarchy with scope selection | store |
| 15 | **Activity feed** | `@mention`-aware event stream across every capability | store |
| **To production** | | | |
| 16 | **Deploy** | Simulated one-click deploy to Vercel/Netlify/static with live logs | store |
| 17 | **Git sync** | Connect a repo, commit pages, open + merge PRs | store |
| 18 | **Data binding** | Resolve `{{bind:token}}` placeholders against REST/GraphQL/mock sources | `lib/databind` |
| 19 | **Environments** | dev → staging → prod vars + promotion of a page per env | store |
| 20 | **Code export** | Export a page as a React / Vue / Web Component / Storybook artifact | `lib/exporters` |
| **AI power** | | | |
| 21 | **Knowledge / RAG** | TF-IDF retrieval over a knowledge base → grounding preamble | `lib/rag` |
| 22 | **Tool use** | Validate + run "function-calling" tools with an invocation log | `lib/tools` |
| 23 | **Prompt library** | Versioned `{{variable}}` prompt templates with live render | `lib/prompts` |
| 24 | **Eval harness** | Run golden cases across providers → pass/fail matrix + pass rate | `lib/evals` |
| 25 | **Agent workflows** | Run a multi-step plan (research → build → a11y → review) live | `lib/agent` |
| **Governance & trust** | | | |
| 26 | **Audit log** | Hash-chained, tamper-evident trail; one-click integrity verification | `lib/governance` |
| 27 | **Access control** | Editable role → permission RBAC matrix + member role assignment | `lib/governance` |
| 28 | **SSO & SCIM** | SAML/OIDC providers + directory reconciliation (provision plan) | `lib/governance` |
| 29 | **Data governance** | Residency region, classification, and editable retention windows | `lib/governance` |
| 30 | **PII / DLP** | Detect email/SSN/card/phone/IP in text and redact in one click | `lib/governance` |
| 31 | **Secrets vault** | Masked secrets with rotation-health (`ok`/`due-soon`/`overdue`) | `lib/governance` |
| **AI operations** | | | |
| 32 | **Model registry** | Provider/model catalog with intent-based routing + cost estimate | `lib/aiops` |
| 33 | **Cost governance** | Per-scope spend budgets with usage state and month-end projection | `lib/aiops` |
| 34 | **Guardrails** | Screen prompts for injection / leakage / jailbreak patterns | `lib/aiops` |
| 35 | **Groundedness** | Score generated claims against the knowledge base (hallucination check) | `lib/aiops` |
| 36 | **Experiments** | A/B variant conversion with a two-proportion significance test | `lib/aiops` |
| 37 | **Observability** | Request traces with p50/p95 latency + error rate | `lib/aiops` |
| **Content & localization** | | | |
| 38 | **Localization** | Per-locale translation coverage + inline editing of the catalog | `lib/content` |
| 39 | **SEO optimizer** | Audit title/description/canonical/og metadata → 0–100 score | `lib/content` |
| 40 | **Tone rewriter** | Rule-based brand-voice rewrite (concise / confident / friendly) | `lib/content` |
| 41 | **Image synthesis** | Generate deterministic on-brand placeholder imagery from a brief | `lib/content` |
| 42 | **Content (CMS)** | Versioned content entries with revision history + publish workflow | `lib/content` |
| 43 | **Readability** | Flesch Reading Ease grade for marketing copy | `lib/content` |
| **Integrations & automation** | | | |
| 44 | **Webhooks** | Signed event delivery with per-endpoint success rate | `lib/integrations` |
| 45 | **Connectors** | Marketplace of Slack/Jira/GitHub/Figma/… connect toggles | store |
| 46 | **Automations** | Trigger → action rules with a "who fires?" dry-run | `lib/integrations` |
| 47 | **Scheduler** | Recurring jobs with next-run computation + run-now | `lib/integrations` |
| 48 | **API keys** | Scoped developer keys, shown once, masked at rest | `lib/integrations` |
| 49 | **Template gallery** | Installable, vetted starting points | store |
| **Analytics & insights** | | | |
| 50 | **Funnels** | Step-over-step + overall conversion with biggest drop-off | `lib/analytics` |
| 51 | **Heatmap** | Click density bucketed into a normalized grid | `lib/analytics` |
| 52 | **Performance budget** | Core Web Vitals + bundle vs budget, pass rate | `lib/analytics` |
| 53 | **Capacity** | Seat/storage/quota usage with `ok`/`warning`/`critical` state | `lib/analytics` |
| 54 | **Anomalies** | z-score spike detection across operational metric series | `lib/analytics` |
| 55 | **Executive report** | One-click markdown rollup of spend, perf, conversion, risk | `lib/analytics` |

### Try it

1. Click **Design** in the top bar. Pick a capability from the left nav
   (grouped by theme; filter with the search box).
2. **Tokens → Re-skin active page** rewrites the Home page's literal hex
   colors to `var(--token)` references in one click.
3. **Components** → paste a markup block (or "Use active page selection") to
   extract a parameterized component, then tweak its props with a live preview.
4. **Accessibility audit** → open the Pricing page and hit **Apply all fixes**.
5. **Data binding** → the seeded Pricing page contains `{{bind:teamPrice}}`;
   watch it resolve to `$49` from the mock Pricing API.
6. **Agent workflows** → **Run workflow** to watch the five steps transition
   pending → running → done with per-step output.
7. **Audit log → Verify integrity** confirms the hash chain is intact; every
   governance action you take (toggling a grant, rotating a secret, installing a
   template) appends a new tamper-evident entry.
8. **PII / DLP** → hit **Redact all** to scrub emails, SSNs, and cards; **Cost
   governance** and **Capacity** show live budget/quota states; **Executive
   report → Download .md** exports a one-click rollup.

### How it's built

- **No new backend.** The whole design domain seeds from `design/seed.ts` and
  persists to `localStorage`, exactly like the chat studio's UI state.
- **Logic vs. UI split.** Every non-trivial capability has a pure helper in
  `design/lib/*` (tokenizing, diffing, auditing, retrieval, binding, exporting,
  the agent runner). The same split holds for the enterprise capabilities in
  `design/lib/{governance,aiops,content,integrations,analytics}.ts`. Those
  helpers are covered by **69 unit tests** across
  `design/__tests__/lib.test.ts` and `design/__tests__/advanced.test.ts` — run
  `npm test`.
- **Same security posture.** Page previews reuse the studio's `PreviewFrame` —
  HTML renders in a null-origin sandboxed iframe with a strict CSP; SVG is
  sanitized before inline mount.
- **Actions are attributed** to the signed-in identity (`auth.useAuth()`), so
  comments, approvals, and the activity feed reflect who did what.

> Like the chat studio's client-side RBAC, the collaboration/deploy/git/SSO
> surfaces here are realistic **simulations** for a no-backend demo. Going live
> means swapping each `design/lib` boundary (e.g. `executeTool`, `mockComplete`,
> deploy progression) for a real service — the UI and types stay unchanged.

## How the no-backend wiring works

- **MSW** (`src/studio/mocks/`) intercepts at the Service Worker layer — below
  the `fetch` reference enzyme's `apiClient` singleton binds at construction —
  so it transparently mocks the auth flow, the REST endpoints, *and* the SSE
  completions stream.
- The **completions handler** returns a `ReadableStream<Uint8Array>` shaped as
  `data: {...}\n\n` frames, exactly like the real OpenAI / Anthropic streaming
  APIs. The client (`src/studio/api/completions.ts`) consumes it via
  `apiClient.request({ responseType: 'stream' })` and parses frames itself,
  writing tokens into the React Query cache as they arrive so the typing
  animation runs against the same data that powers history.

## How artifacts work

- The mock provider detects intent keywords ("landing", "dashboard", "logo",
  "memo", …) in the user prompt and embeds an `<artifact id="…" type="html"
  title="…">…</artifact>` block in the streamed response. Iteration prompts
  ("darker", "add a CTA") run a deterministic mutation over the prior body
  instead of picking a fresh template — see `src/studio/artifacts/library.ts`.
- The **artifact parser** (`src/studio/artifacts/parser.ts`) is called on
  every chunk. It's chunk-boundary-resilient: incomplete tags stay buffered
  until the close tag arrives. Each call emits partial events so the preview
  pane can render incrementally.
- The parser writes into an **artifact store** (`src/studio/artifacts/store.ts`)
  keyed by `${conversationId}:${artifactId}`. A new version is created at the
  start of each assistant turn; mid-turn parses patch the latest version.
- Each renderer (`HtmlPreview`, `SvgPreview`, `MarkdownPreview`, `CodePreview`)
  is its own Vite chunk wrapped in `streaming.StreamBoundary`. Only the chunks
  for kinds the user has actually opened are fetched — check the Network tab.
- HTML artifacts render in a **sandboxed iframe** (`sandbox="allow-scripts"`,
  no `allow-same-origin`) so model-generated markup can't reach the host page.
  SVG artifacts strip `<script>` blocks and `on*=` event handlers defensively
  before inserting.

## Running on Windows with live Azure Foundry

The studio ships with an **Azure bridge** — a Vite dev-server plugin
(`scripts/azure-bridge/`) that exposes `/api/azure/*` and shells out to the
`az` CLI on the host machine. When you're signed in with `az login`, the
studio can browse your subscriptions, deploy real models to Foundry, route
chat completions through your own deployments, and track spend against a
configurable budget cap.

### Prerequisites

| Tool | Install command | Notes |
| ---- | --------------- | ----- |
| Windows 10/11 | — | Bridge runs on Linux/macOS too; commands below assume Windows |
| PowerShell 7 | `winget install Microsoft.PowerShell` | Bridge uses `pwsh.exe` for any PowerShell helpers |
| Azure CLI ≥ 2.60 | `winget install -e --id Microsoft.AzureCLI` | The bridge shells out to `az` via `cmd /c az <args>` |
| (optional) `az ml` extension | `az extension add --name ml` | Required for the Foundry hubs listing |

Then:

```powershell
az login                                  # opens browser, signs you in
az account set --subscription <id>        # pick which sub to default to
az account show                           # verify

# Set the budget cap + expiry (defaults: $45000, 2026-06-05)
$env:AZURE_BUDGET_USD = "45000"
$env:AZURE_BUDGET_EXPIRES = "2026-06-05"

cd examples\enterprise-ai-studio
npm install
npm run dev                                # studio at http://localhost:3004
```

When the dev server starts you'll see:

```
⬢  Azure bridge ready (platform=win32, budget=$45000, expires=2026-06-05)
```

Click the **⬢ Azure** button in the studio's top bar to open the console.

### What the Azure console does

The right-pane Azure console stacks five sections, every one driven by live
`az` calls (none of these are mocked):

1. **Status banner** — confirms `az` is installed, you're logged in,
   shows your default subscription and CLI version. Tells you exactly what
   command to run if a prerequisite is missing.
2. **Subscription picker** — populated from `az account list`. Switching
   subscription clears downstream picks.
3. **Budget meter** — month-to-date Azure spend (via
   `az rest …/Microsoft.Consumption/usageDetails`) plotted against the
   `AZURE_BUDGET_USD` cap. Goes amber at 80%, red at 95%, shows days
   remaining to the configured expiry.
4. **Foundry deployment list** — picks a Cognitive Services / Foundry
   account (from `az cognitiveservices account list`), shows its
   deployments (`… account deployment list`), and lets you tag any one as
   "live" — the studio's composer then routes chats through that real
   deployment.
5. **Deploy wizard** — runs `az cognitiveservices account deployment create`
   with the chosen template (DeepSeek V4 Pro / Phi-4 / Llama 4 Scout /
   GPT-5 mini). The az log streams back to the UI via SSE, and on success
   the deployment appears in the list above with a one-click "Use in studio"
   button.

### How "live" routing works end-to-end

1. You deploy a model in the wizard. The bridge runs:
   ```
   az cognitiveservices account deployment create \
       --name <account> --resource-group <rg> \
       --deployment-name <name> \
       --model-name DeepSeek-V3 --model-version 1 --model-format DeepSeek \
       --sku-name GlobalStandard --sku-capacity 10
   ```
2. You click **Use in studio →** on the deployment row. The studio adds
   `azure-live:<account>:<deployment>` to its model picker (with a green
   `LIVE` badge) and selects it.
3. You send a chat. The composer detects the `azure-live:` prefix and POSTs
   to `/api/azure/openai/chat`. The bridge:
   - Runs `az cognitiveservices account keys list` to grab the deployment
     key. **The key never leaves the bridge** — it's added to the outgoing
     request server-side.
   - POSTs the chat to
     `https://<account>.openai.azure.com/openai/deployments/<name>/chat/completions`
     with `stream: true`.
   - Pipes Azure's SSE response back through the bridge to the browser.
4. The studio's existing chat renderer + artifact parser handle Azure's
   response unchanged — same code path as the mock backend, just live data.

### Security posture

- **Bridge only listens on localhost** (it's a Vite middleware on the dev
  server, not exposed to the network).
- **Subcommand allowlist** — `scripts/azure-bridge/commands.mjs` is the
  ONLY surface that knows how to invoke `az`. Adding a new operation requires
  adding a function there. There's no "run any az command" endpoint, so a
  compromised browser context can't trigger `az group delete` or similar.
- **Arg-array spawning** — every `az` invocation passes args as a JavaScript
  array, never as a shell string. User-supplied values can't break out into
  shell interpretation.
- **Keys stay server-side** — the deployment key is fetched on the bridge,
  attached to outbound requests, and never serialized to the browser. The
  React DevTools / Network tab will never show it.

### Pre-flight: confirm the budget read works

The consumption API requires the user to have `Microsoft.Consumption/usageDetails/read`
on the subscription. If `az rest` returns 401 you'll see a "Couldn't read
consumption" callout — that's not a code bug, that's an RBAC gap. Fix:

```powershell
az role assignment create --assignee <your-email> \
    --role "Cost Management Reader" \
    --scope "/subscriptions/<id>"
```

## Wiring real providers (other than Azure)

Each provider's wire-format translator already lives in
`src/studio/providers/formatters.ts` — given the studio's neutral
`CompletionRequest`, it produces the exact URL, headers, and JSON body the
upstream provider expects. To go live, replace the call to
`apiClient.request({ url: '/completions', … })` in
`src/studio/api/completions.ts` with:

```ts
import { formatRequest } from '../providers/formatters';

const formatted = formatRequest(requestBody);
// formatted.headers has placeholders like <ANTHROPIC_API_KEY>; replace
// them on a server-side proxy so the key never reaches the browser.
const response = await fetch(formatted.url, {
  method: 'POST',
  headers: formatted.headers,
  body: JSON.stringify(formatted.body),
  signal: controller.signal,
});
// Then parse provider-specific SSE frame shapes (delta.text for OpenAI/HF/Foundry,
// content_block_delta for Anthropic, candidates[].content for Gemini).
```

In practice, ship it behind a server-side gateway: keep the studio talking to
`/completions`, terminate auth + provider key resolution there, and proxy out.

> Client-side RBAC here is UX only — a real deployment must enforce permissions
> on the server, and provider API keys must NEVER be shipped to the browser.
