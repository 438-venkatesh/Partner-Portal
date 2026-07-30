# SQL-RAG PPTX Generator

A standalone Python script that builds a 12-slide widescreen (16:9) PowerPoint
deck describing the **SQL-RAG** project (a hybrid SQL + semantic RAG system).
It uses `python-pptx` to draw every shape and text box programmatically —
there is no `.pptx` template file involved.

## Requirements

```bash
pip install python-pptx
```

## Usage

```bash
python3 generate_sql_rag_pptx.py
```

The deck is written to `output/SQL_RAG_Presentation.pptx` (created next to
the script, gitignored — regenerate it any time by re-running the script).

## How it's structured

- **Palette** — a small set of `RGBColor` constants (`DARK_BG`, `ACCENT`,
  `GREEN`, `YELLOW`, etc.) applied consistently across every slide.
- **Helpers** — reusable building blocks used by every slide:
  - `fill_slide(slide, color)` — solid background fill
  - `add_rect(...)` — colored rectangle / card, with optional border
  - `add_text(...)` — a text box with one styled run
  - `add_para(tf, ...)` — appends a styled paragraph to an existing text frame
  - `header_bar` / `footer_bar` / `slide_number` — the repeating chrome on
    every slide
- **Slides 1–12** — each is a self-contained block that adds one
  `prs.slides.add_slide(BLANK)` slide and lays out its content with the
  helpers above. Slide order:
  1. Title
  2. Agenda
  3. Problem Statement
  4. Our Solution
  5. System Architecture
  6. Tech Stack
  7. Key Features
  8. Query Routing Flow
  9. Database Schema
  10. Query Examples
  11. Results & Benefits
  12. Conclusion & Future Work

## Customizing

- **Content**: edit the data tuples/lists inside each slide block (e.g.
  `techs`, `features`, `schema`, `future`) — layout code doesn't need to
  change for text edits.
- **Colors**: change the palette constants at the top of the file.
- **Slide count**: `slide_number(s, N)` takes the current slide number; the
  `total` default (12) is cosmetic footer text only.
