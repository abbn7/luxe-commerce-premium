# LUXE: architecture, frontend and market audit

Date: 23 September 2026  
Repository baseline: `e0e68a5` on `main`  
Live reference: https://luxe-commerce-production-5e4f.up.railway.app/en  
Status: historical baseline audit, recorded before implementation. See [implementation and verification](premium-frontend-upgrade.md) for the delivered changes.

## 1. Scope and evidence

This audit traces the central storefront, dashboard, media, persistence, ordering, localization and deployment paths. It combines source inspection, a dependency installation, a TypeScript check, an attempted production build, public browser observations and primary-source market research. It is not a claim that every production workflow has been exercised.

The public English homepage rendered the MAISON header and footer without homepage sections. The public collections page showed “No collections yet.” Arabic collections loaded with `dir="rtl"`. Browser inspection included a 390 × 844 mobile viewport and a 1440 × 900 desktop viewport; the latter reported document width 1430 against viewport width 1440. These observations do not establish the contents of the private production database or the status of draft content.

The production dashboard was not accessed. No live records, media, settings, orders, credentials or Railway configuration were modified. Populated product and editor flows still need local fixture-based browser verification.

## 2. What the product is

LUXE is a deployable, single-store white-label commerce application. An owner builds and rebrands that deployment through its dashboard. It is not currently a multi-tenant platform that provisions independent stores, accounts or deployments from one control panel. Preserving that distinction prevents an inappropriate SaaS rebuild.

The customer-facing purpose is bilingual catalog browsing and cash-on-delivery ordering, with order delivery to the merchant through Telegram. There is no online payment gateway. The dashboard owns products, collections, homepage sections, editorial content, brand settings, shipping settings and Telegram setup.

### Runtime and file map

| Layer | Implementation | Main responsibility |
| --- | --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript | One server for storefront, admin and API |
| Storefront routes | `src/app/[locale]/(storefront)` | Home, collections, products, new arrivals, search, lookbook, about, policies, wishlist, cart, checkout, confirmation |
| Dashboard routes | `src/app/[locale]/(admin)/admin` | Login and authenticated editing/operations |
| Storefront UI | `src/components/storefront` | Navigation, product cards, gallery, sections, purchase controls |
| Dashboard UI | `src/components/admin` | Entity forms, uploads, section configuration, orders |
| Shared UI | `src/components/ui` | SmartImage, Reveal, icons |
| Validation | `src/lib/validation/schemas.ts` | Zod input contracts, including each homepage section type |
| Persistence | `src/lib/db/client.ts`, `repos/*` | Embedded SQLite with WAL, repositories and migrations |
| Media | `src/lib/server/media.ts`, `/api/admin/media`, `/api/media/[id]` | Validation, optimized files, metadata, listing and serving |
| Cart and wishlist | `src/lib/store/*` | Zustand browser persistence |
| Localization | `src/i18n`, `messages/en.json`, `messages/ar.json` | Locale routing, copy, EN/AR entity fields |
| Deployment | `Dockerfile`, `railway.json`, instrumentation | One container, persistent volume, boot initialization and retries |

`package-lock.json` is the installation authority; `npm ci` installed Next.js 15.5.24. The package declaration permits Next.js 15 updates. The repository has `dev`, `build`, `start` and `typecheck` scripts. It has no configured standalone lint, formatting or test script.

### Dashboard → storefront data flow

1. An editor loads a server-rendered dashboard page populated from a repository.
2. A client form submits through `admin-client.ts` to an authenticated API route.
3. The route checks the session/origin and validates input with Zod.
4. A repository persists the data. Homepage section configuration is validated again and stored as JSON.
5. Storefront paths are revalidated; the dashboard refreshes its route.
6. Storefront server components read the same repositories and render localized data.

Homepage sections are controlled blocks: hero, featured products, collection highlight, new arrivals, lookbook preview, brand story and promo banner. Visibility and numeric ordering are already supported. The renderer resolves product and collection references on the server. New controls must survive both route validation and repository parsing; adding only a form input would silently lose unsupported configuration.

### Media data flow

