# Design

## Scene

A founder checks a live public product contest on a bright laptop screen after a launch post starts circulating: the page feels like a disciplined independent sports desk, with a visible challenge in every bid rather than the anxious darkness of a trading terminal.

## Color Strategy

Full palette by role: black and near-white anchor the RANKOFF identity; competition red signals bids and rank movement; ultramarine is reserved for verified outcome data.

```css
:root {
  --bg: oklch(0.985 0.002 270);
  --surface: oklch(0.955 0.006 270);
  --surface-strong: oklch(0.925 0.010 270);
  --ink: oklch(0.170 0.012 270);
  --muted: oklch(0.430 0.018 270);
  --line: oklch(0.800 0.012 270);
  --brand: oklch(0.170 0.012 270);
  --brand-strong: oklch(0.120 0.010 270);
  --accent: oklch(0.610 0.220 29);
  --accent-soft: oklch(0.940 0.045 29);
  --verified: oklch(0.490 0.170 260);
  --positive: oklch(0.530 0.135 150);
  --white: oklch(1 0 0);
}
```

## Typography

Use one resilient sans-serif family stack: `Inter`, `ui-sans-serif`, `system-ui`, `sans-serif`. The ranking number and bid price use tabular numerals. Display headings remain measured and never exceed 56px.

## Layout

The board is the first screen, not a marketing hero. A compact masthead establishes the rule; a persistent #1 challenge ticket then leads into an editorial-style, dense ranked list. On mobile, metadata stacks below a product title and bid actions remain full-width without changing order.

## Components

Use a stable 8px radius for cards and controls, rectangular price actions, semantic status chips, accessible dialogs, and a single icon language. Avoid nested cards, decorative gradients, and soft floating shadows.

## Motion

Use short state transitions only: a bid confirmation uses a subtle background flash and the changed row moves into place. All motion is disabled or reduced when the user requests reduced motion.
