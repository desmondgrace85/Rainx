# Rainx Notification Bug Fix — Task Plan

## Investigation
- [x] Examine user screenshots (3) to understand exact bug state
- [x] Clone repo & understand structure (pnpm monorepo: artifacts/rainx frontend, artifacts/api-server backend)
- [x] Map notification-related code: frontend (notification panels, badges, SW, push) + backend (notification endpoints, push, DB persistence)
- [x] Identify root cause(s) for each reported bug

## ROOT CAUSES (confirmed from code)
- **Bug #1 (push not delivered offline/closed):** `/api/push/send` is handled by the LOCAL `routes/push.ts` router (mounted before proxy). It requires local `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` env vars (never set per proxy.ts comment) AND reads a local `push_subscriptions` table that is never populated (subscriptions are proxied to Railway). So every `/api/push/send` returns 503 → no web-push ever leaves. Fix: proxy `/api/push/send` to Railway (RAINA_AI_URL) like keys/subscribe already are.
- **Bug #2 (community notif shown in trading/signals panel):** Foreground push path (`RAINX_PUSH_RECEIVED` handler in RainxApp.jsx ~line 2066) calls `enqueueInAppNotification` which adds the entry to the unified `notifications` state that backs the single "Notifications" panel (screenshots 1&2). Community pushes land there instead of being routed to the Community Notifications panel only. Also `type` mapping `data.kind || "update"` is fragile.
- **Bug #3 (no badge on community icon/bell):** The push path (`RAINX_PUSH_RECEIVED`) does NOT call `setCommunityUnreadCount(+1)`. So a community push delivered in-foreground increments the unified list but not the community badge. Also `unreadSections.community` is derived from `classifyNotification` on the unified list — community entries there DO contribute, but the unified bell marks them read on open which clears `unreadSections.community` yet `communityUnreadCount` (DB-backed) reasserts — inconsistent.
- **Bug #4 (community notif vanishes after refresh):** Community entries added via realtime (Path A) or push (Path B) are NEVER written to `user_notifications` DB. On refresh, the load effect replaces `notifications` with `user_notifications` rows only → community "New Reply" disappears. The `community_notifications` table IS the source of truth for community, but the unified panel doesn't read it.
- **Bug #5 (badge reappears after refresh / dismissed notifs reappear):** Unified bell "open" marks only `user_notifications` read (not `community_notifications`). `communityUnreadCount` polls `community_notifications` read=false and uses `Math.max(current, dbCount)` → on refresh current=0 then jumps to dbCount, so the community badge reappears even though the user already saw it via the unified toast. Also seen-ids dedupe uses different ids between Path A (row.id) and Path B (notificationId) so duplicates slip through and re-toast.

## DESIGN DECISION (clean fix, no new bugs)
Keep ONE source of truth per channel:
- **Trading/market/news** → `user_notifications` table + unified "Notifications" panel + Home bell badge.
- **Community** → `community_notifications` table + Community Notifications panel (CommunityNotifBell) + community nav/bell badge. Community events must NOT be injected into the unified `notifications` list.

Concretely:
1. **Backend:** add proxied `POST /api/push/send` → Railway (so offline push works). Keep local push.ts as a fallback only if VAPID env present. (proxy wins because it's the real subscription store.)
2. **Frontend Path A (community realtime, RainxApp ~2114):** do NOT call `enqueueInAppNotification` for community. Only `setCommunityUnreadCount(+1)` + optional in-app toast routed to community. (Currently it wrongly adds to unified list.)
3. **Frontend Path B (RAINX_PUSH_RECEIVED ~2066):** if `data.kind === "community"` (or category community / tag rainx-community), do NOT add to unified `notifications`. Instead `setCommunityUnreadCount(+1)` and show a community-routed toast. Only non-community pushes go to the unified list (and should be persisted to user_notifications for survival — but that's the backend's job via the originating pushNotification; for SW-delivered ones we skip to avoid dupes).
4. **Frontend persistence/refresh:** community badge must come ONLY from `community_notifications` read=false count (already does). Ensure opening the unified bell does NOT touch community. Ensure community "mark all read" clears DB + dispatches event (already does). Fix the `Math.max` reassert-on-refresh by also considering that the user opened the community panel this session.
5. **Dedupe:** unify the id used for community dedupe so Path A and the community panel agree (use community_notifications row id).
6. **SW:** ensure community push tag is `rainx-community` (already), and that offline delivery works once backend is fixed. Bump SW cache version.

## Bugs to fix (from user report)
1. **Push notifications not delivered when app is offline/closed** (used to work, now broken)
2. **Community activity notification routed to Signal/Trading notifications panel** instead of Community panel (screenshot shows "New Reply — Someone replied to your comment" in Trading panel at 00:14:47)
3. **No unread badge on Community notification icon & Community nav icon** even though activity happened (badge only reflects on trading signals area)
4. **Notifications disappear after app refresh** (screenshot 2 shows "New Reply" gone after refresh) — persistence broken
5. **Notifications persist/reattach after refresh even when already dismissed** (user says "it still shows after refresh yet you said you fixed it")

## Fix Implementation
- [x] Fix #1 Backend: proxy /api/push/send (and keys/subscribe) to Railway in push.ts; remove dead duplicate handlers in proxy.ts. Typecheck + build pass.
- [x] Fix #2/#3 Frontend Path B (RAINX_PUSH_RECEIVED): route community pushes to community (badge+toast), do NOT add to unified notifications list
- [x] Fix #2/#3 Frontend Path A (community realtime): do NOT add community events to unified notifications list; only increment community badge + community toast
- [x] Fix #4/#5 Frontend persistence/refresh: community badge sourced only from community_notifications; opening unified bell must not affect community; prevent community badge reassert-on-refresh after user already saw it
- [x] Bump SW cache version (force users onto fixed SW + app)
- [x] Verify no new regressions introduced (frontend + backend typecheck and build pass)

## Verification & Delivery
- [x] Typecheck / build passes (frontend tsc + vite build, backend tsc + build, libs tsc --build)
- [ ] Commit on a new branch + push
- [ ] Create PR with clear description of root causes & fixes