1. The browser sends multipart data to the guarded media API.
2. The server checks the 8 MB limit and decodes the actual image through Sharp.
3. JPEG, PNG, WebP and AVIF are accepted; orientation is normalized.
4. Images are resized inside a 2000 × 2000 bound without enlargement, converted to WebP at quality 82 and deduplicated by content hash.
5. Files live under the persistent upload directory; SQLite stores ID, filename, type, dimensions and byte size.
6. Entity forms save media IDs. The public media route serves immutable cached content, and Next Image supplies responsive optimization to storefront consumers.

The underlying pipeline is useful and should remain. The main missing contract is the relationship between each image placement, the editor's preview and the storefront's responsive frame.

### Commerce workflow to preserve

Product variants and stock are presented on the product page. Cart keys distinguish variant selections. Checkout sends product IDs, quantities and selections; the server rebuilds prices and variant labels from stored products, calculates shipping, persists the order, adjusts stock and attempts Telegram delivery. Failed delivery is recorded and retried by a scheduled process; the dashboard exposes retry status and manual resend.

The frontend upgrade should preserve this payload, money in integer minor units, cart persistence keys, validation, order status semantics and Telegram retry behavior. No live order should be submitted for visual verification.

### Deployment contract

The Dockerfile uses Node 20, keeps native dependencies available, builds Next and runs as a non-root user. Railway uses `/api/health` and one persistent `/data` volume. SQLite, uploads and encryption material share that persistent directory. Boot instrumentation applies embedded migrations, ensures the admin account and policies, and starts the Telegram retry scheduler. The Edge middleware excludes Node initialization and delegates locale routing; the bare root uses the configured default locale.

No infrastructure change is needed for the proposed presentation work. Local Node is v24.14.1, so a passing local build alone will not prove the Node 20 container has been exercised.

## 3. Existing strengths

- A coherent original visual vocabulary already exists: warm porcelain/ivory, ink/night, restrained gold, thin rules and modest corner treatment.
- English uses Cormorant Garamond/Jost; Arabic has Amiri/IBM Plex Sans Arabic available. Both directions are integrated at the layout level.
- Shared product cards and image rendering create leverage for consistent improvements across home, collections, search and related products.
- Server-rendered content, a small dependency set and existing Next Image support avoid the need for a new rendering framework or image service.
- The section model is understandable and bounded. Owners can compose pages without arbitrary markup.
- Stock, variants, wishlist, search, sort, policies, shipping and order delivery already form a connected product.
- Admin routes and media uploads have authentication and validation foundations. Media deduplication and reference-aware deletion already exist.
- Reduced-motion CSS and keyboard focus styling provide a useful accessibility starting point.

## 4. Findings and priorities

“Source” means verified in the checked-out code, not reproduced against populated production content. “Live” means observed in the public browser.

