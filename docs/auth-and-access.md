# Authentication & Access Control

## Authentication

### Technology

RunwayCRM uses **Supabase Auth** for authentication. Supabase wraps PostgreSQL's `auth.users` table and provides JWT-based session management.

### Auth Flow

```
User visits app
    │
    ▼
PrivateRoute checks AuthContext.user
    │
    ├── null (not logged in) → redirect to /login
    │
    └── user exists → OrgContext loads membership → render Layout + child route
```

### AuthContext (`context/AuthContext.tsx`)

The `AuthProvider` wraps the entire app and provides auth state via `useAuth()`.

**State:**
| Field | Type | Description |
|-------|------|-------------|
| `user` | `User | null` | Current authenticated user |
| `session` | `Session | null` | Supabase session (contains JWT) |
| `loading` | `boolean` | True while auth state is resolving |

**Methods:**

```typescript
signUp(email: string, password: string): Promise<void>
// Creates account with full_name in user_metadata; sends confirmation email

signIn(email: string, password: string): Promise<void>
// Authenticates with Supabase Auth

signOut(): Promise<void>
// Clears session, redirects to /login

resetPassword(email: string): Promise<void>
// Sends password reset email via Supabase
```

**User metadata:** `user.user_metadata.full_name` stores the display name collected during registration. The sidebar shows this via `user?.user_metadata?.full_name || user?.email`.

**Email confirmation:** After sign-up, Supabase sends a confirmation email. The redirect URL must be configured in the Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://runwaycrm.com`
- Redirect URLs: `https://runwaycrm.com/**`, `https://beardforce.vercel.app/**`

---

## Organization System (v7 — Slack Model)

### Concept

Every user belongs to exactly one **organization**. Organizations provide isolated, shared workspaces — all team members of an org see the same CRM data. This is the "Slack model": everyone logs in at `runwaycrm.com` but each company gets its own private workspace.

### Auto-Provisioning

When a user signs up or logs in for the first time:

1. `OrgContext` calls `accessControl.getCurrentMembership(user.id)`
2. If no membership exists, it auto-creates:
   - A new organization named `"{email-prefix}'s Organization"`
   - An `org_members` record with `role: 'admin'`
3. If the auto-provision fails (e.g., RLS blocks it), manually run:

```sql
-- Find user ID
SELECT id, email FROM auth.users;
-- Create org
INSERT INTO organizations (name, created_by) VALUES ('My Org', 'YOUR_USER_ID');
-- Find org ID
SELECT id FROM organizations;
-- Add admin membership
INSERT INTO org_members (org_id, user_id, role, invited_by)
VALUES ('YOUR_ORG_ID', 'YOUR_USER_ID', 'admin', 'YOUR_USER_ID');
```

**File:** `context/OrgContext.tsx`

### OrgContext

Provides organization and role state via `useOrg()`.

**State:**
| Field | Type | Description |
|-------|------|-------------|
| `org` | `Organization | null` | Current organization |
| `membership` | `OrgMember | null` | Current user's membership record |
| `role` | `OrgRole | null` | Current role (admin, editor, viewer) |
| `isAdmin` | `boolean` | true if role === 'admin' |
| `isEditor` | `boolean` | true if role === 'editor' or 'admin' |
| `loading` | `boolean` | true while loading membership |
| `refresh()` | `() => Promise<void>` | Reload org membership (used after accepting invite) |

`OrgContext` also calls `databaseService.setOrgId(m.org_id)` after loading the membership, so all subsequent database queries are scoped to the correct org.

---

## Invite System (v7)

### Flow

```
Admin (Settings → Access)
  → enters teammate email + selects role
  → click "Invite"
  → accessControl.createInvite() creates org_invites row
  → invite link copied to clipboard:
      https://runwaycrm.com/accept-invite?token=<64-char hex>

Invitee opens link → AcceptInvitePage
  ├── Logged in: one-click "Accept" → joins org → redirected to /dashboard
  └── Not logged in:
        → "Login to accept" or "Create account & join"
        → token saved to localStorage('pending_invite_token')
        → redirects to /login or /register
        → after login, OrgContext reads localStorage
        → auto-accepts invite → reloads org → sees new workspace
```

### AcceptInvitePage (`components/AcceptInvitePage.tsx`)

Public route — no auth required. Route: `/accept-invite?token=xxx`

- Calls `supabase.rpc('get_invite_details', { invite_token })` (SECURITY DEFINER — works unauthenticated)
- Shows org name, role badge, and role description
- **States:** loading → valid / invalid / expired / accepting
- If expired or invalid: error card with link back to home

### Access Control Service (`services/accessControl.ts`)

#### Existing Methods

```typescript
createOrganization(name, userId): Promise<Organization>
getCurrentMembership(userId): Promise<OrgMember | null>
// Uses .order('joined_at', {ascending: false}).limit(1) — most-recently-joined org wins
getOrganization(orgId): Promise<Organization | null>
getOrgMembers(orgId): Promise<OrgMember[]>
updateMemberRole(memberId, newRole): Promise<void>
removeMember(memberId): Promise<void>
addMember(orgId, userId, role, invitedBy): Promise<void>
findUserByEmail(email): Promise<any>
```

#### Invite Methods (v7)

