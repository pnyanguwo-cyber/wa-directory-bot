# BOT-GUIDE — WhatsApp Directory Bot

> Last updated: 2026-11-11
> Production deployment: `dpl_58dGHv4VkNQEPdV5f5fumrSirPCr` (READY) — https://wa-directory-bot.vercel.app
> Bot HEAD: `d2ac65e` ("Add reg_publish action case") · Shared HEAD: `9251a34` ("Add optional field collection…") · Supabase migrations applied: through `040_business_pricing_and_trial_lifecycle.sql`
> Vercel: project `wa-directory-bot` (`prj_UTgk2dMAjupPlBUPN84kWeigokt4`), team `team_SHuMRIj4nCp5iaa9EwNDHxPc`, region `iad1`

This guide tells any human or AI agent exactly where the WhatsApp chatbot lives, how it is wired, and the correct way to edit and ship changes.

---

## 0. Rule #1 — know which file is the live bot

The bot is its **own repo**. Do NOT edit the webapp when changing bot behavior.

| Path | What it is | Role |
|---|---|---|
| `C:\Users\cyberstream\Documents\wa-directory-bot\src\webhook.ts` | Bot webhook + routing (~6,700 lines) | **THE LIVE BOT** — menus, message routing, all button cases |
| `C:\Users\cyberstream\Documents\wa-directory-shared\lib\*.ts` | Shared flow library | Flow logic consumed by the bot (registration, state machine, AI extraction, listing create) |
| `C:\Users\cyberstream\Documents\wa.directory\app\api\webhook\route.ts` | Legacy webapp webhook (~1,200 lines) | **NOT the bot.** Old prototype. Editing this changes nothing in WhatsApp |
| `C:\Users\cyberstream\Documents\wa.directory\components\list-business-form.tsx` | Webapp UI form | **NOT the bot.** Browser flow on wadirectory.co.zw |

Common trap: grepping `webhook` inside `wa.directory` finds the legacy route and wastes an edit there. The Meta Cloud API webhook URL is `https://wa-directory-bot.vercel.app/api/webhook` — served by the **bot repo**.

## 1. Repos and what owns what

| Repo | Branch | Owns |
|---|---|---|
| `wa-directory-bot` → https://github.com/pnyanguwo-cyber/wa-directory-bot | `master` | WhatsApp routing, menus, button handling (`src/webhook.ts`), media plumbing (`lib/bot-sense.ts`) |
| `wa-directory-shared` → https://github.com/pnyanguwo-cyber/wa-directory-shared | `master` | Flow logic consumed by the bot (see below) |
| `wa.directory` (webapp, wadirectory.co.zw) | — | Webapp, `/api/account/create` portal endpoint, Supabase migrations (`supabase/migrations`, currently through 040) |

Key shared files:

- `lib/bot-state.ts` — `ConversationState` union (state machine) + `ConversationContext` interface. **New states must be added here first.**
- `lib/bot-registration.ts` — the entire registration flow (~760 lines): required fields → optional fields (website/address with Skip) → password set/skip → listing create → portal account → publish prompt.
- `lib/listing-create.ts` — `createListing()` / `ListingInput` (`website?`, `address?`, `generateSite?`); returns `editToken`.
- `lib/ai-registration.ts` — `analyseBusinessMaterial()` extracts structured fields from business material (text/photo).
- `lib/site-url.ts` — `SITE_URL` = `https://wadirectory.co.zw`.
- `lib/phone.ts` — `toFullPhone(countryCode, raw)` normalization.

## 2. The dependency trap (read before shipping shared changes)

`wa-directory-bot/package.json` consumes shared **unpinned**:

```json
"@wa-directory/shared": "github:pnyanguwo-cyber/wa-directory-shared"
```

No version pin → every bot build/install pulls the **latest shared `master`**. Consequences:

- Editing shared locally, or even pushing shared, does **nothing** until the bot is redeployed.
- Rule: push shared **and** bot, then deploy/redeploy the bot.
- Reverse risk: pushing bot alone can also pull shared master changes you did not intend — make sure shared is in the state you expect before deploying.

## 3. Webhook internals — where to edit in `src/webhook.ts`

Entry point: the POST handler for `/api/webhook` (deployed at `wa-directory-bot.vercel.app`).

Anchors (line numbers as of `d2ac65e`; they drift after edits — re-grep with `git grep -n`):

- Imports of shared flow: `:23-26` (`startRegistrationFlow`, `handleRegistrationMessage`, `handleRegistrationImage`)
- `handleBotMedia()` definition `:1980` (called from `:6201`); media/image route `:1996`
- `startRegistrationFlow` calls: `:2591` (menu_register), `:4413`, `:4426` (reg_restart), `:4486`
- Button cases (`case "reg_…"`):
  - `reg_contact` `:1403`
  - `reg_restart` `:4422` · `reg_business` `:4425` · `reg_personal` `:4428`
  - `reg_contact_pay_monthly` `:4444` · `reg_contact_publish` `:4445` · `reg_contact_pay_6m` `:4453` · `reg_contact_pay_year` `:4461` · `reg_contact_fix` `:4469`
  - `reg_plan_trial` `:4539` · `reg_plan_paid` `:4540` · `reg_upload` `:4541` · `reg_skip` `:4542` · `reg_proceed` `:4543` · `reg_publish` `:4544` · `reg_edit` `:4545`

Pattern for a new button: add a `case` in the button switch; keep titles/ids within the WhatsApp limits below.

