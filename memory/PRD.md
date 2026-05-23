# Cofound — Product Requirements

A mobile-first cofounder/team-matching app for early-stage Indian builders.
Built on Expo (React Native + Expo Router) + FastAPI + MongoDB.

## Core flows
1. **Auth** — email/password JWT signup & login, plus Emergent-managed Google sign-in.
2. **Onboarding** — name, skills (≤4), interests (≤4), goal, stage, time-commitment, city, optional bio.
3. **Matches** — server ranks every onboarded user against the viewer using:
   - 35% skill complement (filling skill-category gaps)
   - 30% shared interests (Jaccard)
   - 15% time-commitment alignment
   - 10% stage proximity
   - 10% location overlap
   Score is rescaled to 35–99. Reasons surface gaps, shared interests, time, city.
4. **Connect** — send / accept / reject 1-1 connect requests. Status reflected on match cards.
5. **Chat** — accepted pairs get 1-1 chat with 3s polling.
6. **Rooms** — 8 seeded startup domain rooms (AI, SaaS, FinTech, EdTech, Gaming, Space, Creator, Climate). Join/leave is per user.
7. **AI Mentor** — Claude Sonnet 4.5 via emergentintegrations. 5 free messages/day per user, server-enforced, daily reset (UTC).
8. **Profile** — view, edit (re-opens onboarding), logout.

## Tech & integrations
- **Frontend**: Expo SDK 54, Expo Router, Bricolage Grotesque + Hanken Grotesk, BlurView floating tab bar.
- **Backend**: FastAPI, Motor (MongoDB), bcrypt+JWT, httpx (Emergent OAuth verification).
- **LLM**: emergentintegrations `LlmChat` → `anthropic / claude-sonnet-4-5-20250929`, key = `EMERGENT_LLM_KEY`.
- **Storage**: `@/src/utils/storage` (SecureStore on native, localStorage on web) for the auth token only.
- **Seed**: 14 demo users + 8 rooms inserted idempotently on backend startup.

## Future smart enhancements
- Push notifications when an incoming connect request lands.
- Cofounder "fit interview" — AI-driven 5-question rubric scoring a real conversation.
- Room-channel chat (group rooms) with weekly highlight emails to keep dormant builders engaged.
- Premium tier ($5/mo) for unlimited AI mentor + boosted profile in matches list (revenue lever).

## Known limits
- Chat uses 3-second polling, not WebSockets (deliberate MVP choice).
- Web Google sign-in redirects via full-page navigation; native uses ASWebAuthenticationSession.
- AI mentor "thinking…" is shown synchronously while the request is in flight (no streaming).
