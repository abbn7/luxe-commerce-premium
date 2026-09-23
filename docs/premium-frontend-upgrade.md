# Premium storefront and media upgrade

This implementation follows the approved [architecture and market audit](frontend-audit.md). It preserves the single-store Railway deployment, existing content types, commerce models, authentication, upload endpoint and Telegram order flow.

## What changes for a store owner

- One media field now serves products, collections, lookbook, homepage sections, about images and branding. It supports gallery/file selection, dropping files, existing-library reuse, real upload progress, validation, replacement, removal and product-image ordering/cover selection.
- Upload results are committed individually. One failed file cannot erase successful files in the same batch. Failed files have retry controls, and saving a form during pending uploads is blocked. Uploading an asset does not publish it until the form is saved.
- Each placement explains its recommended dimensions and ratio. Recommendations are guidance, not arbitrary rejection of otherwise valid images. The existing server still decodes, rotates, resizes and deduplicates uploads.
- Hero, promotional, story, collection and lookbook images have non-destructive framing controls: contain/cover, desktop and mobile horizontal/vertical positions, reset and previews. Reusing one media asset never changes another placement's framing.
- Hero and promotional sections accept optional mobile artwork. A missing mobile source falls back to the main image; a mobile-only selection can also serve as the main image.
- Hero sections offer image-led overlay and editorial split layouts, text alignment and adjustable image shade. Existing records default to image-led overlay without requiring resaving.
- The section editor previews the actual hero/story/promotion components in English or Arabic and at desktop/mobile canvas sizes. The full section preview is authoritative; the isolated image preview helps position the subject in a representative frame.
- Section lists show thumbnails and content titles. The dashboard includes storefront preview and homepage readiness. All seven section types and their existing fields remain available.

## Storefront presentation

The porcelain/ivory, ink and muted gold identity and existing bilingual font families are retained. The upgrade adds a shared editorial scale for hero/story/campaign composition, responsive split layout, deliberate mobile stacking and consistent image framing.

Product photography uses a reserved 3:4 frame with `contain`, so the full product remains visible. Product galleries load the selected large image, provide named thumbnails and image navigation, and open an accessible native-dialog detail view. Wishlist actions remain visible on touch screens. Collection and lookbook images consume their dashboard framing settings. Lookbook figures now reserve their height and captions remain visible without hover.

The header has a collision-resistant responsive layout, uses the configured logo and has a solid readable surface. Search and mobile navigation use native modal focus containment and Escape behavior. Search uses the configured currency, cancels obsolete requests and displays a real failure state. The footer displays the configured brand tagline instead of an unsupported newsletter promise. A homepage with zero visible sections displays the configured brand name/tagline and collections link instead of a blank body.

Images retain Next.js responsive optimization, explicit `sizes`, reserved geometry and priority for the leading hero. Alternate mobile art uses a picture source without preloading both desktop and mobile assets. No runtime dependency was added. Below-the-fold reveal effects progressively enhance content rather than hiding it in server-rendered HTML. Reduced motion remains supported.

## Persistence and deployment

`002_image_presentation.sql` adds a `TEXT NOT NULL DEFAULT '{}'` column to `collections` and `lookbook_items`. The same migration is embedded in the existing migration registry for production packaging. Existing records and IDs are preserved; migration runs through the existing transactional boot mechanism.

Homepage layout, mobile artwork and framing live in existing section JSON. Zod validation supplies defaults and bounds coordinates. Mobile-only image references are included in media deletion protection. No original image is rewritten by framing controls.

There are no new environment variables, services, native packages, Railway settings, authentication changes, order API changes or infrastructure changes. Use the existing deployment workflow. Keep the normal database/volume backup before deployment; rolling application code back leaves the harmless additive columns present.

## Verification performed locally

All data used for these checks was generated in a separate local review directory. Production data and the public Railway deployment were not modified. Diagnostic images were deliberately generated in landscape/portrait formats; they are not shipped as brand content.

| Check | Evidence / result |
| --- | --- |
| TypeScript | `npm run typecheck` passed after implementation and formatting |
| Automated contracts | `npm test`: 8 passing tests, using Node's runner and the existing TypeScript dependency |
| Migration | Applies to an existing schema without losing records; collection/lookbook presentation persists independently |
| Media integrity | Valid image processing/deduplication, invalid image rejection, and protection of an asset referenced only as mobile artwork verified |
| Responsive homepage | Chromium: English and Arabic at 320, 390, 768, 1024 and 1440 px; no horizontal overflow, broken loaded images or header/wordmark collision in the fixture pages |
| Mobile art direction | Actual image source changes below 768 px; saved mobile focal position rendered as `80% 50%` after save/reload |
| Editor persistence | Authenticated UI changes saved with HTTP 200, reopened, and matched storefront rendering |
| Upload resilience | Real invalid-image plus valid-image batch: invalid file displayed its error, valid file remained selected; library loaded existing media |
| Product/gallery | Variant selection, gallery detail dialog/Escape, add-to-cart, and wishlist action exercised |
| Cart and checkout | Selected Large variant and price retained; Arabic checkout fields/summary displayed; local order 10001 persisted with HTTP 201 |
| Order confirmation | Returned to `/ar/order/10001`; correctly reported saved order plus Telegram delivery failure because local Telegram is unconfigured |
| Navigation/search | Mobile menu and search open/Escape, populated search result and clearing an obsolete result verified; lookbook, collections, product and new-arrivals routes checked for mobile overflow |
| Browser runtime | No page exceptions in the focused upload/editor/product flow |
| Formatting | Prettier 3.9.9 applied to changed TS/TSX/CSS/JSON/test files; `git diff --check` passed |
| Production build | Retried; failed inside the unchanged `next/font` Google loader after a TLS disconnect, then an extension-parsing TypeError for Jost (`loader.js:122`). This dependency/external-font failure remains unresolved; no successful production build is claimed. Fonts and deployment configuration were not replaced as a workaround |
| Docker/Railway runtime | Docker is unavailable on this machine; deployment configuration was preserved and not remotely deployed |

These are browser viewport checks, not claims of physical iPhone/Android testing. Production Core Web Vitals and Telegram delivery require the deployed environment; no field-performance improvement or production delivery success is claimed. No standalone lint configuration existed in the repository.

## Review and rollout checks

1. Review an existing store with old hero/collection/lookbook records before resaving. Confirm image positions and content remain appropriate to its actual photography.
2. Use dashboard previews to inspect long Arabic and English copy in both hero layouts. Choose mobile artwork when one composition cannot accommodate both frames.
3. Exercise upload retry after a transient connection failure, cover ordering, replacement and removal on the target device/gallery.
4. Run the regular production build where Google Fonts can be fetched, then deploy with the existing Railway configuration. Verify health, authenticated dashboard, media, variants, search, cart and a controlled Telegram order.

The work deliberately does not add a generic drag-and-drop page builder, AI content generation, destructive image editing, new payment systems, multitenancy or additional marketing claims.
