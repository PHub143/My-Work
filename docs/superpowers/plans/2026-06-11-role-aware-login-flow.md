# Role-Aware Login Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the login page and route guards reflect whether the user is trying to enter Learning as a student or an admin-only app section.

**Architecture:** Keep the existing HashRouter and `/login` route. Add small frontend helpers for route intent, a minimal `AccessLocked` component for logged-in non-admins, and update route guards/Navbar/Login to use those helpers.

**Tech Stack:** React 19, Vite 8, React Router 7, plain CSS, existing Context auth.

---

## File Structure

- Create `allinone/src/utils/routeAccess.js`: shared route classification helpers.
- Create `allinone/src/components/AccessLocked.jsx`: minimal locked state with Logout.
- Modify `allinone/src/App.jsx`: make root explicit and keep route guards wired.
- Modify `allinone/src/components/Navbar.jsx`: show app tabs when logged out; hide admin tabs only for logged-in non-admin students.
- Modify `allinone/src/components/LearningRoute.jsx`: send anonymous users to student login context.
- Modify `allinone/src/components/AdminRoute.jsx`: render `AccessLocked` for logged-in non-admin users.
- Modify `allinone/src/components/ProtectedRoute.jsx`: render `AccessLocked` for logged-in non-admin users.
- Modify `allinone/src/pages/Login.jsx`: derive student/admin card mode from attempted route and validate post-login destination by role.
- Modify `allinone/src/pages/Login.css`: add mode/locked polish only if needed by the updated card.

## Task 1: Add route intent helpers

**Files:**
- Create: `allinone/src/utils/routeAccess.js`

- [ ] **Step 1: Create helper module**

```js
export const LEARNING_FALLBACK_ROUTE = '/learning/ai-103';
export const ADMIN_FALLBACK_ROUTE = '/';

export const isLearningPath = (path = '') => path.startsWith('/learning');

export const getLoginModeForPath = (path = '') => (
  isLearningPath(path) ? 'student' : 'admin'
);

export const canRoleAccessPath = (user, path, { isAdmin, isStudent }) => {
  if (isAdmin(user)) return true;
  if (isLearningPath(path)) return isStudent(user);
  return false;
};
```

- [ ] **Step 2: Run targeted lint**

Run: `cd allinone && npx eslint src/utils/routeAccess.js`

Expected: exit `0`.

- [ ] **Step 3: Commit**

```bash
git add allinone/src/utils/routeAccess.js
git commit -m "Add route access helpers"
```

## Task 2: Add minimal access lock component

**Files:**
- Create: `allinone/src/components/AccessLocked.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const AccessLocked = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: { from: location.pathname } });
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <h2>Admin login required</h2>
        <button type="button" className="login-submit-btn primary-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default AccessLocked;
```

- [ ] **Step 2: Run targeted lint**

Run: `cd allinone && npx eslint src/components/AccessLocked.jsx`

Expected: exit `0`.

- [ ] **Step 3: Commit**

```bash
git add allinone/src/components/AccessLocked.jsx
git commit -m "Add admin-required lock screen"
```

## Task 3: Update route guards and nav visibility

**Files:**
- Modify: `allinone/src/components/Navbar.jsx`
- Modify: `allinone/src/components/LearningRoute.jsx`
- Modify: `allinone/src/components/AdminRoute.jsx`
- Modify: `allinone/src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Update `Navbar.jsx`**

Show all tabs when logged out, show all tabs for admins, and show only Learning for logged-in students. Keep Learning dropdown behavior unchanged.

- [ ] **Step 2: Update route guards**

Use `AccessLocked` for logged-in non-admin users in `AdminRoute` and `ProtectedRoute`. Keep `LearningRoute` open to authenticated students/admins and redirect anonymous users with `from`.

- [ ] **Step 3: Run targeted lint**

Run:

```bash
cd allinone
npx eslint src/components/Navbar.jsx src/components/LearningRoute.jsx src/components/AdminRoute.jsx src/components/ProtectedRoute.jsx src/components/AccessLocked.jsx
```

Expected: exit `0`.

- [ ] **Step 4: Commit**

```bash
git add allinone/src/components/Navbar.jsx allinone/src/components/LearningRoute.jsx allinone/src/components/AdminRoute.jsx allinone/src/components/ProtectedRoute.jsx allinone/src/components/AccessLocked.jsx
git commit -m "Update route guards for role-aware login"
```

## Task 4: Update login card mode and post-login validation

**Files:**
- Modify: `allinone/src/pages/Login.jsx`
- Modify: `allinone/src/pages/Login.css`

- [ ] **Step 1: Update `Login.jsx`**

Derive mode from `location.state?.from`. Student mode uses `Student Login`, learning copy, and student placeholder. Admin mode uses `Admin Login`, admin copy, and admin placeholder. After successful login, decode the resulting current user roles and navigate only if the role can access the requested route.

- [ ] **Step 2: Update `Login.css` if the changed card needs spacing**

Keep any styling small and local to existing login classes.

- [ ] **Step 3: Run targeted lint**

Run:

```bash
cd allinone
npx eslint src/pages/Login.jsx src/pages/Login.css src/utils/routeAccess.js src/utils/roles.js
```

Expected: JS files lint clean. If ESLint does not accept CSS input, rerun without CSS and note that CSS is covered by build.

- [ ] **Step 4: Commit**

```bash
git add allinone/src/pages/Login.jsx allinone/src/pages/Login.css allinone/src/utils/routeAccess.js
git commit -m "Make login card role aware"
```

## Task 5: Browser verification and final checks

**Files:**
- No planned source edits unless verification finds an issue.

- [ ] **Step 1: Run focused frontend verification**

Run:

```bash
cd allinone
npx eslint src/App.jsx src/AuthContext.jsx src/utils/roles.js src/utils/routeAccess.js src/components/AdminRoute.jsx src/components/ProtectedRoute.jsx src/components/LearningRoute.jsx src/components/AccessLocked.jsx src/components/Navbar.jsx src/pages/Login.jsx
npm run build
```

Expected: exit `0`.

- [ ] **Step 2: Browser smoke test**

With dev server running at `http://127.0.0.1:5173/My-Work/allinone/`, verify:

- Logged out Navbar shows Documents, Gallery, Learning, Users, Upload, Settings.
- Visiting `#/learning/ai-103` redirects to `#/login` and shows `Student Login`.
- Visiting `#/users` redirects to `#/login` and shows `Admin Login`.
- Student lock state can be verified with a student token if available; otherwise document that role-specific authenticated smoke testing needs credentials.

- [ ] **Step 3: Check known full lint state**

Run: `cd allinone && npm run lint`

Expected: may still fail only in pre-existing `allinone/UI/*` reference files. Document exact scope.

- [ ] **Step 4: Check worktree**

Run:

```bash
git status --short
git diff --stat HEAD
```

Expected: clean after commits.
