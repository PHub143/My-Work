---
name: ui-react-vite
description: Build, redesign, and refine UI in the allinone Vite React frontend. Use when Codex needs to add or update pages, components, layout, navigation, loading states, responsive behavior, or visual styling in `allinone/src` using React, React Router, and plain CSS files.
---

# UI React Vite

Use this skill when working on the `allinone/` frontend. Preserve the existing stack and file organization: React components in `.jsx`, route-driven pages, and dedicated `.css` files per page or component.

## Stack And Structure

- Vite app with React
- Routing via `react-router-dom`
- Styling with plain CSS imports, not Tailwind or CSS-in-JS
- Global design tokens and theme variables in `src/index.css`
- Page components in `src/pages`
- Reusable UI pieces in `src/components`

Read these files first before changing UI:

- `allinone/src/App.jsx`
- `allinone/src/index.css`
- the relevant page/component `.jsx`
- the matching `.css` file

## Working Rules

1. Match the existing structure before introducing new patterns.
2. Prefer editing the page-specific or component-specific CSS file instead of pushing everything into `index.css`.
3. Reuse existing CSS variables for spacing, typography, colors, radius, and surfaces whenever possible.
4. Keep routing changes aligned with `src/App.jsx`.
5. Preserve lazy-loaded page boundaries unless there is a strong reason to change them.
6. Maintain mobile usability and desktop balance for every UI change.

## Design Expectations

This repo already leans toward an Apple-like token system with glassy surfaces and light/dark theme handling. Respect that direction unless the user explicitly asks for a different visual language.

When designing or revising screens:

- use clear hierarchy and strong spacing
- keep content blocks visually grouped
- prefer a few intentional surfaces over many nested containers
- make empty, loading, and error states look deliberate
- avoid bolting on a new design system or utility framework

## Common Tasks

### Add Or Update A Page

1. Update the page component in `src/pages`.
2. Update or create the paired CSS file.
3. Verify route wiring in `src/App.jsx`.
4. Reuse shared components only when the pattern is actually repeated.

### Add Or Refine A Shared Component

1. Place reusable UI in `src/components`.
2. Keep the API small and explicit.
3. Add or update the paired CSS file.
4. Do not over-generalize one-off page structure into a shared component.

### Improve Visual Polish

Focus on:

- spacing rhythm
- type scale usage
- surface contrast
- interaction states
- loading and empty states
- responsive layout

## Theme Guidance

Check `ThemeContext.jsx` and `src/index.css` before adding theme-dependent UI. Prefer CSS variables over hard-coded colors. New UI should remain legible in both the default and dark-theme flows already supported by the app.

## Repo-Specific Notes

- Navigation lives in `src/components/Navbar.jsx`.
- Route content is rendered inside `main.content-container`.
- Current pages fetch and render remote data, so loading and error states matter.
- Existing files often pair `Component.jsx` with `Component.css`; follow that convention.

## References

Read `references/checklist.md` for a concrete checklist before implementing a UI change.
