# Business detail pages

Existing `/product/<hostname>` and `/profile/<platform>/<handle>` URLs remain canonical. The English and Chinese pages contain the business description and source information in server-rendered HTML, alongside the separate sponsored ranking record.

## Sources and maintenance

`functions/_lib/business-facts.js` contains the first four editorial profiles. Each entry has its source URL and the date that source was actually checked. Summaries are short factual descriptions; service lists and locations come from the source, without copying performance claims, medical outcomes, reviews or promotional prices.

The initial sources checked on 12 September 2026 were:

- https://www.brandupdesignmarketing.com/ — services section and service-area answer.
- https://rakanjayahardware.com/ — product collections and the Kemaman location in its footer.
- https://www.orientalwellness.my/ — listed massage/wellness services and Plaza Arkadia location.
- https://uscpap.my/ — purchasing assistance, equipment and Malaysian delivery information.

These facts are maintained manually. They are not an automatic extraction pipeline. A newly paid listing still receives its own detail page, saved description, destination/source link and correction contact; it receives no invented services, address or review date. Instagram accounts retain their existing saved biographies and image proxy.

To add or correct reviewed details:

1. Open the business's own website or reliable public profile. Do not infer service areas from an address, or services from a category label.
2. Add only substantiated fields, with equivalent English and Chinese summaries. Omit unknown fields. Update `reviewedAt` only after reading the source again.
3. Keep the source URL. A paid placement does not establish ownership, incorporation or independent verification. BrandUp and Rankoff share the Brandup Marketing operator, as disclosed in the site footer.
4. Run the project gate and inspect both languages in a real browser. Publication follows the existing GitHub → `rankoff-git` Pages workflow.

This initial data file affects detail pages only. It does not rewrite customer records in D1 or alter their payments, logos or ranking values. New source metadata does not automatically replace these editorial summaries; subsequent corrections must be reviewed here.

## Search and measurement

- JSON-LD describes the same name, summary, image, known location and service areas shown to a visitor. Reviewed business entities use `Organization`; unknown account types stay generic. No ratings, `LocalBusiness` addresses or ownership badges are invented.
- Outbound merchant links remain `sponsored nofollow`. The primary visit button uses the existing tracked `/go/<id>` redirect and session attribution. The source citation goes directly to the source and is not included in that redirect count.
- Existing acquisition sessions and campaign-to-payment tracking continue. No per-profile view counter or AI-citation measurement is added in this stage; existing totals must not be relabelled as profile views or unique customers.
- Sitemaps use the later of the listing's payment date and its editorial review date. They never use the current request time to suggest a fresh review.
- Search eligibility and AI citations are outcomes to measure, not results promised by a paid position. Check the existing Search Console property after recrawling; do not treat a passing schema test as proof of indexing.

Technical references: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [Schema.org Organization](https://schema.org/Organization).
