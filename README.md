# CSDC105-PRELIMS-BARANDON

Objective: Create a project that demonstrates the use of promises and async/await in vanilla JavaScript by fetching data from a public API.

## About

A PSP-style Pokemon Fetcher web app. Enter a Pokemon's name to fetch its sprite and abilities (with descriptions) from the [PokeAPI](https://pokeapi.co/).

- **HTML/CSS/JS only** — no frameworks, build tools, or dependencies.
- Uses `fetch` with `async`/`await` and `try`/`catch` for error handling.

## Project Structure

```
PRELIMS_CSDC105/
├── index.html      # Markup and layout
├── script.js       # Fetch logic (async/await, PokeAPI calls)
├── styles.css      # Styling
└── images/
    └── bg.jpg
```

## Setup

No installation or build step is required — this is a static site.

1. Clone or download this repository.
2. Open `PRELIMS_CSDC105/index.html` in a web browser.

That's it — the app runs entirely client-side and calls the PokeAPI directly.

### Optional: run with a local server

Opening `index.html` directly works fine for this app, but if you prefer serving it over `http://localhost` (e.g. to avoid browser quirks with `file://` URLs), you can use any static server, for example:

```bash
# using Python
cd PRELIMS_CSDC105
python -m http.server 8000
# then visit http://localhost:8000

# or using the VS Code "Live Server" extension
# right-click index.html -> "Open with Live Server"
```

## Usage

1. Type a Pokemon name (e.g. `pikachu`) into the input field.
2. Click **Fetch Pokemon**.
3. The app displays the Pokemon's sprite and a list of its abilities with descriptions.

## Requirements

- A modern web browser (Chrome, Edge, Firefox, etc.) with JavaScript enabled.
- An internet connection (to reach the PokeAPI).
