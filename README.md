# Madinah Lab

Madinah Lab is a static Arabic learning web app built to run cleanly on GitHub Pages. It prioritizes:

- Fusha Arabic
- Madinah Book 1 lesson vocabulary
- Mobile and iPhone-friendly practice
- Multiple practice modes for the same lesson set

## What is included

- Flashcards with the exact red / check / green review flow
- Direction toggles for English to Arabic, Arabic to English, or mixed review
- Matching rounds for lesson vocabulary
- Arabic typing drills with optional strict haraqat mode
- Browser-based pronunciation checks using speech recognition when supported
- Session-only progress tracking through `sessionStorage`

## Current content seed

The starter data is transcribed from the Madinah Book 1 English key pages you provided. The app currently seeds:

- Lesson 1
- Lesson 2
- Lesson 3
- Lesson 4
- Lesson 4A
- Lesson 5
- Lesson 6
- Lesson 7
- Lesson 8

## Run locally

If you want pronunciation mode to work more reliably, serve the folder over localhost instead of opening the HTML file directly:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Hosting note

This build intentionally stores progress only for the current session because it is meant for GitHub Pages with no backend.
