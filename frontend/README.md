# Dean of Students Impact Dashboard - Front End (Overview page)

Plain HTML, CSS, and JavaScript. Charts use Chart.js (loaded from a CDN). All numbers are **sample data**.

## Run it
1. Open the `frontend/` folder in VS Code and install the **Live Server** extension, then click "Go Live".
   (Or run `python -m http.server` in this folder and open http://localhost:8000.)
2. Double-clicking `index.html` will NOT work: the browser blocks loading the JSON file. The page shows a message explaining this.

## Folder layout
| Path | Purpose |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | Layout and both themes (edit the variables at the top to change colors) |
| `js/app.js` | Loads the data, draws the table and charts, handles the dropdowns |
| `data/sample-data.json` | Fake aggregated numbers (no student-level records) |
| `tools/make_sample_data.py` | Regenerates the sample data: `python tools/make_sample_data.py` |

## What is on the Overview page
Key numbers, a unit table, participation by population (with the overall rate shown under it), Retriever Essentials unique vs. repeat students by month, unit share, and students served by unit across semesters.
The sample data is built so the numbers agree with each other (for example, undergraduate + graduate participants equal the unique students reached).

## Themes
Click the sidebar button to switch between `umbc` (black/gold, light content) and `rt` (dark slate like UMBC RT). The choice is remembered in the browser.

## Connecting real data later
Only `DATA_URL` and `loadData()` in `js/app.js` should need to change (for example, to a Python API endpoint). Keep the JSON shape the same, or update the render functions to match.

## Code conventions
- Every function has a header comment: `Name / Desc / Precondition / Postcondition`, plus step-by-step comments inside.
- 4-space indent, braces on every `if`/`for`, blank line after `{` and before `}` in function bodies.
- `if/else` instead of the ternary operator; no `break`/`continue` (use flag variables in loops).
- Plain `for` / `for...in` loops instead of `forEach`/`map`/`find`/`reduce`. The only array method used is `sort`, with a named comparison function.
- Callbacks and event handlers are named functions (`handleSemesterChange`, `sortByPercentDescending`), not inline anonymous functions.
- A function that returns a value stores it in a named variable first, then returns that variable.
- Page elements are looked up once in `cacheElements()` and reused; page text is set with `textContent` (never `innerHTML`).
- Naming: JavaScript `camelCase` functions/variables and `UPPER_SNAKE_CASE` constants; CSS/HTML `kebab-case` class and id names; Python `snake_case` functions/variables and `UPPER_SNAKE_CASE` constants.
- Commit small and often, on your own branch; open a pull request into `main`.

## Placeholders to replace
- The seven unit names (the real list is unconfirmed).
- Enrollment and population sizes (invented).
- All counts (invented).