| Priority | Finding / evidence | User impact | Proposed response |
| --- | --- | --- | --- |
| P0 visual | `SmartImage.tsx` has no default `object-fit`; many fill consumers pass no image class. Source. | Different source ratios can stretch into fixed frames. | Explicit fit and positioning contract, audited at every call site. |
| P0 visual | Dashboard square/small previews differ from 3:4 product, 4:5 editorial and wide hero frames. Source. | Editor cannot predict the published crop. | Placement presets and matching responsive previews. |
| P0 visual | Lookbook page uses fill images in containers without reserved image height. Source. | Images can collapse or overlap rather than form the intended masonry. | Explicit aspect ratio or intrinsic dimensions, then populated browser verification. |
| P1 | Hero uses `85vh`, minimum 540 px, centered copy and a fixed cover crop. Source. | Tall mobile composition, subject cropping and long-copy crowding are likely. | Content-safe heights, layout choice, placement positioning and mobile preview. |
| P1 | Homepage has no empty-section fallback. Source; live page had no homepage content. | A newly configured store looks unfinished. | Honest branded empty state and actionable owner setup guidance, without inventing catalog content. |
| P1 | Upload flows are duplicated across single, multiple, collection and lookbook inputs. Source. | Inconsistent states, validation and replacement experience. | Shared upload surface used by all forms. |
| P1 | Multi-upload calls `onChange` only after all uploads finish. Source. | A later failure leaves earlier successful uploads unselected in the form. | Incremental successful results and per-file failure/retry feedback. |
| P1 | Single upload selection is not consistently locked while busy; form save is separate from upload state. Source. | Concurrent operations can produce unexpected selections or premature saves. | Operation state, disabled conflicts and visible save readiness. |
| P1 | Media listing API exists, but forms only upload new files. Source. | Reusing a campaign image requires uploading again despite existing assets. | Authenticated gallery picker, dimensions, selected state and reuse. |
| P1 | Header ignores configured logo and absolutely centers a nowrap wordmark. Source. | Branding control has incomplete effect; long names/navigation may collide. | Responsive header geometry with real logo integration and long-name checks. |
| P1 | Product wishlist, media cover/remove actions and lookbook captions depend on hover. Source. | Touch users may miss controls or content. | Visible touch controls and equivalent keyboard focus behavior. |
| P1 | Gallery thumbnail buttons have no names and incomplete tab semantics. Source. | Screen-reader navigation is unclear. | Named buttons, active state, image count and accessible gallery controls. |
| P1 | `Field.tsx` labels are siblings without `htmlFor` association. Source. | Many dashboard inputs lack a programmatic label. | Shared accessible field IDs and hint/error linkage. |
| P1 | Mobile drawer lacks a focus trap and Escape handling; search lacks complete focus containment/return. Source. | Keyboard focus can escape modal navigation. | A shared light dialog/focus pattern without a heavy UI library. |
| P2 | Setup checklist hardcodes branding completion to false and omits homepage readiness. Source. | Progress remains incomplete and misses the cause of a blank homepage. | Derive readiness honestly from current data; link to relevant editor. |
| P2 | `SmartImage` failure state persists after the media ID changes. Source. | Replacing a failed asset may not recover the image in the same component. | Reset/rekey failure handling per source. |
| P2 | Product gallery renders all full-size images in stacked layers. Source. | Images close to the viewport can consume bandwidth before use. | First image priority, deliberate subsequent loading and small thumbnails. |
| P2 | `Reveal` starts content invisible before its observer runs. Source. | Delayed or failed hydration can obscure important content, including product imagery. | Progressive enhancement and visible critical content. |
| P2 | Search overlay hardcodes EGP currency while other views receive settings. Source. | White-label currency can disagree across surfaces. | Pass existing currency settings through the frontend. |
| P2 | Several Arabic utilities still apply letter spacing; decorative text contrast varies. Source. | Inconsistent Arabic type treatment and readability. | Explicit Arabic rules and contrast checks using actual brand colors. |
| P2 | Collections/search return at most 48 products without a paging UI. Source. | Larger catalogs may have inaccessible remaining results. | Assess a small pagination follow-up using existing query offsets; do not silently expand this visual pass into search infrastructure. |

The stock validation/decrement sequence and other backend concerns deserve their own review if requested. This document does not certify backend correctness or propose unrelated backend refactoring as part of the visual upgrade.

## 5. Market comparison and decisions

Research uses public product documentation, theme listings and published UX research. Competitor authenticated dashboards were not tested firsthand. Vendor performance claims were not independently benchmarked.

