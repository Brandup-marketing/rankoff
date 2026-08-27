# CLAIM ONE

> Provisional brand direction. Domain and trademark clearance are required before public use.

## The name

**CLAIM ONE**

Not “outbid somebody.” Not “buy a rank.” The name is a public, confident action: a founder claims the first visible place in a specific launch moment.

The verbal system is simple:

- `Claim #1`
- `The first spot is open.`
- `Hold the lead.`
- `This week's public launch board.`

The product name should always appear with a space: `CLAIM ONE`. Do not use playful crypto-style spellings such as `CLM1`, extra symbols, or `.lol` as part of the identity.

## The strategic difference

| | Outbid-style auction | CLAIM ONE |
| --- | --- | --- |
| Core promise | Highest price wins | Win a visible launch moment, then prove the response |
| Product shape | Perpetual public bid object | Curated, time-bound public launch seasons |
| Buyer feeling | Outspend a competitor | Announce that your launch owns the moment |
| Audience value | Watch a price move | Discover a focused group of new products |
| Long-term value | Public placement | Verified impressions, clicks, leads and BrandUp Signal evidence |
| Brand tone | Rivalry | Conviction, momentum and public proof |

The rule remains transparent: paid sponsorship decides the placement. The difference is that CLAIM ONE gives the placement a reason to exist: a real launch season with an audience, a date and a shareable result.

## Positioning

**CLAIM ONE is the public launch board for products that want to be seen now.**

It is not a search-ranking product. It is not an editorial award. Every paid entry is visibly sponsored. A buyer gets an unmistakable public position; an audience gets a compact, useful view of what is launching; BrandUp Signal can later show the measurable response.

## Brand voice

| Use | Avoid |
| --- | --- |
| `Claim the first spot.` | `Destroy your rivals.` |
| `Sponsored position` | `Organic rank` |
| `Lead the launch board.` | `Guaranteed sales` |
| `See what happened next.` | `Hack the algorithm` |
| `Public launch season` | `Auction casino` |

The voice is direct, concise and accountable. It should feel like a good product launch announcement, not a trading platform or an SEO trick.

## Visual scene

A product marketer opens CLAIM ONE just after publishing a launch post. The screen feels like a live launch desk at a sharp independent publication: urgent enough to react, clear enough to trust. It is a public scoreboard, not a casino and not a generic SaaS dashboard.

## Design system

### Color strategy

**Full palette, used by role.** The current Rankoff deep green is retired. CLAIM ONE uses black-and-white publication structure, a saturated red for competitive action, and ultramarine only for verified outcome data.

```css
:root {
  --ink: oklch(0.17 0.012 270);
  --paper: oklch(0.985 0.002 270);
  --surface: oklch(0.955 0.006 270);
  --line: oklch(0.82 0.012 270);
  --claim: oklch(0.58 0.215 28);
  --claim-strong: oklch(0.48 0.205 28);
  --verified: oklch(0.49 0.17 260);
  --success: oklch(0.53 0.135 150);
}
```

- Red is only for Claim actions, current leader changes and urgency. It must never cover the whole interface.
- Ultramarine is only for verified clicks, leads and Signal evidence.
- Green remains a success state, not the brand color.
- Surfaces stay near-neutral, with enough contrast for dense data and sponsor disclosure.

### Typography

Use one robust humanist/system sans stack for the product UI. The display treatment comes from weight, scale and tabular numerals, not a novelty font.

- Brand name: 800 weight, all caps, `letter-spacing: 0.02em`.
- Headline: 3rem desktop, 2.25rem mobile; fixed product scale, never viewport-scaled.
- Board labels: 0.875rem minimum for interactive controls; prices use tabular numerals.
- Sentence case for all UI copy. No excess uppercase labels or tracked eyebrows.

### Mark

The mark is a **red bracket around a single black dot**. It means “this spot is claimable” without drawing a crown, trophy or a flame.

```text
[ . ]  CLAIM ONE
```

The bracket can become the active-state marker beside the current #1, the favicon and the share-card motif. It should be made as a small, geometric SVG only after legal name clearance; the product does not need a decorative logo illustration.

## Interface direction

### Header

`[ . ] CLAIM ONE` on the left. In the center: the active season and countdown. On the right: a quiet `Create listing` command and profile control.

No hero navigation and no marketing-style badge wall.

### First screen

The page begins with the current season title, not a generic “Pay to take #1” headline:

```text
AI tools launching this week
The public board for Aug 24-30
```

Below it is one wide `Current lead` band. It holds the product name, public sponsor price, time remaining and a single red `Claim #1` button. It is a structural band, not a floating card.

### The board

Dense, editorial rows with an explicit five-column rhythm:

```text
Rank | Product | Verified attention | Sponsor price | Action
```

- #1 gets a red bracket marker and subtle tinted row, not a giant trophy.
- Sponsor price is visually dominant only inside its own column.
- `Verified attention` is blue only when data is actually connected; otherwise it says `Tracking not connected` in neutral ink.
- The only primary action is `Claim #1` or `Move to #3`; share is a compact icon button with a tooltip.
- A visible `Sponsored` label remains on every row.

### Season close and proof

The completion state is more important than an endlessly live board:

```text
Season closed
Northstar held #1 for 4d 11h
2,804 verified visits · 81 waitlist joins
```

This becomes the share card and the durable content object that makes a later season worth joining.

## Motion

- On a successful claim, the updated row receives a 180ms red-tint flash and moves to its new index. No bouncing.
- Countdown changes without animation; only the final minute gets a concise color state.
- A new verified outcome fades in over 180ms in blue.
- All motion respects `prefers-reduced-motion`.

## What must not be copied

- No Outbid visual identity, wording, layout, asset, price mechanic copy, or “viral chaos” aesthetic.
- No casino language, fake urgency, fake users, fake traffic or synthetic bid history.
- No claim that sponsorship changes Google SEO.
- No crown, podium or dollar-sign illustration as a shortcut to communicate winning.

## Launch naming architecture

Use this hierarchy once the transactional product is live:

```text
CLAIM ONE                 Public product and launch seasons
CLAIM ONE / AI Launches   First category board
BrandUp Control           Operator console
BrandUp Signal            Verified outcome layer
```

This keeps the public product memorable while preserving BrandUp as the operating and measurement company behind it.
