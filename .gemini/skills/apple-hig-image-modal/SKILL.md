---
name: apple-hig-image-modal
description: Guidance for implementing an Apple Photos/iOS-style image viewing modal with full-bleed layout and glassmorphic overlays. Use when designing or refactoring image-centric modals to maximize viewing area and adhere to Apple HIG.
---

# Apple HIG Image Modal

This skill provides a workflow and design patterns for creating an immersive image viewing experience within a web application, inspired by Apple's Photos app and iOS design language.

## Design Philosophy

- **Immersive First:** The image is the primary focus. Use as much screen real estate as possible.
- **Contextual Metadata:** Metadata and actions should be secondary, presented in non-intrusive, translucent overlays.
- **Fluidity:** Use smooth, physics-based transitions for entering, exiting, and toggling information panels.
- **Glassmorphism:** Use `backdrop-filter: blur(20px)` and subtle translucent borders to create depth and maintain context.

## Core Layout Patterns

### 1. Full-Bleed Viewing (Desktop)
- **Container:** `95vw` width, `95vh` height.
- **Background:** Deep black (`#000`) or system background with heavy blur.
- **Image:** `object-fit: contain` to ensure the entire image is visible without cropping.
- **Overlay Panels:** Positioned at corners or sides with floating appearance.

### 2. Bottom Sheet (Mobile)
- **Breakpoint:** `<= 768px`.
- **Behavior:** Metadata panel slides up from the bottom, covering roughly 40-60% of the screen.
- **Interaction:** Scrollable content within the sheet; image remains visible behind the blur.

## Implementation Guide

### Structural Requirements
- **Overlay Toggle:** Use a boolean state (e.g., `showInfo`) to control the visibility of metadata.
- **Control Bar:** A subtle, translucent bar for buttons (Close, Info, Action, Delete).
- **Close Button:** Should use a clear, bold 'X' icon (e.g., `strokeWidth="3"`). **Avoid using simple `<line>` tags or ambiguous dots that can be clipped by container padding or border-radius.** Use a robust path like `<path d="M18 6L6 18M6 6l12 12"/>` and ensure the button has `padding: 0` and `box-sizing: border-box` to prevent icon distortion. Use Apple System Red (`#ff3b30` or `var(--color-system-red)`) for translucent backgrounds.
- **Z-Index Management:**
  - Base: Image
  - Level 1: Translucent Overlay Panels
  - Level 2: Interactive Controls (Close button)

### CSS Styling (Apple HIG)
```css
/* Container */
.modal-content {
  background: #000; /* Prioritize image framing */
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

/* Glassmorphic Panel */
.info-overlay {
  position: absolute;
  background: rgba(30, 30, 30, 0.65);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #fff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Interactive Elements */
.control-btn {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: #fff;
  padding: 0;
  box-sizing: border-box;
}

.control-btn svg {
  display: block;
}

.control-btn:focus-visible {
  outline: 2px solid #007aff;
  outline-offset: 2px;
}

.control-btn.close-btn {
  background: rgba(255, 59, 48, 0.8);
  color: #fff;
}

.control-btn.close-btn:hover {
  background: rgba(255, 59, 48, 1);
}
```

## Recommended Workflow for @fe-agent

1. **State Setup:** Add a toggle for the info panel and integrate it into the component's layout.
2. **Layout Overhaul:** Switch from a flex-split layout to an absolute/relative stacking layout for images.
3. **Refine Visuals:** Apply the glassmorphic styles and ensure high contrast for text over dynamic backgrounds.
4. **Add Transitions:** Implement CSS transitions or framer-motion animations for the "slide-in" or "fade-in" effect of the info panel.
5. **Mobile Optimization:** Ensure the info panel transforms into a bottom sheet on small screens.
