# UI React Vite Checklist

## Before Editing

1. Read `src/App.jsx`.
2. Read `src/index.css`.
3. Read the target `.jsx` file and its paired `.css`.
4. Identify whether the work belongs in `pages/` or `components/`.

## Implementation Checklist

- Keep the existing React + plain CSS approach.
- Use the global CSS variables before inventing new tokens.
- Keep class names readable and scoped to the page or component.
- Ensure the layout works on narrow mobile widths and larger desktop screens.
- Add clear hover, focus, loading, empty, and error states where relevant.
- Avoid unnecessary abstraction for one-off UI.

## When Adding A New Route

- Add the page component under `src/pages`.
- Add its CSS file.
- Register the route in `src/App.jsx`.
- Ensure navigation is updated if the route should be discoverable.

## When Styling

- Prefer variables from `:root` in `src/index.css`.
- Keep typography and spacing consistent with the existing scale.
- Respect the current light/dark theme model.
- Avoid introducing a separate utility framework or component library.

## Verification

- Run the frontend build or lint when available.
- Check for layout regressions in navbar, page padding, and card spacing.
- Re-test both data-loaded and empty/error states when a page fetches from the API.
