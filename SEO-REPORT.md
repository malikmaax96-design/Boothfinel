# Boothdrop Entertainment — SEO build report

Generated 2026-10-06 on branch `claude/affectionate-wozniak-2c1p1k`. Nothing has been pushed.

## Summary

| Item | Result |
|---|---|
| Pages before | 8 (home + 7 booth pages, no robots/sitemap/htaccess/schema/canonicals) |
| Pages after | 56 indexable pages + a `noindex` 404 page |
| Generator | `scripts/build-pages.js` (plain Node, no dependencies) builds every page, `sitemap.xml` and `.htaccess` from `data/` + `templates/` |
| Validation | HTML validated with html-validate (0 errors other than a stylistic phone-spacing rule, which the build now satisfies with non-breaking spaces); 0 broken internal links across 93 unique URLs; every page has exactly one `<h1>`, a canonical, OG/Twitter tags and JSON-LD |
| Lighthouse (mobile, simulated throttling, local server) | Home 96 / 100 / 96 / 100 · Magic Mirror page 100 / 100 / 100 / 100 · Reading area page 100 / 100 / 100 / 100 (Performance / Accessibility / Best practices / SEO) |

### How to edit the site from now on

1. Edit copy in `data/content/<type>/<slug>.json` (booths, events, areas, pages, blog). Structural data lives in `data/site.json`, `data/booths.json`, `data/areas.json`, `data/redirects.json`.
2. Run `node scripts/build-pages.js`. The build refuses to write if a title is over 60 characters, a description is outside 140–155, a page is under 500 words, FAQs are missing, a paragraph is duplicated across pages, an image lacks `alt`/`width`, or copy uses first-person singular. Use `--check` to validate without writing.
3. Commit the regenerated HTML together with the data change (Hostinger serves the repo as-is).
4. New images: drop the source JPG/PNG in `images/`, regenerate the WebP/resized variants (the Pillow script used is described below) and add the dimensions to `data/images.json`.

## Phase 0 findings (discovery)

- **Git history**: 18 commits, all by the repo owner between 30 Mar and 18 Apr 2026. This is a from-scratch rebuild ("New premium BoothDrop website"), not the agency build. There was no `robots.txt`, `.htaccess`, `sitemap.xml`, canonical tag, structured data, analytics, Search Console or ads verification tag anywhere in the history, so nothing of that kind could be preserved or was at risk. The only integrations were FormSubmit.co (AJAX email to `info.boothdrop@boothdrop.co.uk`), a WhatsApp hand-off to `wa.me/447368631516`, the BoothBook booking iframe/widget and Google Fonts. All four are preserved.
- **Googlebot blocking**: none (no robots.txt, no `noindex`, no `X-Robots-Tag`).
- **Live site not reachable from the build environment**: `www.boothdrop.co.uk` is blocked by the sandbox's egress policy, so the legacy agency URLs quoted in the brief (`/photobooth-for-hire-in-london`, `/photobooth-for-hire-in-essex`) could not be checked. They do not exist in this repository. To protect any rankings they still hold, every one of the 30 area pages has a 301 from the `/photobooth-for-hire-in-{slug}` pattern to its new URL (see redirect map). If Search Console shows other legacy URLs, add them to `data/redirects.json` and rebuild.
- **Brand name**: the contact section and footer use "Boothdrop Entertainment"; the only other variants ("BoothDrop") were in CSS/JS comments and commit messages, not visible copy. All pages now use "Boothdrop Entertainment" (and plain "Boothdrop" only in "the Boothdrop blog").
- **Hosting note**: the repo contains a `CNAME` file (`boothdrop.co.uk`), which is a GitHub Pages artefact. `.htaccess` only takes effect on Apache (Hostinger). If the live site is in fact served by GitHub Pages, the clean-URL rewrites, 301s and headers will not run; the generated HTML still works there, but legacy URLs would 404. `CNAME` was left untouched.
- **Branch**: the brief says deployment is from `main`; the repository's default branch is `master`. Work is on the designated branch `claude/affectionate-wozniak-2c1p1k`; the Hostinger Git deploy branch should be checked before merging.
- **Shared components**: header, footer, nav, CSS variables and the dark/gold design system were identified and moved into `templates/partials/`. The home page was converted to the same template so the nav/footer exist in one place.

## Phase 0 decision table — pre-existing pages (section 3a: preserved)

