# Rankoff MVP

Rankoff is an isolated, no-dependency public pay-to-rank prototype. The browser demo implements a usable board, category and timeframe filters, a transparent bid stepper, local bid state, rank reordering, and share feedback.

## Run locally

```sh
python3 -m http.server 4173 --directory /Users/jakening/Documents/Codex/rankoff
```

Open `http://localhost:4173`.

## Demo boundary

This version never sends a payment request or makes a payment claim. Bids are stored in `localStorage` only. Clearing site data resets them. Production requirements are listed in [PRODUCTION_HANDOFF.md](./PRODUCTION_HANDOFF.md).

## Files

- `index.html` - semantic, accessible product surface
- `styles.css` - responsive visual system
- `app.js` - deterministic local board and bidding interaction
- `PRODUCT.md` and `DESIGN.md` - product and visual decisions
- `PRODUCTION_HANDOFF.md` - real payment and operating controls needed before launch
