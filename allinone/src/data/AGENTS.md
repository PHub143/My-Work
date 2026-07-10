# AGENTS.md — `src/data/`

Static content and data files.

## Files

| File | Description |
|---|---|
| `ai103Content.json` | AI-103 course content (pages, questions, exhibits) |
| `englishContent.json` | English reading content (TOEIC Parts 5–7: incomplete sentences, text completion, reading comprehension) |
| `englishListeningContent.json` | English listening content (TOEIC Parts 1–4); segment transcripts drive TTS generation via `scripts/generate-english-audio.mjs` (macOS `say`; output in `src/assets/english/audio/`) |
| `vocabDecks.json` | English vocabulary flashcard decks by TOEIC topic (word, definition, example, Vietnamese gloss) |
