# CLAUDE.md — allinone/ (frontend)

@AGENTS.md

Before editing CSS that involves light/dark theming, read
`../.cursor/rules/light-dark-mode-text-contrast.mdc`: the lightningcss minifier
strips `[data-theme]` selectors that share a class with the base rule — scope
theme values as CSS variables on a parent class instead.
