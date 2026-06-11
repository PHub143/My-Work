# Role-Aware Login Flow Design

## Goal

Make login intent clear for anonymous users while preserving the multi-role access model:

- Learning tab opens a student login card.
- Any non-learning tab opens an admin login card.
- Admin users can access every app section.
- Student users can access Learning only.
- Student users who try non-learning sections see a minimal lock page until they logout and sign in as admin.

## Current Problem

The app currently redirects anonymous users to a generic login page labeled "Admin Login". That is confusing when the user clicked Learning, because Learning is the student-accessible area.

The Navbar also hides the app tab menu when logged out, which prevents users from choosing their intended area before authentication.

## Navigation Behavior

The Navbar should show the app tabs even when no user is logged in:

- Documents
- Gallery
- Learning
- Users
- Upload
- Settings

Logged-in role visibility remains role-aware:

- Admin users see all tabs.
- Student users see Learning only.

When an anonymous user clicks a tab, route guards redirect them to `/login` with the attempted route in `location.state.from`.

## Login Card Modes

The existing `/login` route remains the only login route. It derives its display mode from the attempted route:

- `Student Login` when `from` starts with `/learning`.
- `Admin Login` for all other routes.

The login form remains the same endpoint and credential flow. Only the heading, short copy, placeholder, submit text, and post-login validation change.

## Post-Login Routing

After a successful login:

- Admin users can continue to the originally requested route.
- Student users can continue only to Learning routes.
- If a student signs in after requesting a non-learning route, show the locked page instead of silently redirecting.
- If an admin signs in after requesting Learning, allow it because admin has all access.

## Locked State

For logged-in students on non-learning routes, render a minimal lock page:

- Text: `Admin login required`
- One action: `Logout`

The lock page should not include a Back to Learning button, extra copy, or admin form. Logging out returns the user to the admin login context for the route they attempted.

## Route Guards

Learning guard:

- Anonymous users redirect to `/login` with `from` set to the learning route.
- Students and admins can enter.

Admin app guard:

- Anonymous users redirect to `/login` with `from` set to the attempted route.
- Admins can enter.
- Students see the lock page.

## Testing And Verification

Targeted verification should cover:

- Anonymous Learning click shows a Student Login card.
- Anonymous non-learning click shows an Admin Login card.
- Anonymous Navbar displays all tabs.
- Student user can access Learning.
- Student user attempting non-learning sections sees only `Admin login required` and `Logout`.
- Admin user can access Learning and admin sections.

The existing backend multi-role tests remain unchanged for this UI flow.
