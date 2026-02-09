# Authentication & Access Control

## Authentication

### Technology

BeardForce uses **Supabase Auth** for authentication. Supabase wraps PostgreSQL's `auth.users` table and provides JWT-based session management.

### Auth Flow

```
User visits app
    │
    ▼
PrivateRoute checks AuthContext.user
    │
    ├── null (not logged in) → redirect to /login
    │
    └── user exists → render Layout + child route
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
// Creates account, auto-provisions organization

signIn(email: string, password: string): Promise<void>
// Authenticates with Supabase Auth

signOut(): Promise<void>
// Clears session, redirects to /login

resetPassword(email: string): Promise<void>
// Sends password reset email via Supabase
```

**Auth State Listener:**
On mount, `AuthProvider` calls `supabase.auth.getSession()` and subscribes to `supabase.auth.onAuthStateChange()`. When the user logs in or out, the context updates automatically.

### Auth Service (`services/auth/authService.ts`)

Lower-level wrapper around Supabase Auth methods:

```typescript
signUp(email, password, metadata?): Promise<AuthResponse>
signIn(email, password): Promise<AuthResponse>
signOut(): Promise<void>
getCurrentUser(): Promise<User | null>
getSession(): Promise<Session | null>
onAuthStateChange(callback): Subscription
resetPassword(email): Promise<void>
updatePassword(newPassword): Promise<void>
```

---

## Organization System

### Concept

Every user belongs to exactly one **organization**. Organizations enable multi-tenant data isolation and role-based access control.

### Auto-Provisioning

When a user signs up or logs in for the first time:

1. `OrgContext` calls `accessControl.getCurrentMembership(user.id)`
2. If no membership exists, it auto-creates:
   - A new organization named `"{email-prefix}'s Organization"`
   - An `org_members` record with `role: 'admin'`
3. If the auto-provision fails (e.g., RLS blocks it), the user can still use the app but won't have admin features

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

### Access Control Service (`services/accessControl.ts`)

Direct Supabase queries for organization management:

```typescript
createOrganization(name, userId): Promise<Organization>
// Creates org + adds creator as admin member

getCurrentMembership(userId): Promise<OrgMember | null>
// Gets the user's org_members record

getOrganization(orgId): Promise<Organization | null>
// Fetches organization details

getOrgMembers(orgId): Promise<OrgMember[]>
// Lists all members of an org

updateMemberRole(memberId, newRole): Promise<void>
// Changes a member's role

removeMember(memberId): Promise<void>
// Removes a member from the org

addMember(orgId, userId, role, invitedBy): Promise<void>
// Adds a new member to the org

findUserByEmail(email): Promise<any>
// Looks up a user by email for invitations
```

### Permission Helpers

```typescript
canAccessSettings(role): boolean  // admin only
canEditData(role): boolean        // admin or editor
canViewData(role): boolean        // any role
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
   - Role badge color in sidebar (orange/blue/gray)

2. **Server-side (Supabase RLS):**
   - CRM tables: `user_id = auth.uid()` — scoped per user, not per role
   - Organization tables: RLS policies use `get_user_org_id()` function

**Note:** Currently, role-based data filtering (e.g., editors see only their own data, admins see all) is not yet implemented at the database level. All users with the same `user_id` see the same data. Role enforcement is primarily UI-level in v2.

---

## Supabase RLS Policies

### CRM Tables (leads, contacts, accounts, opportunities, orders, products)

Each CRM table has the same RLS pattern:

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own leads"
ON leads FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Organization Tables

These require special handling to avoid infinite recursion:

```sql
-- Helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_id(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = uid LIMIT 1;
$$;

-- organizations table
CREATE POLICY "org_insert" ON organizations
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "org_select" ON organizations
FOR SELECT USING (id = get_user_org_id(auth.uid()));

CREATE POLICY "org_update" ON organizations
FOR UPDATE USING (id = get_user_org_id(auth.uid()));

CREATE POLICY "org_delete" ON organizations
FOR DELETE USING (id = get_user_org_id(auth.uid()));

-- org_members table
CREATE POLICY "members_insert" ON org_members
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR org_id = get_user_org_id(auth.uid())
);

CREATE POLICY "members_select" ON org_members
FOR SELECT USING (
  user_id = auth.uid()
  OR org_id = get_user_org_id(auth.uid())
);

CREATE POLICY "members_update" ON org_members
FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "members_delete" ON org_members
FOR DELETE USING (org_id = get_user_org_id(auth.uid()));
```

### System Tables (code_snippets, system_snapshots, system_config)

```sql
-- Standard user-scoped policy
CREATE POLICY "Users manage own data"
ON code_snippets FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Known Issues

1. **Auto-provisioning can fail** if Supabase RLS INSERT policies block the request from the client. Workaround: manually insert organization + membership via Supabase SQL Editor.

2. **Role enforcement is UI-only** — an editor or viewer could theoretically call database methods directly (via browser console) since RLS only checks `user_id`, not `role`. Full role-based RLS is planned for v3.

3. **Single organization per user** — the current schema assumes one membership per user. Multi-org support would require changes to `getCurrentMembership()` and the org selection UI.
