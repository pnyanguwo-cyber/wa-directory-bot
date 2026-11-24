# Staging number + pre-deploy checklist

Run this before every production deploy. It takes about 15 minutes and catches
the "deployed but broken in WhatsApp" problems that a typecheck cannot.

## Staging number

Use one dedicated WhatsApp number that is **not** a customer, owner or agent.
Keep it saved as `Staging test` in the team phone.

- Add that number to the bot's admin allowlist while testing, then remove it
  before finishing: `add agent` is for agents; admins come from
  `ADMIN_WHATSAPP` + `bot_settings.admin_allowlist`.
- Send every test from the staging phone. Where a second person is needed
  (owner duplicate test), use a second spare number, never a real business.
- Delete test listings afterwards: find them with `listings`, then
  `remove agent` only affects agents - a test listing needs the admin review
  tools or the portal.

## The checklist

Tick each line only after seeing the correct reply in WhatsApp.

### 1. Boot and menu (2 min)
- [ ] Send `hi` from a number that has never messaged the bot: welcome + buyer/seller buttons.
- [ ] Send `menu`: the main menu opens and the Register row starts registration.
- [ ] Send `help` as an admin: the help text ends with `Admin: send admin for the button menu`.
- [ ] Send `admin`: the admin list opens with Pending, Requests, Tree, Add, Agents, Listings, Stats, Digest, Emergency.

### 2. Admin menu taps (2 min)
- [ ] Tap `Pending listings` -> the pending list appears.
- [ ] Tap `Category tree` -> the tree (or the empty-tree prompt) appears.
- [ ] Tap `Agents` -> the agent list appears.
- [ ] Tap a row that needs a follow-up (e.g. Add for someone) -> the owner-number prompt appears; send `cancel` to stop.

### 3. Agents (4 min)
- [ ] As admin: `add agent 0771234567` with a test number -> "Agent added".
- [ ] `agents` -> the number is listed.
- [ ] From the agent number: `hi` -> agent mode text (no buyer menu, no search).
- [ ] Agent sends `register` -> asks for the owner's number (no "my business / another business" choice).
- [ ] Agent sends a random search word -> agent help, not search results.
- [ ] As admin: `remove agent 0771234567` -> "Agent removed". Confirm `agents` no longer lists it.

### 4. Agent registration by photo (3 min)
- [ ] Agent sends `register`, enters the owner's spare number, then sends a photo of a business card/sign.
- [ ] Agent sends a photo before any number -> two buttons appear: `🏪 Register business` and `🔍 Search item`.
- [ ] Tap `Register business` -> asks for the owner's number; after the number it reads the waiting photo without asking for it again.
- [ ] Tap `Search item` -> photo search runs (even if the agent's own number owns a live shop).
- [ ] The bot replies with the quick read and asks only for missing fields.
- [ ] Review card shows Publish / Edit; `City: Harare` edits the card and re-shows it.
- [ ] Publish -> the agent gets a short confirmation only. **Every admin** gets the hand-over card, prefixed with the agent's number and "Forward to the business".
- [ ] The forwarded card uses the business name, owner number, listing, website and portal - and reads politely to the owner.
- [ ] The owner's spare number owns the listing (check `listings` as admin).

### 4c. Fast photo bursts (2 min)
- [ ] As a live shop owner, send 4 product photos in one quick burst -> the summary says **4 photos**, and all 4 items appear (prices asked one by one).
- [ ] Send 2 more while the price questions are open -> the bot asks to finish prices rather than silently losing them.

### 4d. Human help (3 min)
- [ ] Send `I need help` -> the chat is held, the bot says a person is coming, and every admin gets "Help requested" with `reply <number>` / `release <number>`.
- [ ] Send another message while held -> it arrives at the admins, not the bot.
- [ ] As admin: `reply 263771234567 Hello, how can I help?` -> the customer receives it from the bot and the admin gets a sent confirmation.
- [ ] As admin: `release 263771234567` -> the customer is back on the bot.
- [ ] `help me find a plumber harare` still searches; it does not hold.

### 5. Duplicate rules (3 min)
- [ ] Agent enters an owner number that already has a listing -> "That number is already listed", with `📷 Another photo` and `✖ Cancel` buttons; tapping Cancel stops cleanly.
- [ ] If a photo's number is read wrong, publishing shows the same duplicate message with the two buttons; `📷 Another photo` restarts the photo step for the same owner.
- [ ] Owner (spare number) sends `register` and publishes a second listing with the same number -> allowed, and **every admin** gets "Owner added a second listing" with both businesses.
- [ ] A non-owner typing an existing listing number in a self registration -> blocked at publish with "That number is already listed".

### 6. Category tree (2 min)
- [ ] `category tree` -> tree with Connect / Disconnect / Close.
- [ ] Connect: tap Connect, send an approved child, then an approved parent, confirm -> tree re-renders with the branch.
- [ ] Disconnect: tap Disconnect, pick the branch, confirm -> tree re-renders without it.
- [ ] `connect category <child> to <parent>` still works, and reject a self/loop connection.

### 7. Core paths that must not regress (2 min)
- [ ] Admin `pending` -> verify one test listing -> owner gets the approval message.
- [ ] Normal self registration (non-admin): photo + manual skip, publish -> submitted for approval.
- [ ] Search a category connected in step 6 and confirm both names return the same shop.
- [ ] `orders`, `needs`, `digest` respond without errors.

## After the deploy

- [ ] Vercel deployment is **Ready** and `wa-directory-bot.vercel.app` points at it.
- [ ] Send one real WhatsApp message from a non-test number and confirm a reply.
- [ ] Watch Runtime Logs for 5 minutes; no `[webhook] message error` or `[onboarding]` failure bursts.
- [ ] Remove the staging number from the admin allowlist and delete test listings.

## Reverting a bad deploy

1. In Vercel, open the last known-good deployment -> Promote to Production.
2. In git, revert the offending commit on `master`; the push redeploys automatically.
3. Confirm the alias moved back before telling users it is fixed.
