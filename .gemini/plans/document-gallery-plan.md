# Plan: Document Filtering and Gallery Implementation

## Phase 1: Document Filtering (Exclude Images)

### Backend Updates
- **`api/services/fileService.js`**:
    - Update `getAllFiles({ limit, offset, excludeType, includeType })` to support filtering.
    - Update `countFiles({ excludeType, includeType })` to ensure pagination totals match the filters.
    - Logic: Use Prisma `startsWith` with `NOT` for `excludeType` and directly for `includeType`.
- **`api/controllers/fileController.js`**:
    - In `listFilesHandler`, extract `excludeType` and `includeType` from `req.query`.
    - Pass these parameters to the service methods.

### Frontend Updates
- **`allinone/src/pages/Documents.jsx`**:
    - Update the `useEffect` fetch call to use `${API_URL}/files?excludeType=image`.

## Phase 2: Gallery Page and Navigation Cleanup

### Backend Updates
- Ensure the filtering logic from Phase 1 correctly handles `includeType=image`.

### Frontend Updates
- **Navigation (`allinone/src/components/Navbar.jsx`)**:
    - Rename "About" link to "Gallery".
    - Update path to `/gallery`.
- **Routing (`allinone/src/App.jsx`)**:
    - Update route for `/about` to `/gallery`.
    - Replace `About` component with `Gallery`.
- **Page Creation (`allinone/src/pages/Gallery.jsx`)**:
    - Create `Gallery.jsx` and `Gallery.css`.
    - Implement fetching with `${API_URL}/files?includeType=image`.
    - Design a responsive image grid layout following Apple's HIG (rounded corners, glassmorphism, fluid transitions).
- **Cleanup**:
    - Delete `allinone/src/pages/About.jsx`.

## Validation
- Verify Documents page excludes images.
- Verify Gallery page only shows images.
- Ensure pagination works correctly for both filtered views.