```typescript
createInvite(orgId, email, role, invitedBy): Promise<string>
// INSERT into org_invites, returns the 64-char hex token

getPendingInvites(orgId): Promise<OrgInvite[]>
// SELECT WHERE org_id AND status='pending' AND expires_at > now()

cancelInvite(inviteId): Promise<void>
// UPDATE SET status='cancelled'

acceptInvite(token, userId): Promise<void>
// 1. Validates invite (pending + not expired)
// 2. Calls addMember(invite.org_id, userId, invite.role, invite.invited_by)
// 3. UPDATE SET status='accepted'

getInviteDetails(token): Promise<InviteDetails | null>
// Calls supabase.rpc('get_invite_details') — works unauthenticated
```

### org_invites Table

```sql
CREATE TABLE org_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now()
);
```

Token is a 64-character hex string (32 random bytes). Expires in 7 days.

### Pending Token Auto-Accept

The invite accept flow must survive a login/registration redirect. The token is preserved in `localStorage` and auto-accepted on the next login:

```typescript
// In AcceptInvitePage — before redirecting to /login or /register:
localStorage.setItem('pending_invite_token', token);

// In OrgContext.loadMembership() — runs on every login:
const pendingToken = localStorage.getItem('pending_invite_token');
if (pendingToken && user?.id) {
  localStorage.removeItem('pending_invite_token');
  await accessControl.acceptInvite(pendingToken, user.id);
  m = await accessControl.getCurrentMembership(user.id); // reload — now returns new org
}
```

---

## Roles

| Role | UI Access | Data Access | Settings | Member Mgmt |
|------|-----------|-------------|----------|-------------|
| `admin` | Full | Read + Write | Yes | Yes |
| `editor` | Full except Settings | Read + Write | No | No |
| `viewer` | Read-only pages | Read only | No | No |

### Where Roles Are Enforced

1. **Client-side (UI gating):**
   - `Layout.tsx` conditionally renders Settings nav item (`isAdmin`)
   - `SettingsPage.tsx` renders admin-only tabs
   - Role badge color in sidebar: orange (admin) / blue (editor) / gray (viewer)

2. **Server-side (Supabase RLS):**
   - CRM tables: `org_id = get_user_org_id()` — scoped per organization
   - All org members share the same CRM data; role determines write access at the UI level

---

## Supabase RLS Policies

### Helper Function (avoids infinite recursion in org_members)

```sql
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid() LIMIT 1;
$$;
```

### CRM Tables (leads, contacts, accounts, opportunities, orders, products, change_log)

As of migration `006_org_invites_and_org_scope.sql`, CRM tables use **org-scoped RLS** so all org members share data:

```sql
-- Pattern repeated for each CRM table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- Drop old user_id policies, create org_id policies
CREATE POLICY "leads_org_select" ON leads FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "leads_org_insert" ON leads FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "leads_org_update" ON leads FOR UPDATE USING (org_id = public.get_user_org_id());
CREATE POLICY "leads_org_delete" ON leads FOR DELETE USING (org_id = public.get_user_org_id());
```

**Backfill:** Existing rows are updated — `org_id` set from the creator's `org_members` record.

### Organization Tables

```sql
-- organizations: separate INSERT/SELECT/UPDATE/DELETE policies
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id = public.get_user_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id = public.get_user_org_id());
CREATE POLICY "org_delete" ON organizations FOR DELETE USING (id = public.get_user_org_id());

-- org_members: user can see their own record + org mates
CREATE POLICY "members_insert" ON org_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR org_id = public.get_user_org_id());
CREATE POLICY "members_select" ON org_members FOR SELECT
  USING (user_id = auth.uid() OR org_id = public.get_user_org_id());
CREATE POLICY "members_update" ON org_members FOR UPDATE
  USING (org_id = public.get_user_org_id());
CREATE POLICY "members_delete" ON org_members FOR DELETE
  USING (org_id = public.get_user_org_id());
```

### org_invites Table

```sql
-- Admins can read/manage their org's invites; anyone can check a pending invite
CREATE POLICY "invites_select" ON org_invites FOR SELECT
  USING (org_id = public.get_user_org_id() OR status = 'pending');
CREATE POLICY "invites_insert" ON org_invites FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "invites_update" ON org_invites FOR UPDATE
  USING (org_id = public.get_user_org_id() OR auth.uid() IS NOT NULL);
CREATE POLICY "invites_delete" ON org_invites FOR DELETE
  USING (org_id = public.get_user_org_id());

-- SECURITY DEFINER RPC — works unauthenticated for the invite accept page
CREATE OR REPLACE FUNCTION public.get_invite_details(invite_token text)
RETURNS TABLE (invite_id uuid, org_id uuid, org_name text, role text,
               email text, expires_at timestamptz, status text)
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.org_id, o.name, i.role, i.email, i.expires_at, i.status
  FROM org_invites i
  JOIN organizations o ON o.id = i.org_id
  WHERE i.token = invite_token;
END; $$;
```

### System / Config Tables

```sql
-- User-scoped: code_snippets, system_snapshots, system_config, ai_budget, change_log
CREATE POLICY "users_own" ON code_snippets FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## Known Issues & Notes

1. **Auto-provisioning can fail** if Supabase RLS INSERT policies block the request from the client. Workaround: manually insert organization + membership via Supabase SQL Editor (see setup.md step 3e).

2. **Multiple memberships:** If a user accepts an invite while already having a personal org, `getCurrentMembership` returns the most-recently-joined org. The older personal org still exists but is no longer active for that user. Switching between orgs is not yet supported in the UI.

3. **Role enforcement is org-level only at the database level** — all members of an org can read/write all CRM data regardless of role. Role-based write restrictions (e.g., viewers cannot create leads) are enforced in the UI only. Full RBAC at the RLS level is planned for a future version.
