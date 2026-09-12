# Bahasa Melayu

Public pages support `?lang=ms`, alongside English and Chinese. The language selector preserves the current page and filters. Prices remain the live board's MYR prices.

`ms-copy.js`, `ms-legal.js` and `ms-answers.js` hold shared Malay copy. `functions/_lib/malay.js` translates server HTML and structured metadata; `locale.js` translates dynamic UI from the existing controllers. Customer names, source biographies and URLs remain unchanged. New English interface copy needs a matching Malay entry or dynamic pattern.

Malay canonicals and reciprocal language alternates are served on public pages and included in both static and listing sitemaps. English remains the binding legal version, linked from the Malay policies.

Rankoff's review, consent and return messages are translated. Hosted payment-provider screens are controlled by the provider. The checkout return restores the selected language within the browser session; payment amounts and settlement logic are unchanged.

Validation: syntax checks, backend tests, static build, Pages function bundle, and real browser checks of desktop/mobile home, profile, About, categories, policies, answers, review dialog, share image and EN/ZH switching. Local QA uses a public board snapshot and blocks payments and outbound click recording.
