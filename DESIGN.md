# Design

## Scene

A business owner opens Rankoff from a community post on a phone or laptop to inspect the actual board. The first task is understanding the price and ranking rule; the next is judging a listed business or claiming a position. Dark and English are the first-visit defaults (Jake, 2026-09-20; this supersedes the 13 September light default). A saved light theme, Chinese or Malay choice is honoured on later visits, an explicit ?lang link wins over the saved language, and neither the system colour scheme nor the browser language overrides the first-visit default. The initial HTML and the boot scripts already carry the final theme and language, so nothing flashes.

## Color Strategy

Preserve the established RANKOFF identity: near-black pages and surfaces, near-white text, red ranking and payment actions, and blue discovery/detail links. Green marks activity. Light mode remains a saved choice with warm white pages, white surfaces and dark text. The compact header uses the original rankoff-favicon.png artwork. Light mode adapts its colours and blends its background with CSS; preserve the original shape and never substitute the older SVG marks. Dark mode uses near-black surfaces with near-white text. Share cards retain the black and red design. Color is never proof that a business or click is verified.

The live source of tokens is styles.css. Dark defaults include --bg oklch(12% 0.008 25), --surface oklch(16% 0.009 25), --ink oklch(94% 0.004 25), --muted oklch(70% 0.01 25) and --accent oklch(64% 0.225 28). White text on red-filled controls uses --accent-fill oklch(55% 0.21 28) for contrast. The light theme supplies its own darker text/link tokens.

## Typography

Use the existing resilient sans-serif stack. Ranking and payment amounts use tabular numerals. Keep headings balanced and letter spacing no tighter than -0.04em. Product names wrap; mobile descriptions show two lines at readable size. Do not shrink the page merely to force the first three ranks above every device's fold.

## Layout

A recognizable mark with a legible wordmark leads the compact header. The selected #1 claim price and short entry form precede the market rail and leaderboard. Keep the hero compact, without audience or explanatory paragraphs. SaaS & Software, Developer Tools and AI Tools & Agents are prominent; other markets remain accessible.

Keep the original global board and industry controls. Do not add a country selector, location badges or a fixed-rate paragraph to the leaderboard in this release. Preserve the existing logo, merchant cards, totals band, cumulative traffic and ranking order. The currency change must not look like a replacement product. Existing sourced location and service facts remain on merchant detail pages.

Show ranks #1–#3, then the compact latest-activity ticker, then ranks #4 onward. A full-width Today’s leaders row and editorial Board totals band follow the full ranking. The totals band uses three red rules and large figures rather than a dashboard card. Cards show the name, product description, sponsored status, market, distinct Visit website and Details links, Total paid, secondary Share and a contained claim action. On narrow screens, the amount and claim action occupy the final row. Do not float claim buttons across card boundaries.

## Components

Preserve the established modest radii, border-based surfaces, red #1 emphasis, pill controls and semantic dialogs. Primary/share touch targets are at least 44px. Every amount field needs a readable label and an accessible name with currency context. The board anchor targets the start of the ranking controls. About has a skip link.

## Motion

Move real settled activity continuously from right to left. Duplicate the rendered sequence only to make the loop seamless, keep duplicate links out of keyboard and accessibility navigation, and pause on hover, focus or touch. Show one static sequence when reduced motion is requested. Retain visible default content; no scroll animation is needed for the launch.

## Content and Proof

Say Paid placement, not Verified placement. Clicks are tracked redirects and can include repeats and automated traffic. Being overtaken changes position, not listing availability. Never fabricate product descriptions, ranking changes, visitors or launch results. Static Chinese translations must follow exact English changes.

Present Rankoff as discovery for businesses, products and services across countries. Explain cross-border and local relevance on About and the existing guides; do not imply every listing serves globally. Keep the existing Malaysian guide and merchant facts as useful local content. English, Chinese and Malay must carry the same positioning and live pricing; US$100 is a release target until the actual board switches. Record exact conversion policy in the release/accounting documentation, without adding the removed fixed-rate notice back to the board.

The generic social preview uses assets/rankoff-og-claim.png and “Claim your position.” Lead outreach with a fresh screenshot of the real board, identifying its currency, scope, timeframe and capture date. Local QA fixtures are never marketing evidence.