| Old URL | Decision | New URL | What changed |
|---|---|---|---|
| `/` (`index.html`) | KEEP in place, upgraded | `/` | Same sections and design. Added: keyword in `<h1>`, canonical, OG/Twitter, JSON-LD (LocalBusiness, WebSite, WebPage, FAQPage, Breadcrumb), ~600 words of new copy, FAQ block, links to all 8 booths, 5 event pages and 30 area pages, reusable quote form (no inline handlers), sticky mobile bar, WebP images with dimensions and lazy loading, deferred JS. Removed: inline `!important` CSS hacks and the duplicate CSS rule that made them necessary, dead modal code, dead `#` links (Facebook, Privacy, T&Cs). Stats bar now shows verifiable facts (8 booths, from £299, 5★ Trustpilot, free delivery) instead of "500+ events / 30+ areas" (unverified; see TODOs). Gallery captions no longer name invented events ("Surrey Wedding 2024" etc.); they show the booth name until real photos are supplied. The 10 testimonials were carried over verbatim (flagged TODO). Blog cards now link to real posts instead of `#contact`. |
| `/booths/lcd-slimpod.html` | MOVE (301) | `/booths/lcd-slimpod-hire` | Rebuilt from template with ≥500 words, specs, pricing, FAQ, schema |
| `/booths/magic-mirror.html` | MOVE (301) | `/booths/magic-mirror-hire` | as above |
| `/booths/selfie-mirror-pod.html` | MOVE (301) | `/booths/selfie-mirror-pod-hire` | as above |
| `/booths/retro-pod.html` | MOVE (301) | `/booths/retro-pod-hire` | as above |
| `/booths/party-booth.html` | MOVE (301) | `/booths/party-booth-hire` | as above |
| `/booths/inflatable-booth.html` | MOVE (301) | `/booths/inflatable-photo-booth-hire` | as above |
| `/booths/gif-booth.html` | MOVE (301) | `/booths/gif-booth-hire` | as above |

The booth pages were 10 days old, had no inbound links in the repo other than the home page, and the brief names `/booths/inflatable-booth.html` as a non-ranking example, so moving them to keyword URLs with 301s was judged safe. Both the `.html` and extension-less forms of each old URL redirect.

## Phase 1 — technical foundations

