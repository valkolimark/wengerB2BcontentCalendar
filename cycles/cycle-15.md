# Cycle 15 — Admin user management (v1.7.1)

**Goal:** Let an admin **add people** to the calendar (and remove / reset
passwords) from the in-app **Team** page, instead of only editing roles.

**Starting state:** end of Cycle 14. The Team page already listed profiles and
edited role + financial access; there was no way to create a login.

## Delivered

1. **Admin client — `src/lib/supabase/admin.ts`** (`server-only`): a service-role
   Supabase client. The only path that can use the Auth Admin API (create/delete
   users, set passwords). Never imported client-side; every caller is
   `requireAdmin()`-gated.
2. **Actions** (admin only):
   - `createUser({email, password, role, canSeeFinancials})` — creates the auth
     user with `email_confirm: true` (immediate sign-in, no verification email),
     then sets the profile's role + financial flag. The `on_auth_user_created`
     trigger seeds the profile; we upsert over it.
   - `resetUserPassword(userId, password)` — admin password reset.
   - `deleteUser(userId)` — removes the auth row (profile cascades); refuses to
     delete yourself.
3. **UI — Team page:** an **Add a user** card (email, generated/editable initial
   password, role, financial toggle) that shows the new credentials to hand off;
   plus per-row **reset password** and **remove** actions.

## Notes / out of scope

- Passwords are set directly (no email invite) because Supabase SMTP isn't
  configured. If SMTP is added later, switch to `inviteUserByEmail`.
- Min password length 8. Role rules unchanged: admins always have financials,
  external never, members are toggleable.
