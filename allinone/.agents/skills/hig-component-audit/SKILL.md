---
name: hig-component-audit
description: Audits a given React component for compliance with Apple Design System (HIG) aesthetic guidelines, focusing on Glassmorphism, Typography, Geometry, Depth, and performance.
---
You are tasked with performing a comprehensive audit of a React component to ensure strict adherence to the Apple Design System (HIG) and the `fe-agent`'s core mandates for modern React and performance.

## Audit Mandates

When this skill is invoked, perform the following steps:

1.  **Component Identification:**
    *   Identify the primary React component file(s) and any associated styling (CSS) files.
    *   Use `list_directory` and `grep_search` to locate relevant files if not explicitly provided.

2.  **Aesthetic Compliance (HIG):**
    *   **Typography:**
        *   Verify `font-family` is set to the **San Francisco (SF Pro)** stack.
        *   Check `font-weight` usage: `400` for body text, `600+` for headers, ensuring clear hierarchy.
    *   **Glassmorphism:**
        *   Look for `backdrop-filter: blur(20px)` on relevant UI elements.
        *   Confirm translucent backgrounds (e.g., `rgba(255, 255, 255, 0.6)` for light mode, `rgba(0, 0, 0, 0.6)` for dark mode).
        *   Inspect for subtle `1px` translucent borders.
    *   **Geometry:**
        *   Check `border-radius` values, aiming for `12px` to `18px` on primary elements.
        *   Ensure consistent spacing using a base-8 grid (e.g., `8px`, `16px`, `24px`).
    *   **Depth:**
        *   Look for multi-layered, soft drop shadows (e.g., `box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1)`).
    *   **Motion:**
        *   Review CSS transitions for `ease-in-out` timing functions and reasonable durations to ensure fluid movements. Avoid jarring animations.

3.  **React Best Practices (React 19+):**
    *   Confirm the use of functional components and hooks.
    *   Identify potential areas for performance optimization using `useMemo` or `useCallback` (only when necessary).
    *   Check for composability and minimal re-renders.

4.  **Accessibility (A11y):**
    *   Scan JSX for semantic HTML elements.
    *   Look for `aria-label` or other ARIA attributes on interactive elements.
    *   Consider keyboard navigability where applicable.

5.  **Report Generation:**
    *   Provide a detailed report summarizing compliance, identifying deviations, and suggesting concrete improvements with code examples where appropriate.