## 4. Correct edit workflow (follow in order)

1. **Identify the repo** (Section 1). Bot behavior → bot repo. Flow logic → shared repo.
2. **New conversation state?** Add the literal to the `ConversationState` union in `wa-directory-shared/lib/bot-state.ts` **first**, then use it. Forgetting this → TS2367 ("not comparable") / TS2345.
3. **Typecheck shared**: from `C:\Users\cyberstream\Documents\wa-directory-shared` run `npx tsc --noEmit`. Do NOT use `npm run build` there (it hangs).
4. **Commit + push BOTH repos** when shared changed (HEADs at time of writing: bot `d2ac65e`, shared `9251a34`).
5. **Deploy the bot** — this is what activates shared changes. Push to bot `master` (git-connected, auto-deploys) or create a production deployment; verify state READY and that `wa-directory-bot.vercel.app` points at the new deployment.
6. **Watch logs**: Vercel → project `wa-directory-bot` → Runtime Logs; filter `[onboarding]` events; use a ~30-minute window (Hobby log retention ≈ 1 hour).
7. **Test in WhatsApp** end-to-end before declaring done.

## 5. Gotchas that have already caused bugs

- `setConversationState()` **replaces the entire context**. To keep collected fields, use `updateConversationContext()` to merge partial updates.
- Adding a new value to `ConversationState` requires a migration updating the `conversation_state_state_check` constraint — see `wa.directory/supabase/migrations/041_registration_optional_state.sql` (missed once → bot hit `23514` and lost the user's place in the flow).
- WhatsApp interactive buttons: **max 3** quick-reply buttons per message, button title ≤ 20 chars. More options → send a follow-up message.
- Registration password lives only in `context.password` during the flow — never persist it anywhere else.
- `edit_token` is the listing's edit credential. Portal fallback invite: `https://wadirectory.co.zw/account-setup?token=<editToken>` (see `wa.directory/lib/portal-invite.ts`).
- Portal account creation is a POST to `https://wadirectory.co.zw/api/account/create` with `{ edit_token, phone, password }`.
- Runtime log retention on Hobby ≈ 1 hour — pull logs promptly (window `since: "30m"`).
- Never call `GET /api/cron/*` in production to "test" — it runs scheduled jobs with real side effects.
- Environment is Windows PowerShell: `$env:VAR='value'`, `Start-Sleep -Seconds N`; ripgrep is not installed — use `git grep -n "pattern"` (per repo, one repo at a time).

## 6. Environment variables (names + purpose; values are secrets — never paste them anywhere)

Verify exact names in Vercel → project `wa-directory-bot` → Settings → Environment Variables.

| Variable | Purpose |
|---|---|
| Meta system-user token (WhatsApp access token) | Sends messages / uploads media via Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Identifies the business number |
| Meta app secret | Verifies webhook `X-Hub-Signature-256` |
| `WHATSAPP_VERIFY_TOKEN` | Webhook subscription handshake |
| Supabase URL + service-role key | Listing creation / persistence (server-side only) |
| AI provider API key (used by `ai-registration.ts`) | Field extraction from business material |
| `SITE_URL` | `https://wadirectory.co.zw` (portal links) |

⚠️ Secrets were pasted into chat at least once during this project. **Rotate any token that was exposed** and never commit, log, or paste them again.

## 7. Diagnostics playbook

- **Logs**: Vercel → `wa-directory-bot` → Runtime Logs. Instrumentation uses `[onboarding]` console events (e.g. registration started, listing created). Check `error`/`fatal` first, then the full stream. Window ≤ 1 hour (Hobby).
- **No errors but bot silent?** Check the webhook is still subscribed in the Meta App Dashboard and the verify token/app secret are unchanged; then confirm the latest deployment is READY and the alias `wa-directory-bot.vercel.app` is assigned.
- **Changes not visible in WhatsApp?** You edited shared only → Section 2 dependency trap; redeploy the bot.
- **Type errors after adding a state?** You forgot to extend the `ConversationState` union in `lib/bot-state.ts`.
- **Media messages failing?** `lib/bot-sense.ts` — `fetchWhatsAppMedia()` (`:32`) downloads, `mediaRateOk()` (`:18`) rate-limits; a burst of media can be throttled by design.
- **Registration data path (end-to-end)**: WhatsApp → bot webhook (`src/webhook.ts`) → shared flow (`bot-registration.ts`) → `createListing()` (Supabase) → optional portal account (`POST /api/account/create`) → 🚀 Publish button (`reg_publish`).
- **Pricing / trial**: plan selection wired via `reg_plan_trial` / `reg_plan_paid`; billing schema in migrations `039_trial_subscription.sql` and `040_business_pricing_and_trial_lifecycle.sql`.

## 8. Current shipped status (2026-11-11)

- ✅ Registration required-fields flow
- ✅ Optional fields (website, address) with Skip buttons (state `REGISTRATION_COLLECTING_OPTIONAL`)
- ✅ Password set / skip
- ✅ Listing creation + portal account creation (`/api/account/create`)
- ✅ 🚀 Publish button (`reg_publish`) and ✏️ Edit (`reg_edit`) after creation
- ✅ Trial + paid plan selection (migrations 039/040)
- Deployed: `dpl_58dGHv4VkNQEPdV5f5fumrSirPCr` READY → https://wa-directory-bot.vercel.app
- ⏳ Pending: human WhatsApp test of the above flows
