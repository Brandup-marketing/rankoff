# Design

## Scene

A founder opens Rankoff from a community post on a phone or laptop to inspect the actual board. The first task is understanding the price and ranking rule; the next is judging a listed product or claiming a position. Dark English is the default, with light and Chinese preferences available.

## Color Strategy

Preserve the established RANKOFF identity: near-black surfaces, near-white text, red ranking and payment actions, and blue discovery/detail links. Green marks activity. Color is never proof that a business or click is verified.

The live source of tokens is styles.css. Dark defaults include --bg oklch(12% 0.008 25), --surface oklch(16% 0.009 25), --ink oklch(94% 0.004 25), --muted oklch(70% 0.01 25) and --accent oklch(64% 0.225 28). White text on red-filled controls uses --accent-fill oklch(55% 0.21 28) for contrast. The light theme supplies its own darker text/link tokens.

## Typography

Use the existing resilient sans-serif stack. Ranking and payment amounts use tabular numerals. Keep headings balanced and letter spacing no tighter than -0.04em. Product names wrap; mobile descriptions show two lines at readable size. Do not shrink the page merely to force the first three ranks above every device's fold.

## Layout

A recognizable mark with a legible wordmark leads the compact header. The selected #1 claim price and short entry form precede the market rail and leaderboard. Keep the hero compact, without audience or explanatory paragraphs. SaaS & Software, Developer Tools and AI Tools & Agents are prominent; other markets remain accessible.

Show ranks #1–#3, then the compact latest-activity ticker, then ranks #4 onward. Today's leaders and audience statistics follow the full ranking. Cards show the name, product description, sponsored status, market, distinct Visit website and Details links, Total paid, secondary Share and a contained claim action. On narrow screens, the amount and claim action occupy the final row. Do not float claim buttons across card boundaries.

## Components

Preserve the established modest radii, border-based surfaces, red #1 emphasis, pill controls and semantic dialogs. Primary/share touch targets are at least 44px. Every amount field needs a readable label and an accessible name with currency context. The board anchor targets the start of the ranking controls. About has a skip link.

## Motion

Move real settled activity continuously from right to left. Duplicate the rendered sequence only to make the loop seamless, keep duplicate links out of keyboard and accessibility navigation, and pause on hover, focus or touch. Show one static sequence when reduced motion is requested. Retain visible default content; no scroll animation is needed for the launch.

## Content and Proof

Say Paid placement, not Verified placement. Clicks are tracked redirects and can include repeats and automated traffic. Being overtaken changes position, not listing availability. Never fabricate product descriptions, ranking changes, visitors or launch results. Static Chinese translations must follow exact English changes.

The generic social preview uses assets/rankoff-og-claim.png and “Claim your position.” Lead outreach with a fresh screenshot of the real board, identifying its currency, scope, timeframe and capture date. Local QA fixtures are never marketing evidence.
