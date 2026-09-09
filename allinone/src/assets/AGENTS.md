# AGENTS.md — `src/assets/`

Static image and media assets imported by components and pages.

## Contents

- `ai103/` — answer-area and exhibit images for AI-103 exam questions (e.g., `q1-answer-area.png`, `q14-exhibit.png`). These are UI screenshots kept as 256-colour palette PNGs (`magick <f> -strip -colors 256 PNG8:<f>`) — ~¼ the size of full RGB with no visible loss on flat UI captures. Re-optimise any new drop-in the same way.
- `hero.png` — hero/landing image
- `react.svg`, `vite.svg` — framework logos