- `robots.txt`: allows all crawlers, disallows the `scripts/`, `templates/`, `data/` source folders and the 404 page, references the sitemap.
- `.htaccess` (generated): single-hop 301 to `https://www.`, 301 from `/x.html` → `/x` and `/dir/index.html` → `/dir/`, trailing-slash normalisation, clean-URL rewrite to the `.html` file, 42 legacy redirects, `ErrorDocument 404`, long-lived immutable caching for assets, 1-hour HTML cache, gzip, security headers (HSTS, nosniff, referrer policy), and source folders/`.json`/`.md` blocked from being served. The host condition only triggers on `boothdrop.co.uk` so staging/preview hosts are unaffected.
- Every page: `lang="en-GB"`, viewport, canonical (clean `www` URL), OG + Twitter cards (`og:image` 1200×630 default or the page's booth photo), theme-colour, favicons.
- `sitemap.xml`: 56 URLs with `lastmod` taken from the git date of each page's content file.
- Performance: all raster images converted to WebP with JPEG fallbacks via `<picture>`, two sizes with `srcset`/`sizes`, intrinsic `width`/`height` on every `<img>`, `loading="lazy"` on everything below the fold, `fetchpriority="high"` + `<link rel="preload">` on the hero image, Google Fonts loaded non-render-blocking (preconnect + preload + media swap with `<noscript>` fallback), one CSS file (`booth-detail.css` merged in), one deferred JS file, BoothBook iframe lazy-loaded and its script deferred. First-load transfer per page (gzipped on Apache) is roughly 100 KB excluding lazy images; Lighthouse's uncompressed local measure was 252–394 KiB including images.
- Accessibility: skip link, visible focus states, `aria-current` on nav, `aria-expanded` on the menu button, labelled landmarks, one `<h1>`, logical heading order (h1 → h2 → h3), alt text on every image, FAQ uses native `<details>`, 24px+ tap targets, `prefers-reduced-motion` respected by the reveal animation, contrast unchanged from the existing palette (gold on near-black passes AA for body sizes).

## Phase 2 — URL structure

Implemented exactly as specified: `/booths/` (+8), `/events/` (+5), `/areas/` (+30), `/reviews`, `/faq`, `/contact`, `/blog/` (+4 posts), `/privacy-policy`, `/404`. Town pages link up to their county/area and counties link down to their towns; every area page links to its 3 nearest areas, all 8 booths and all 5 event pages; every booth page links to all event pages and the areas overview; the home page links to every booth, event and area page.

## Phase 3 — content rules

Enforced by the build's quality gate on every page: unique title ≤60 chars ending "| Boothdrop Entertainment", unique 140–155-char description with a CTA, one `<h1>` with the keyword, ≥500 words (actual range 400 for the blog index, which is a listing page, to 2,285; every landing page is 650+), 4–6 FAQs (FAQ page 18), quote CTA + `tel:` link above the fold and at the end, reviews block, breadcrumbs, no first-person singular, no paragraph shared between any two pages (checked on every build). Area copy was written per area from a fact sheet of real districts, roads and venue types; no venue names, reviews, statistics or awards were invented.

## Phase 4 — structured data

Every page carries one JSON-LD `@graph`: `LocalBusiness`+`Organization` (name, URL, phone, email, logo, `priceRange "££"`, `areaServed` for all 30 areas, `openingHoursSpecification` placeholder, `sameAs`, `makesOffer` for the 8 booths), `WebSite`, `WebPage`/`CollectionPage`/`ContactPage`, `BreadcrumbList`, `FAQPage` where a FAQ block exists, `Service` with `offers` (price 299 GBP) on booth, event and area pages, `ItemList` on the booths and areas overviews, `BlogPosting` on posts. No `AggregateRating`/`Review` is emitted because no verified review data was supplied. All JSON-LD is produced by `JSON.stringify` and parses.

## Phase 5 — conversion elements

Sticky mobile call/quote bar on every page; one reusable quote form partial (name, phone, email, event date, event type, postcode, booth of interest, notes) that posts to the existing FormSubmit AJAX endpoint with a native-POST fallback and honeypot, pre-selects the booth/event on booth and event pages, and offers the WhatsApp hand-off after sending (previously it auto-opened a popup); reviews page with a Trustpilot placeholder; pricing/package section on every booth page; BoothBook widget on the home and contact pages.

## 1. Page inventory

| URL | Title | Meta description | Words | Primary keyword |
|---|---|---|---:|---|
| / | Photo Booth Hire UK \| Boothdrop Entertainment | Photo booth hire across London, the Home Counties, South East, East of England and the Midlands from £299 with an attendant and prints. Get a free quote. | 2285 | photo booth hire |
| /areas/ | Photo Booth Hire Near Me \| Boothdrop Entertainment | Photo booth hire near you across London, the Home Counties, the South East, East of England and the Midlands. Find your area and get a free quote today. | 1315 | photo booth hire near me |
| /blog/ | Photo Booth Blog & Event Tips \| Boothdrop Entertainment | Planning advice, photo booth trends and event tips from the Boothdrop Entertainment team. Read our latest guides, then get a free quote for your event. | 400 | photo booth blog |
| /booths/ | Photo Booth Hire: Our Booths \| Boothdrop Entertainment | Compare our 8 photo booths for hire: Magic Mirror, 360 Booth, LCD SlimPod, Retro Pod, Party Booth and more, from £299 with an attendant. Get a free quote. | 1595 | photo booth hire |
| /contact | Get a Photo Booth Hire Quote \| Boothdrop Entertainment | Contact Boothdrop Entertainment for a photo booth hire quote. Call or WhatsApp 07368 631 516, email us or book online. We reply within 24 hours. | 1189 | contact Boothdrop Entertainment |
| /events/ | Photo Booth Hire for Events \| Boothdrop Entertainment | Photo booth hire for weddings, Asian weddings, corporate events, proms and birthday parties, with an attendant and prints from £299. Get a free quote. | 1393 | photo booth hire for events |
| /faq | Photo Booth Hire FAQs \| Boothdrop Entertainment | Photo booth hire FAQs: prices from £299, the £80 deposit, space, power, props, prints, outdoor use and data. Still unsure? Call 07368 631 516 for a quote. | 2172 | photo booth hire FAQ |
| /privacy-policy | Privacy Policy \| Boothdrop Entertainment | How Boothdrop Entertainment collects, uses and protects the details you share when you enquire or book a photo booth. Questions? Call 07368 631 516. | 655 | privacy policy |
| /reviews | Customer Reviews \| Boothdrop Entertainment | Boothdrop Entertainment is rated 5 stars on Trustpilot. See what customers mention most about our photo booths and how to leave a review. Get a free quote. | 1425 | Boothdrop Entertainment reviews |
| /booths/360-photo-booth-hire | 360 Photo Booth Hire \| Boothdrop Entertainment | 360 photo booth hire with slow-motion video, music, overlays and instant sharing. Attendant included, from £299. Get a free quote or call 07368 631 516. | 1565 | 360 photo booth hire |
| /booths/gif-booth-hire | GIF Booth Hire \| Boothdrop Entertainment | GIF booth hire for brand activations and social events. GIFs, boomerangs and stills sent to phones with a custom overlay. From £299. Get a free quote. | 1636 | GIF booth hire |
| /booths/inflatable-photo-booth-hire | Inflatable Photo Booth Hire \| Boothdrop Entertainment | Inflatable photo booth hire for big groups. LED-lit cube for up to 10 people, glow colour matched to your theme, prints for all. From £299. Get a quote. | 1601 | inflatable photo booth hire |
| /booths/lcd-slimpod-hire | LCD SlimPod Hire \| Boothdrop Entertainment | Hire the LCD SlimPod, our most popular open-air photo booth. Touchscreen, 2 prints per session, no green screen needed. From £299. Get a free quote. | 1886 | LCD SlimPod hire |
| /booths/magic-mirror-hire | Magic Mirror Hire UK \| Boothdrop Entertainment | Magic Mirror hire for weddings, parties and corporate events. Interactive mirror, prints for every guest, attendant included. From £299. Get a free quote. | 1615 | Magic Mirror hire |
| /booths/party-booth-hire | Party Booth Hire \| Boothdrop Entertainment | Party Booth hire: an enclosed photo booth with a curtain, room for 8 guests, 2 prints per session and a guest book. Packages from £299. Call 07368 631 516. | 1644 | Party Booth hire |
| /booths/retro-pod-hire | Retro Pod Hire \| Boothdrop Entertainment | Retro Pod hire with an inbuilt printer, DSLR camera and classic photo-strip prints for every guest. Tidy 1.5m footprint. From £299. Get a free quote today. | 1744 | Retro Pod hire |
| /booths/selfie-mirror-pod-hire | Selfie Mirror Pod Hire \| Boothdrop Entertainment | Selfie Mirror Pod hire with a DSLR camera, up to 8 guests per shot and an instant print for everyone. Packages from £299 with attendant. Get a free quote. | 1808 | Selfie Mirror Pod hire |
| /events/asian-wedding-photo-booth-hire | Asian Wedding Photo Booth Hire \| Boothdrop Entertainment | Asian wedding photo booth hire for 300 to 800 guests, with enclosed booths, bilingual templates and cover from mehndi to walima. Call 07368 631 516 today. | 1784 | Asian wedding photo booth hire |
| /events/birthday-party-photo-booth-hire | Birthday Party Photo Booth Hire \| Boothdrop Entertainment | Birthday party photo booth hire for 18ths to 60ths, kids parties, marquees and village halls. Attendant, props and themed prints from £299. Get a quote. | 1692 | birthday party photo booth hire |
| /events/corporate-photo-booth-hire | Corporate Photo Booth Hire \| Boothdrop Entertainment | Corporate photo booth hire with your branding on every print and file, GDPR-aware data capture and insurance documents on request. From £299. Get a quote. | 1639 | corporate photo booth hire |
| /events/prom-photo-booth-hire | Prom Photo Booth Hire \| Boothdrop Entertainment | Prom photo booth hire for schools, sixth forms and PTAs: attendant always present, age-appropriate props, teacher-approved prints, from £299. Get a quote. | 1575 | prom photo booth hire |
| /events/wedding-photo-booth-hire | Wedding Photo Booth Hire \| Boothdrop Entertainment | Wedding photo booth hire with an attendant, props, guest book and prints matched to your stationery, from £299. Rated 5 stars on Trustpilot. Get a quote. | 1700 | wedding photo booth hire |
| /areas/photo-booth-hire-aylesbury | Photo Booth Hire Aylesbury \| Boothdrop Entertainment | Photo booth hire in Aylesbury, Wendover and the Vale for barn weddings, village hall parties, proms and corporate events. From £299. Get a free quote. | 1640 | photo booth hire Aylesbury |
| /areas/photo-booth-hire-bedfordshire | Photo Booth Hire Bedfordshire \| Boothdrop Entertainment | Photo booth hire in Bedfordshire for weddings, Asian weddings and corporate events in Bedford, Luton, Dunstable and beyond. From £299. Call 07368 631 516. | 1810 | photo booth hire Bedfordshire |
| /areas/photo-booth-hire-berkshire | Photo Booth Hire Berkshire \| Boothdrop Entertainment | Photo booth hire across Berkshire, from Reading and Slough to Windsor and Newbury. Packages from £299 with attendant and setup. Call 07368 631 516. | 1681 | photo booth hire Berkshire |
| /areas/photo-booth-hire-bromley | Photo Booth Hire Bromley \| Boothdrop Entertainment | Photo booth hire in Bromley, Beckenham, Orpington and Chislehurst for weddings, 40th and 50th birthdays and proms. From £299. Get a free quote. | 1764 | photo booth hire Bromley |
| /areas/photo-booth-hire-buckinghamshire | Photo Booth Hire Buckinghamshire \| Boothdrop Entertainment | Buckinghamshire photo booth hire for weddings, parties and corporate events in Aylesbury, High Wycombe and Milton Keynes. From £299. Get a free quote. | 1607 | photo booth hire Buckinghamshire |
| /areas/photo-booth-hire-cambridge | Photo Booth Hire Cambridge \| Boothdrop Entertainment | Photo booth hire in Cambridge for May Balls, college events, graduations and science park corporate events. Attendant and prints included. Get a quote. | 1650 | photo booth hire Cambridge |
| /areas/photo-booth-hire-cambridgeshire | Photo Booth Hire Cambridgeshire \| Boothdrop Entertainment | Photo booth hire across Cambridgeshire, from Cambridge and Ely to Peterborough. Attendant, setup and unlimited sessions from £299. Get a free quote today. | 1657 | photo booth hire Cambridgeshire |
| /areas/photo-booth-hire-central-london | Photo Booth Hire Central London \| Boothdrop Entertainment | Slim, tidy photo booths for central London hotels, livery halls, offices and bars. Attendant, props and prints included, from £299. Get a free quote today. | 1826 | photo booth hire Central London |
| /areas/photo-booth-hire-chelmsford | Photo Booth Hire Chelmsford \| Boothdrop Entertainment | Photo booth hire in Chelmsford for barn weddings, proms and Christmas parties across the Essex villages. Attendant and prints from £299. Get a quote. | 1637 | photo booth hire Chelmsford |
| /areas/photo-booth-hire-east-london | Photo Booth Hire East London \| Boothdrop Entertainment | 360 booths, Magic Mirrors and slim pods for East London weddings, warehouse parties and corporate events, Shoreditch to Romford. Get a free quote today. | 1780 | photo booth hire East London |
| /areas/photo-booth-hire-essex | Photo Booth Hire Essex \| Boothdrop Entertainment | Essex photo booth hire for weddings, birthdays and corporate parties from Chelmsford to Southend. Packages from £299 with attendant. Call 07368 631 516. | 1677 | photo booth hire Essex |
| /areas/photo-booth-hire-hampshire | Photo Booth Hire Hampshire \| Boothdrop Entertainment | Hampshire photo booth hire for weddings, proms and corporate events in Southampton, Winchester and Basingstoke. Packages from £299. Get a free quote. | 1653 | photo booth hire Hampshire |
| /areas/photo-booth-hire-hertfordshire | Photo Booth Hire Hertfordshire \| Boothdrop Entertainment | Hertfordshire photo booth hire for weddings, corporate events and parties in Watford, St Albans, Stevenage and beyond. From £299. Get a free quote today. | 1747 | photo booth hire Hertfordshire |
| /areas/photo-booth-hire-kent | Photo Booth Hire Kent \| Boothdrop Entertainment | Photo booth hire across Kent, from Maidstone and Canterbury to the coast. Eight booths, attendant and setup included, from £299. Get a free quote today. | 1691 | photo booth hire Kent |
| /areas/photo-booth-hire-london | Photo Booth Hire London \| Boothdrop Entertainment | Photo booth hire across all 32 London boroughs and the City. Magic Mirror, 360 and slim pods with attendant, props and prints included. Get a free quote. | 1952 | photo booth hire London |
| /areas/photo-booth-hire-luton | Photo Booth Hire Luton \| Boothdrop Entertainment | Photo booth hire in Luton and Dunstable for large Asian weddings, banqueting suites, airport hotel events and parties. Enclosed booths. Get a free quote. | 1635 | photo booth hire Luton |
| /areas/photo-booth-hire-north-london | Photo Booth Hire North London \| Boothdrop Entertainment | Photo booth hire for North London weddings, parties and corporate events, Barnet to Islington. Attendant, props and prints included. Call 07368 631 516. | 1700 | photo booth hire North London |
| /areas/photo-booth-hire-northampton | Photo Booth Hire Northampton \| Boothdrop Entertainment | Photo booth hire in Northampton for barn and village hall weddings, proms and corporate parties. Attendant and unlimited prints from £299. Get a quote. | 1707 | photo booth hire Northampton |
| /areas/photo-booth-hire-northamptonshire | Photo Booth Hire Northamptonshire \| Boothdrop Entertainment | Northamptonshire photo booth hire for weddings, Asian weddings, corporate events and parties in Northampton, Kettering and Corby. From £299. Get a quote. | 1654 | photo booth hire Northamptonshire |
| /areas/photo-booth-hire-nottinghamshire | Photo Booth Hire Nottinghamshire \| Boothdrop Entertainment | Nottinghamshire photo booth hire for weddings, corporate events and parties in Nottingham, Mansfield and Newark. From £299. Get a free quote today. | 1637 | photo booth hire Nottinghamshire |
| /areas/photo-booth-hire-oxford | Photo Booth Hire Oxford \| Boothdrop Entertainment | Photo booth hire in Oxford for college balls, weddings, graduations and corporate events. Attendant, props and prints included. Get a free quote today. | 1851 | photo booth hire Oxford |
| /areas/photo-booth-hire-oxfordshire | Photo Booth Hire Oxfordshire \| Boothdrop Entertainment | Photo booth hire in Oxfordshire for weddings, parties and corporate events. Attendant, setup and unlimited sessions from £299. Get a free quote today. | 1728 | photo booth hire Oxfordshire |
| /areas/photo-booth-hire-reading | Photo Booth Hire Reading \| Boothdrop Entertainment | Photo booth hire in Reading for Thames-side weddings, business-park corporate events, proms and parties. Attendant and prints from £299. Get a quote. | 1611 | photo booth hire Reading |
| /areas/photo-booth-hire-slough | Photo Booth Hire Slough \| Boothdrop Entertainment | Photo booth hire in Slough for large Asian weddings, banqueting suites, hotel parties and corporate events. Enclosed booth options. Get a free quote. | 1711 | photo booth hire Slough |
| /areas/photo-booth-hire-south-east-london | Photo Booth Hire South East London \| Boothdrop Entertainment | Photo booths for weddings and parties in Greenwich, Bromley, Bexley and Lewisham. Attendant, props, prints and free setup from £299. Call 07368 631 516. | 1755 | photo booth hire South East London |
| /areas/photo-booth-hire-south-london | Photo Booth Hire South London \| Boothdrop Entertainment | Photo booth hire in Croydon, Sutton, Clapham, Brixton and across South London. Attendant, props, prints and setup included from £299. Get a free quote. | 1737 | photo booth hire South London |
| /areas/photo-booth-hire-south-west-london | Photo Booth Hire South West London \| Boothdrop Entertainment | Photo booths for riverside weddings and parties in Richmond, Kingston, Wimbledon, Putney and Battersea. Attendant and prints included. Get a free quote. | 1681 | photo booth hire South West London |
| /areas/photo-booth-hire-surrey | Photo Booth Hire Surrey \| Boothdrop Entertainment | Photo booth hire in Surrey for weddings, proms and corporate events from Guildford to Weybridge. Attendant and setup included from £299. Get a free quote. | 1663 | photo booth hire Surrey |
| /areas/photo-booth-hire-west-london | Photo Booth Hire West London \| Boothdrop Entertainment | Photo booths for Asian weddings, Heathrow hotel events and parties across West London, from Southall to Chiswick. Get a free quote or WhatsApp us. | 1784 | photo booth hire West London |
| /areas/photo-booth-hire-west-sussex | Photo Booth Hire West Sussex \| Boothdrop Entertainment | Mobile photo booth hire across West Sussex, from Chichester and Worthing to Crawley and Horsham. Packages from £299 with attendant. Get a free quote today. | 1838 | photo booth hire West Sussex |
| /blog/how-to-choose-a-wedding-photo-booth | Choosing a Wedding Photo Booth \| Boothdrop Entertainment | Open-air or enclosed, prints or digital, mirror or pod? Our guide to choosing a wedding photo booth covers space, timing and templates. Get a free quote. | 1073 | wedding photo booth |
| /blog/party-planning-tips | 10 Party Planning Tips \| Boothdrop Entertainment | Ten practical party planning tips, from the date and guest list to timing food and entertainment, so the night runs smoothly. Get a free photo booth quote. | 1149 | party planning tips |
| /blog/photo-booth-trends-2025 | Photo Booth Trends 2025 \| Boothdrop Entertainment | From 360 video and boomerangs to AI background removal, glam black-and-white and audio guest books: the photo booth trends for 2025. Get a free quote. | 960 | photo booth trends 2025 |
| /blog/why-corporate-events-need-a-photo-booth | Photo Booths at Corporate Events \| Boothdrop Entertainment | Why a photo booth earns its place at conferences, awards nights, launches and office Christmas parties, and how to brand it. Get a corporate quote today. | 998 | corporate photo booth hire |

## 2. Redirect map (.htaccess)

| From | To (301) | Reason |
|---|---|---|
| /booths/lcd-slimpod | /booths/lcd-slimpod-hire | booth page moved to clean keyword URL |
| /booths/magic-mirror | /booths/magic-mirror-hire | booth page moved to clean keyword URL |
| /booths/selfie-mirror-pod | /booths/selfie-mirror-pod-hire | booth page moved to clean keyword URL |
| /booths/retro-pod | /booths/retro-pod-hire | booth page moved to clean keyword URL |
| /booths/party-booth | /booths/party-booth-hire | booth page moved to clean keyword URL |
| /booths/inflatable-booth | /booths/inflatable-photo-booth-hire | booth page moved to clean keyword URL |
| /booths/gif-booth | /booths/gif-booth-hire | booth page moved to clean keyword URL |
| /services | /events/ | legacy section URL |
| /gallery | /#gallery | legacy anchor section |
| /about | /#about | legacy anchor section |
| /book | /contact#book | legacy booking URL |
| /booking | /contact#book | legacy booking URL |
| /photobooth-for-hire-in-london | /areas/photo-booth-hire-london | legacy agency area URL pattern (not present in this repo; redirected as a safety net) |
| /photobooth-for-hire-in-central-london | /areas/photo-booth-hire-central-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-north-london | /areas/photo-booth-hire-north-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-east-london | /areas/photo-booth-hire-east-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-south-london | /areas/photo-booth-hire-south-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-south-east-london | /areas/photo-booth-hire-south-east-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-south-west-london | /areas/photo-booth-hire-south-west-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-west-london | /areas/photo-booth-hire-west-london | legacy agency area URL pattern |
| /photobooth-for-hire-in-oxfordshire | /areas/photo-booth-hire-oxfordshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-berkshire | /areas/photo-booth-hire-berkshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-hampshire | /areas/photo-booth-hire-hampshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-kent | /areas/photo-booth-hire-kent | legacy agency area URL pattern |
| /photobooth-for-hire-in-essex | /areas/photo-booth-hire-essex | legacy agency area URL pattern |
| /photobooth-for-hire-in-surrey | /areas/photo-booth-hire-surrey | legacy agency area URL pattern |
| /photobooth-for-hire-in-cambridgeshire | /areas/photo-booth-hire-cambridgeshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-west-sussex | /areas/photo-booth-hire-west-sussex | legacy agency area URL pattern |
| /photobooth-for-hire-in-bedfordshire | /areas/photo-booth-hire-bedfordshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-hertfordshire | /areas/photo-booth-hire-hertfordshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-buckinghamshire | /areas/photo-booth-hire-buckinghamshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-nottinghamshire | /areas/photo-booth-hire-nottinghamshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-northamptonshire | /areas/photo-booth-hire-northamptonshire | legacy agency area URL pattern |
| /photobooth-for-hire-in-oxford | /areas/photo-booth-hire-oxford | legacy agency area URL pattern |
| /photobooth-for-hire-in-bromley | /areas/photo-booth-hire-bromley | legacy agency area URL pattern |
| /photobooth-for-hire-in-northampton | /areas/photo-booth-hire-northampton | legacy agency area URL pattern |
| /photobooth-for-hire-in-aylesbury | /areas/photo-booth-hire-aylesbury | legacy agency area URL pattern |
| /photobooth-for-hire-in-reading | /areas/photo-booth-hire-reading | legacy agency area URL pattern |
| /photobooth-for-hire-in-slough | /areas/photo-booth-hire-slough | legacy agency area URL pattern |
| /photobooth-for-hire-in-chelmsford | /areas/photo-booth-hire-chelmsford | legacy agency area URL pattern |
| /photobooth-for-hire-in-cambridge | /areas/photo-booth-hire-cambridge | legacy agency area URL pattern |
| /photobooth-for-hire-in-luton | /areas/photo-booth-hire-luton | legacy agency area URL pattern |

## 3. TODO — items the client must supply

### Collected from content files (also present as `todos` arrays in the JSON)

- TODO: client to supply 360 Booth dimensions/space/power _(first seen in booths/360-booth.json)_
- TODO: client to confirm Selfie Mirror Pod width and depth _(first seen in booths/selfie-mirror-pod.json)_
- TODO: client to confirm process for requesting a female attendant and how far in advance it can be confirmed _(first seen in events/asian-wedding-photo-booth-hire.json)_
- TODO: client to confirm data retention period after events (how long images are held before deletion) _(first seen in events/corporate-photo-booth-hire.json)_
- TODO: client to confirm whether invoiced corporate bookings follow standard deposit/balance terms or 30-day payment terms _(first seen in events/corporate-photo-booth-hire.json)_
- TODO: client to confirm whether attendants are DBS checked so it can be stated on the page _(first seen in events/prom-photo-booth-hire.json)_
- TODO: client to supply registered business name, trading address, company number and ICO registration number _(first seen in pages/privacy-policy.json)_
- TODO: client to confirm data retention periods _(first seen in pages/privacy-policy.json)_
- TODO: client to supply Trustpilot profile URL for the review link _(first seen in pages/reviews.json)_

### Other TODOs (marked with `<!-- TODO -->` comments or placeholders in the site)

- **Trustpilot**: paste the TrustBox embed into `templates/partials/reviews.html` (placeholder marked) and confirm the profile URL in `data/site.json` (currently assumed `https://uk.trustpilot.com/review/boothdrop.co.uk`). Supply 2–3 genuine review excerpts for `data/site.json → reviewPlaceholders`; they currently render as dashed "TODO" cards.
- **Home-page testimonials**: the 10 carried-over testimonials (John, Jane, Michael…) read as generic service reviews and could not be verified. Confirm they are real Trustpilot reviews or replace them (`data/testimonials.json`).
- **Social links**: Facebook page URL (`data/site.json → social.facebook`; the footer icon is hidden until set).
- **Address decision**: no postal address is published. `LocalBusiness.address` is omitted and `areaServed` is used instead. Google Business Profile and citations will need either a service-area business setting or an address.
- **Opening hours**: placeholder 09:00–20:00 daily in `data/site.json`; confirm.
- **Photos**: a real 360 Booth photo (an SVG placeholder is used), a higher-resolution Inflatable Booth photo (source is 280×280 px), a higher-resolution hero background (640×640 px), and real event photos (with permission) for the gallery, which currently shows product shots.
- **Unverified figures removed from the home page**: "500+ Events Covered" and "30+ Areas Served". Restore in `templates/pages/home.html` if the client confirms them.
- **Terms & Conditions page**: not written (footer link removed rather than left dead). Cancellation policy wording on the FAQ page points to the booking confirmation.
- **Privacy policy**: registered business details and retention periods.
- **Legacy URLs**: confirm the real agency URL list from Search Console so the redirect map can be completed.

## 4. Manual actions (cannot be done in code)

1. **Hostinger**: confirm Git deployment points at the correct branch (repo default is `master`, brief says `main`), that `.htaccess` is honoured (AllowOverride All; if the site returns 500 after deploy, remove the `Options -Indexes -MultiViews` line first), and that HTTPS is forced at the hosting level too. Remove the GitHub Pages `CNAME` file only if GitHub Pages is no longer used.
2. **Google Search Console**: verify `https://www.boothdrop.co.uk` (domain property via DNS is simplest), submit `https://www.boothdrop.co.uk/sitemap.xml`, and use URL Inspection on the home page, one booth page and one area page. Add any further legacy URLs that show as 404 in the Pages report to `data/redirects.json`.
3. **boothdropco.uk**: set up a hosting/DNS-level 301 from every URL on `boothdropco.uk` (and `www.`) to the matching URL on `https://www.boothdrop.co.uk` (Hostinger "Redirects" or a one-line `.htaccess` on that domain). Add it as a property in Search Console and use Change of Address.
4. **Google Business Profile**: create/claim as a service-area business (or with the address if one is published), use the exact name "Boothdrop Entertainment", phone 07368 631 516, website `https://www.boothdrop.co.uk`, add the 30 service areas, and link the Trustpilot profile.
5. **Citations**: submit consistent NAP (name, phone, website) to Bing Places, Apple Business Connect, Yell, Thomson Local, Hitched/Bridebook/Add to Event (wedding directories), and Trustpilot's business profile.
6. **Trustpilot**: generate the TrustBox widget code and send it over (see TODO above).
7. **Analytics**: no analytics tag existed; if GA4/Tag Manager is wanted, add the snippet to `templates/layout.html` and rebuild (consider a cookie banner for GDPR).
8. **Email deliverability for FormSubmit**: the AJAX endpoint is already active for `info.boothdrop@boothdrop.co.uk`; the native (no-JS) fallback uses the standard endpoint, which FormSubmit activates with a one-time confirmation email on first submission.

## 5. Lighthouse (mobile, simulated 4G, run locally against a Node server with the Apache clean-URL rules emulated; web fonts and the BoothBook iframe were blocked by the sandbox, so live numbers will differ slightly)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---|---|---|
| `/` | 96 | 100 | 96* | 100 | 2.7 s | 0.005 | 60 ms |
| `/booths/magic-mirror-hire` | 100 | 100 | 100 | 100 | 1.6 s | 0.001 | 50 ms |
| `/areas/photo-booth-hire-reading` | 100 | 100 | 100 | 100 | 1.7 s | 0.004 | 20 ms |

\* The only Best-practices deduction on the home page is a console error from the BoothBook iframe being blocked by the sandbox network policy; it does not occur in production.

## Files created / modified

- Created: `scripts/build-pages.js`, `templates/**`, `data/**` (site, booths, areas, images, redirects, testimonials, content), `.htaccess`, `robots.txt`, `sitemap.xml`, `404.html`, `booths/*`, `events/*`, `areas/*`, `blog/*`, `reviews.html`, `faq.html`, `contact.html`, `privacy-policy.html`, WebP/resized images, favicons, `images/og-default.jpg`, `images/booth-360.svg`, `SEO-REPORT.md`.
- Modified: `index.html` (regenerated), `css/style.css` (booth-detail.css merged in, new components appended, duplicate `.reveal` rule removed), `js/script.js` (rewritten without inline handlers or globals).
- Removed: `css/booth-detail.css` and `js/booth-detail.js` (merged), the 7 old `booths/*.html` files (301-redirected). Original source images are kept untouched alongside the optimised variants.
