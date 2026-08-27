# RANKOFF

> Working identity direction. Complete domain and trademark clearance before public launch.

## Brand decision

**RANKOFF** is the public-facing master brand. Always write it as one word; never `Rank Off`.

The name combines `rank` with the competitive cadence of `face-off` and `playoff`. It names the event, not merely the payment mechanic: products enter a public rankoff, challenge the lead, and prove what the resulting attention delivered.

Do not use `Outbid Asia`, `outbid.my`, `BID ONE`, `HOLD ONE`, or `CLAIM ONE` as the master brand.

## Positioning

**RANKOFF is the live sponsored ranking contest for products launching now.**

> Take #1. Prove the attention.

Highest verified bid leads the board. Measured response shows what the position delivered.

## Language system

| Moment | Copy |
| --- | --- |
| Event | `This week's Rankoff` |
| Primary action | `Challenge #1` |
| Entry action | `Enter the Rankoff` |
| Current leader | `Current title holder` |
| Lead change | `The lead changed hands.` |
| Season close | `Won the Rankoff · Held #1 for 4d 11h` |
| Proof | `2,804 verified visits` |

Avoid casino language, fake urgency, SEO claims, or wording that implies an editorial award.

## Logo

The mark combines a white `R` with a red three-step ranking path. The path moves up and to the right, while the `R` cuts into it like a challenger entering the board. It is competitive without relying on crowns, trophies, gavels, flames, or dollar signs.

## Color system

```css
:root {
  --ink: oklch(0.17 0.012 270);
  --paper: oklch(0.985 0.002 270);
  --surface: oklch(0.955 0.006 270);
  --line: oklch(0.80 0.012 270);
  --action: oklch(0.61 0.22 29);
  --action-strong: oklch(0.56 0.205 29);
  --verified: oklch(0.49 0.17 260);
  --success: oklch(0.53 0.135 150);
}
```

Red means challenge and rank movement. Ultramarine is reserved for verified outcomes. Green is a success state, not the identity.

## Architecture

```text
RANKOFF                 Public product
RANKOFF / AI Launches   Weekly category season
RANKOFF Record          Closed-season result page
BrandUp Control         Operator console
BrandUp Signal          Verified outcome layer
```