| Reference | Documented pattern | Useful adaptation for LUXE | Avoid importing |
| --- | --- | --- | --- |
| [Shopify image tools](https://help.shopify.com/en/manual/online-store/images/theme-images) | Ratio guidance, image editing and focal points; wide/tall images crop differently by viewport. | Placement guidance, focal positioning, explicit save and image preview. | Assuming a single global image focal point works for every placement. |
| [Shopify theme architecture](https://shopify.dev/docs/storefronts/themes/architecture) | Global settings, modular sections and reusable rendering pieces. | Strengthen LUXE's existing section/configuration model and distinguish global from per-section options. | Recreating Shopify's entire theme engine or app ecosystem. |
| [Wix Studio images](https://support.wix.com/en/article/studio-editor-editing-and-customizing-images) | Fit modes, crop reset and breakpoint-specific focal points. | Desktop/mobile positioning with reset and visual feedback. | Freeform canvas editing, shape masks and watermark tools without a product need. |
| [Squarespace focal points](https://support.squarespace.com/hc/en-us/articles/205826028-Using-focal-points-to-center-images) | Visual focal positioning; behavior depends on image and container proportions. | Explain when positioning has no effect and show the actual destination frame. | Promising that one uploaded ratio can fill every frame without cropping. |
| [Webflow responsive images](https://help.webflow.com/hc/en-us/articles/33961378697107-Responsive-images) | Browser-selected variants through `srcset` and `sizes`. | Verify sizes against real layout widths and preserve Next Image delivery. | Adding a second image optimizer or external asset platform. |
| [Prestige premium theme](https://themes.shopify.com/themes/prestige/presets/prestige) | Configurable editorial sections, lookbooks, galleries, rollover, zoom and navigation features. | Clear editorial/product rhythm, inspectable product photography and restrained composition. | Copying its appearance or adding every listed conversion feature. |
| [Medusa starter](https://docs.medusajs.com/resources/nextjs-starter) | Customizable Next.js commerce storefront with a separately hosted commerce application. | Treat merchandising components and commerce contracts as distinct concerns. | Replatforming to Medusa/Postgres, new payment systems or extra services. |
| [Baymard mobile navigation](https://baymard.com/research-articles/main-navigation-product-categories) | Product categories should be easy to reach in the first navigation level. | Preserve visible collection paths and improve drawer usability. | A mega-menu whose complexity exceeds the current catalog. |
| [Baymard gallery visibility](https://baymard.com/research-articles/truncating-product-gallery-thumbnails) | Hidden thumbnails need clear signposting. | Image counts and discoverable gallery navigation on mobile. | Hidden swipe-only interactions. |

### What can make LUXE distinctive

The strongest opportunity is a focused bilingual luxury editor that produces predictable results: the owner uploads once, understands the intended frame, adjusts the subject position, checks Arabic/English and mobile/desktop, and saves with confidence. This is a product hypothesis, not evidence that LUXE currently outperforms these platforms. Its success can be evaluated through image-composition accuracy, editing task completion, mobile usability and performance.

### Prioritize now

Shared image contracts; reliable upload and asset reuse; section previews; refined hero layouts; consistent section spacing and heading hierarchy; product inspection; navigation accessibility; honest empty states; bilingual typography and touch usability.

### Defer unless a concrete need emerges

Arbitrary page building; theme marketplace; AI generation; autoplay video; 3D products; parallax; sliders in every section; marketing popups; countdowns; invented reviews; loyalty/accounts; new checkout/payment methods; multi-tenant provisioning; external media services. These are not prerequisites for a premium storefront and add operational or editorial complexity.

## 6. Image contract proposal

Recommended dimensions are preparation guidance, not mandatory upload rejection thresholds. Preserve valid images and explain the trade-off. Existing storage caps the longest edge at 2000 px, so recommendations must not promise 4K retention.

| Placement | Preparation guide | Rendering policy | Editor support |
| --- | --- | --- | --- |
| Product grid/gallery | 3:4, e.g. 1500 × 2000 | Contain for full product visibility; consistent frame | Matching preview, cover selection, ordering, replace/remove |
| Wide hero | 16:9, e.g. 1920 × 1080 | Cover with explicit positioning; content-safe height | Desktop/mobile preview and focal controls |
| Mobile hero alternate | 4:5, e.g. 1200 × 1500 | Optional art direction when one composition cannot work | Clear fallback to primary image; separate positioning |
| Collection/editorial | 4:5, e.g. 1600 × 2000 | Cover only where the crop is deliberate | Preview every use, especially portrait card versus wide banner |
| Brand story | 4:5, e.g. 1600 × 2000 | Stable editorial frame | Fit and focal positioning |
| Promo banner | Wide composition, e.g. 1920 × 800 | Cover; do not embed essential text in image | Copy overlay and narrow-screen preview |
| Lookbook | Portrait guidance; retain natural ratio for full editorial images where appropriate | Reserve dimensions; preserve subject | Thumbnail/full-view distinction and captions on touch |
| Logo | Transparent PNG/WebP with tight bounds | Contain; never crop or distort | Light/dark surface preview |
| Favicon | 1:1, e.g. 512 × 512 | Square bounds | Square preview and format explanation |

Separate the asset from its presentation. The same media ID may be reused in a hero and a collection; changing the hero crop must not alter the collection. Store presentation per placement where the existing data model permits it. Add optional fields with safe defaults to section JSON and its Zod schemas. If a placement requires persistent settings outside existing JSON, explicitly justify the smallest compatible extension before implementing it.

Cropping should initially be non-destructive framing: `contain`/`cover` and bounded image positioning, with reset. It must not overwrite the shared original. A separately uploaded mobile source is optional art direction, not a second required upload. Any new media reference must be included in reference-count/deletion checks.

## 7. Visual direction

Preserve the current warm luxury identity and bilingual font families. Improve hierarchy and composition, not the brand's palette. Primary surfaces remain porcelain `#FBF9F6`, ivory `#F6F3EE`, ink `#161513`, night `#121110`, line `#E4DFD7` and the editable accent (default `#A98A5B`). Contrast must be checked rather than assuming every configured accent supports white text.

The signature should be composed editorial photography with measured copy and generous but purposeful space. Offer two bounded hero layouts: refined image-led overlay and editorial split. Existing hero records retain a compatible default. On mobile, the split stacks intentionally; overlay copy must not be clipped by a rigid viewport height. Long Arabic and English copy are first-class test cases.

Use a common container/gutter scale and section rhythm. Product sections should be compact enough to browse, while collection and story sections can carry larger editorial images. Do not add ornamental numbering or trust claims unsupported by content. Cards should prioritize product silhouette, name and price; badges and wishlist controls should remain legible without visual noise.

Dashboard refinement should improve task clarity: identifiable section cards, grouped settings, larger previews, consistent save feedback, asset selection and responsive controls. Avoid replacing familiar forms with a new page-builder paradigm.

## 8. Implementation and acceptance sequence

1. Establish an isolated populated local fixture set and capture before images. Keep all data out of commits and production.
2. Implement the shared image behavior and placement presets. Verify old records and every image consumer.
3. Consolidate upload UI and add asset reuse, validation, incremental outcomes, retry, replacement and ordering.
4. Add backward-compatible section presentation controls and previews using shared rendering logic. Verify save/reload/storefront agreement.
5. Refine hero, section composition, product cards/gallery, header/footer, navigation, empty/loading states and dashboard layout in the existing design language.
6. Run focused automated and browser checks; compare the same fixture content before/after. Create the implementation PR with evidence and any configuration notes.

Acceptance requires both visible improvement and working behavior:

- Old sections and media IDs continue to render without resaving; existing content/order/visibility is preserved.
- Portrait, square, landscape, transparent, missing and very small images never stretch.
- Upload failure after one success preserves that success; duplicate selection, limits, retry and saving during uploads have defined behavior.
- Desktop/mobile preview matches the corresponding storefront frame and persisted controls.
- All seven section types remain available. Product, collection, lookbook, about and branding forms retain their fields and behavior.
- Cart/variant/wishlist/search/sort/checkout and order failure status are checked with local data. Telegram delivery is only claimed when actually tested in an authorized environment.
- EN and AR checks at 320, 390, 430, 768, 1024 and 1440 px, plus landscape; long text, 200% zoom, keyboard, touch and reduced motion.
- No horizontal overflow; visible focus, usable target sizes, modal focus return and meaningful image/control labels.
- Correct `sizes`, reserved image geometry and above-the-fold image priority. [Next.js 15 Image](https://nextjs.org/docs/15/app/api-reference/components/image) and [web.dev image loading](https://web.dev/articles/optimize-css-background-images-with-media-queries) support keeping discoverable responsive image elements.
- Apply informative/decorative/functional alternatives according to the [W3C image tutorial](https://www.w3.org/WAI/tutorials/images/).
- Production build and type check pass; run container validation where available. Document absent tooling and any checks blocked by environment.

## 9. Baseline validation and delivery status

| Check | Result |
| --- | --- |
| Public repository download | Cloned successfully into `C:\Users\abdor\store\luxe-commerce` |
| Baseline source changes | None |
| Dependency installation | `npm ci --no-audit --no-fund` passed |
| TypeScript | `npm run typecheck` passed |
| Production build | Failed fetching Cormorant Garamond via `next/font`; DNS/TLS failures included `ENOTFOUND fonts.gstatic.com`. No application compile success is claimed. |
| Live public inspection | Homepage, empty collections and Arabic routing observed; responsive checks limited to those public states |
| Authenticated dashboard | Source reviewed; browser workflows pending local setup |
| Populated storefront | Pending local fixtures; public collection page had no visible collections |
| Lint/formatter/tests | No standalone scripts/configuration identified in this repository |
| Railway container/Telegram | Not exercised locally in this phase; production was not changed |
| GitHub PR route | Signed-in account can read but cannot push to upstream; a fork-based PR is required unless access changes |

This phase provides the basis for a major frontend upgrade. It does not claim implementation, regression verification, performance gains or a completed pull request.
