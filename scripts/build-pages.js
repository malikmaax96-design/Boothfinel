#!/usr/bin/env node
/**
 * Boothdrop Entertainment — static page generator.
 *
 * Plain Node (no dependencies). Reads JSON data + HTML templates and writes
 * the final HTML, sitemap.xml and .htaccess into the repo root, which Hostinger
 * serves directly.
 *
 *   node scripts/build-pages.js           # build everything
 *   node scripts/build-pages.js --check   # validate content only, write nothing
 *
 * Data:
 *   data/site.json              business facts, nav, integrations
 *   data/booths.json            booth + event structural data (order, slugs, images)
 *   data/areas.json             area hierarchy (parent/children/neighbours)
 *   data/images.json            intrinsic image sizes (written by the image script)
 *   data/redirects.json         legacy URL → new URL map (rendered into .htaccess)
 *   data/content/<type>/*.json  page copy (title, description, h1, sections, faqs…)
 *
 * Templates: templates/layout.html, templates/pages/*.html, templates/partials/*.html
 * Template syntax (Mustache-like subset): {{var}} (escaped), {{{var}}} (raw),
 * {{#each list}}…{{/each}} with {{this}} / {{@index}}, {{#if x}}…{{else}}…{{/if}},
 * {{#unless x}}…{{/unless}}, {{> partial}}. Lookups walk up the scope chain.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const TEMPLATES = path.join(ROOT, 'templates');
const CHECK_ONLY = process.argv.includes('--check');
const ASSET_VERSION = '6';
const TODAY = new Date().toISOString().slice(0, 10);

/* ────────────────────────────────────────────────────────────────────────────
 * Utilities
 * ──────────────────────────────────────────────────────────────────────────── */

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readText = (file) => fs.readFileSync(file, 'utf8');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape for embedding JSON inside <script type="application/ld+json">. */
function safeJsonLd(obj) {
  return JSON.stringify(obj, null, 0).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const wordCount = (text) => (text.match(/[A-Za-z0-9£][A-Za-z0-9£'’\-]*/g) || []).length;

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeFile(relPath, contents) {
  if (CHECK_ONLY) return;
  const file = path.join(ROOT, relPath);
  ensureDir(file);
  fs.writeFileSync(file, contents);
}

function gitLastModified(file) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${file}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return out || TODAY;
  } catch {
    return TODAY;
  }
}

function formatDateUK(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Minimal template engine
 * ──────────────────────────────────────────────────────────────────────────── */

const TOKEN_RE = /\{\{\{\s*([^}]+?)\s*\}\}\}|\{\{\s*([#\/>]?)\s*([^}]*?)\s*\}\}/g;

function tokenize(src) {
  const tokens = [];
  let last = 0;
  let match;
  while ((match = TOKEN_RE.exec(src)) !== null) {
    if (match.index > last) tokens.push({ type: 'text', value: src.slice(last, match.index) });
    if (match[1] !== undefined) {
      tokens.push({ type: 'raw', value: match[1] });
    } else {
      const sigil = match[2];
      const body = match[3];
      if (sigil === '#') {
        const [keyword, ...rest] = body.split(/\s+/);
        tokens.push({ type: 'open', keyword, arg: rest.join(' ') });
      } else if (sigil === '/') {
        tokens.push({ type: 'close', keyword: body.trim() });
      } else if (sigil === '>') {
        tokens.push({ type: 'partial', name: body.trim() });
      } else if (body === 'else') {
        tokens.push({ type: 'else' });
      } else {
        tokens.push({ type: 'var', value: body });
      }
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
}

function parse(tokens, templateName) {
  let pos = 0;
  function parseBlock(stopOn) {
    const nodes = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === 'close') {
        if (!stopOn || stopOn.keyword !== tok.keyword) {
          throw new Error(`${templateName}: unexpected {{/${tok.keyword}}}`);
        }
        pos++;
        return { nodes, elseNodes: null, closed: true };
      }
      if (tok.type === 'else') {
        if (!stopOn) throw new Error(`${templateName}: stray {{else}}`);
        pos++;
        const rest = parseBlock(stopOn);
        return { nodes, elseNodes: rest.nodes, closed: rest.closed };
      }
      pos++;
      if (tok.type === 'open') {
        const inner = parseBlock({ keyword: tok.keyword });
        if (!inner.closed) throw new Error(`${templateName}: unclosed {{#${tok.keyword} ${tok.arg}}}`);
        nodes.push({ type: tok.keyword, arg: tok.arg, nodes: inner.nodes, elseNodes: inner.elseNodes });
      } else {
        nodes.push(tok);
      }
    }
    if (stopOn) throw new Error(`${templateName}: unclosed {{#${stopOn.keyword}}}`);
    return { nodes, elseNodes: null, closed: false };
  }
  return parseBlock(null).nodes;
}

const templateCache = new Map();
function loadTemplate(name) {
  if (!templateCache.has(name)) {
    const file = path.join(TEMPLATES, name);
    templateCache.set(name, parse(tokenize(readText(file)), name));
  }
  return templateCache.get(name);
}

function lookup(scopes, expr) {
  if (expr === 'this') return scopes[scopes.length - 1].value;
  const parts = expr.split('.');
  for (let i = scopes.length - 1; i >= 0; i--) {
    let cur = scopes[i].value;
    if (parts[0].startsWith('@')) {
      const meta = scopes[i].meta;
      if (meta && parts[0] in meta) return meta[parts[0]];
      continue;
    }
    if (cur === null || typeof cur !== 'object') continue;
    if (!(parts[0] in cur)) continue;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[p];
    }
    return cur;
  }
  return undefined;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

function render(nodes, scopes) {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'var': {
        const v = lookup(scopes, node.value);
        out += v === undefined || v === null ? '' : escapeHtml(v);
        break;
      }
      case 'raw': {
        const v = lookup(scopes, node.value);
        out += v === undefined || v === null ? '' : String(v);
        break;
      }
      case 'partial':
        out += render(loadTemplate(`partials/${node.name}.html`), scopes);
        break;
      case 'if':
        out += truthy(lookup(scopes, node.arg)) ? render(node.nodes, scopes) : node.elseNodes ? render(node.elseNodes, scopes) : '';
        break;
      case 'unless':
        out += !truthy(lookup(scopes, node.arg)) ? render(node.nodes, scopes) : node.elseNodes ? render(node.elseNodes, scopes) : '';
        break;
      case 'each': {
        const list = lookup(scopes, node.arg);
        if (!Array.isArray(list) || list.length === 0) {
          out += node.elseNodes ? render(node.elseNodes, scopes) : '';
          break;
        }
        list.forEach((item, index) => {
          const meta = { '@index': index, '@first': index === 0, '@last': index === list.length - 1 };
          out += render(node.nodes, [...scopes, { value: item, meta }]);
        });
        break;
      }
      default:
        throw new Error(`Unknown node type ${node.type}`);
    }
  }
  return out;
}

function renderTemplate(name, context) {
  return render(loadTemplate(name), [{ value: context }]);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Data loading
 * ──────────────────────────────────────────────────────────────────────────── */

const site = readJson(path.join(DATA, 'site.json'));
const images = readJson(path.join(DATA, 'images.json'));
const structure = readJson(path.join(DATA, 'booths.json'));
const areasStruct = readJson(path.join(DATA, 'areas.json')).areas;
const redirects = readJson(path.join(DATA, 'redirects.json'));

function loadContentDir(type) {
  const dir = path.join(DATA, 'content', type);
  if (!fs.existsSync(dir)) return new Map();
  const map = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const full = path.join(dir, file);
    const json = readJson(full);
    json._file = path.relative(ROOT, full);
    map.set(json.slug || path.basename(file, '.json'), json);
  }
  return map;
}

const content = {
  booths: loadContentDir('booths'),
  events: loadContentDir('events'),
  areas: loadContentDir('areas'),
  pages: loadContentDir('pages'),
  blog: loadContentDir('blog'),
};

/* ────────────────────────────────────────────────────────────────────────────
 * Derived structural data
 * ──────────────────────────────────────────────────────────────────────────── */

const booths = structure.booths.map((b) => {
  const copy = content.booths.get(b.slug);
  if (!copy) throw new Error(`Missing booth content: data/content/booths/${b.slug}.json`);
  return { ...b, ...copy, urlSlug: b.urlSlug, href: `/booths/${b.urlSlug}`, priceFrom: copy.priceFrom || site.priceFrom };
});
const boothBySlug = new Map(booths.map((b) => [b.slug, b]));

const events = structure.events.map((e) => {
  const copy = content.events.get(e.slug);
  if (!copy) throw new Error(`Missing event content: data/content/events/${e.slug}.json`);
  return { ...e, ...copy, name: copy.name || e.name, href: `/events/${e.slug}` };
});
const eventBySlug = new Map(events.map((e) => [e.slug, e]));

const areas = areasStruct.map((a) => {
  const copy = content.areas.get(a.slug);
  if (!copy) throw new Error(`Missing area content: data/content/areas/${a.slug}.json`);
  return { ...a, ...copy, name: a.name, href: `/areas/photo-booth-hire-${a.slug}` };
});
const areaBySlug = new Map(areas.map((a) => [a.slug, a]));

const posts = [...content.blog.values()]
  .map((p) => ({ ...p, href: `/blog/${p.slug}`, dateDisplay: formatDateUK(p.date) }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const pageCopy = (slug) => {
  const copy = content.pages.get(slug);
  if (!copy) throw new Error(`Missing page content: data/content/pages/${slug}.json`);
  return copy;
};

/* ────────────────────────────────────────────────────────────────────────────
 * HTML helpers
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Responsive <picture> with WebP + JPEG fallback and intrinsic width/height.
 * `size` = 'large' (800px source) or 'small' (480px variant).
 */
function picture(imageName, alt, opts = {}) {
  const { lazy = true, className = '', sizes = '(max-width: 768px) 100vw, 50vw', fetchPriority = null } = opts;
  const svgPath = path.join(ROOT, 'images', `${imageName}.svg`);
  const attrsCommon = `alt="${escapeHtml(alt)}"${className ? ` class="${className}"` : ''} decoding="async"${lazy ? ' loading="lazy"' : ''}${fetchPriority ? ` fetchpriority="${fetchPriority}"` : ''}`;
  if (fs.existsSync(svgPath)) {
    return `<img src="/images/${imageName}.svg" width="800" height="800" ${attrsCommon}>`;
  }
  const dim = images[imageName];
  if (!dim) throw new Error(`No image dimensions for ${imageName} (run the image script)`);
  const webp = `/images/${imageName}-480.webp ${dim.sw}w, /images/${imageName}.webp ${dim.w}w`;
  const jpg = `/images/${imageName}-480.jpg ${dim.sw}w, /images/${imageName}-opt.jpg ${dim.w}w`;
  return (
    `<picture>` +
    `<source type="image/webp" srcset="${webp}" sizes="${sizes}">` +
    `<img src="/images/${imageName}-opt.jpg" srcset="${jpg}" sizes="${sizes}" width="${dim.w}" height="${dim.h}" ${attrsCommon}>` +
    `</picture>`
  );
}

function preloadFor(imageName) {
  const dim = images[imageName];
  if (!dim) return null;
  return {
    src: `/images/${imageName}.webp`,
    srcset: `/images/${imageName}-480.webp ${dim.sw}w, /images/${imageName}.webp ${dim.w}w`,
    sizes: '(max-width: 768px) 100vw, 50vw',
  };
}

const boothGridCards = () =>
  booths.map((b) => ({
    href: b.href,
    name: b.name,
    tagline: b.tagline,
    badge: b.badge,
    priceFrom: b.priceFrom,
    picture: picture(b.image, `${b.name} photo booth`, { className: 'booth-img', sizes: '(max-width: 768px) 100vw, 33vw' }),
  }));

const popularCards = (list) =>
  (list || []).map((p) => {
    const b = boothBySlug.get(p.slug);
    if (!b) throw new Error(`Unknown booth slug in popularBooths: ${p.slug}`);
    return {
      href: b.href,
      name: b.name,
      reason: p.reason,
      priceFrom: b.priceFrom,
      picture: picture(b.image, `${b.name} photo booth`, { className: 'booth-img', sizes: '(max-width: 768px) 100vw, 25vw' }),
    };
  });

const linkList = (items) => items.map((i) => ({ href: i.href, name: i.name }));
const allEventLinks = () => linkList(events);
const allBoothLinks = () => linkList(booths);

/* ────────────────────────────────────────────────────────────────────────────
 * Structured data (JSON-LD)
 * ──────────────────────────────────────────────────────────────────────────── */

const BUSINESS_ID = `${site.url}/#business`;
const WEBSITE_ID = `${site.url}/#website`;

function businessNode() {
  const node = {
    '@type': ['LocalBusiness', 'Organization'],
    '@id': BUSINESS_ID,
    name: site.name,
    url: `${site.url}/`,
    telephone: site.phoneTel,
    email: site.email,
    image: `${site.url}${site.defaultOgImage}`,
    logo: `${site.url}/images/logo-112.png`,
    priceRange: site.priceRange,
    description: 'Photo booth hire for weddings, Asian weddings, corporate events, proms and parties across London, the Home Counties, the East of England and the Midlands.',
    areaServed: areas.map((a) => ({ '@type': a.type === 'town' ? 'City' : 'AdministrativeArea', name: a.name })),
    openingHoursSpecification: site.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: [site.social.instagram, site.social.facebook, site.social.trustpilot].filter(Boolean),
    makesOffer: booths.map((b) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: `${b.name} hire`, url: `${site.url}${b.href}` },
      priceCurrency: 'GBP',
      price: String(b.priceFrom),
    })),
  };
  if (site.address) {
    node.address = { '@type': 'PostalAddress', ...site.address };
  }
  // TODO: client to supply address (data/site.json "address") for a full LocalBusiness listing; areaServed is used meanwhile.
  return node;
}

function breadcrumbNode(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${site.url}${c.href === '/' ? '/' : c.href}`,
    })),
  };
}

function faqNode(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function buildSchema(page) {
  const graph = [
    businessNode(),
    { '@type': 'WebSite', '@id': WEBSITE_ID, url: `${site.url}/`, name: site.name, publisher: { '@id': BUSINESS_ID } },
    {
      '@type': page.schemaPageType || 'WebPage',
      '@id': `${page.canonical}#webpage`,
      url: page.canonical,
      name: page.title,
      description: page.metaDescription,
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': BUSINESS_ID },
      inLanguage: 'en-GB',
      primaryImageOfPage: page.ogImage,
    },
    breadcrumbNode(page.breadcrumbs),
  ];
  const faq = faqNode(page.faqs);
  if (faq) graph.push(faq);
  if (page.extraSchema) graph.push(...page.extraSchema);
  return safeJsonLd({ '@context': 'https://schema.org', '@graph': graph });
}

function serviceNode(booth) {
  return {
    '@type': 'Service',
    '@id': `${site.url}${booth.href}#service`,
    name: `${booth.name} hire`,
    serviceType: `${booth.name} photo booth hire`,
    description: booth.metaDescription,
    provider: { '@id': BUSINESS_ID },
    areaServed: areas.map((a) => ({ '@type': a.type === 'town' ? 'City' : 'AdministrativeArea', name: a.name })),
    image: `${site.url}/images/${booth.image}${fs.existsSync(path.join(ROOT, 'images', `${booth.image}.svg`)) ? '.svg' : '-opt.jpg'}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      price: String(booth.priceFrom),
      priceSpecification: { '@type': 'PriceSpecification', minPrice: booth.priceFrom, priceCurrency: 'GBP' },
      availability: 'https://schema.org/InStock',
      url: `${site.url}${booth.href}`,
    },
  };
}

function areaServiceNode(area) {
  return {
    '@type': 'Service',
    '@id': `${site.url}${area.href}#service`,
    name: `Photo booth hire in ${area.name}`,
    serviceType: 'Photo booth hire',
    provider: { '@id': BUSINESS_ID },
    areaServed: { '@type': area.type === 'town' ? 'City' : 'AdministrativeArea', name: area.name },
    offers: { '@type': 'Offer', priceCurrency: 'GBP', price: String(site.priceFrom), url: `${site.url}${area.href}` },
  };
}

function articleNode(post, canonical) {
  return {
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    headline: post.h1,
    description: post.metaDescription,
    datePublished: post.date,
    dateModified: post.lastmod,
    author: { '@id': BUSINESS_ID },
    publisher: { '@id': BUSINESS_ID },
    mainEntityOfPage: { '@id': `${canonical}#webpage` },
    image: `${site.url}/images/${post.image}-opt.jpg`,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Page assembly
 * ──────────────────────────────────────────────────────────────────────────── */

const pages = []; // { outFile, url, canonical, title, metaDescription, html, words, lastmod, primaryKeyword, kind }

function baseContext(page) {
  const navItems = site.nav.map((n) => ({ ...n, current: page.url === n.href || (n.href !== '/' && page.url.startsWith(n.href)) }));
  return {
    site,
    images,
    year: new Date().getFullYear(),
    assetVersion: ASSET_VERSION,
    fontsHref: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap',
    nav: navItems,
    boothsNav: linkList(booths),
    eventsNav: linkList(events),
    quoteHref: page.url === '/' ? '#quote' : page.hasQuoteForm === false ? '/contact#quote' : '#quote',
    eventTypesForm: site.eventTypesForm.map((label) => ({ label, selected: label === page.preselectEvent })),
    boothOptions: booths.map((b) => ({ label: b.formValue, selected: b.formValue === page.preselectBooth })),
    reviews: site.reviewPlaceholders,
    quoteHeading: page.quoteHeading || 'Get a Free Photo Booth Quote',
    faqHeading: page.faqHeading || 'Frequently Asked Questions',
    ctaHeading: page.ctaHeading || 'Ready to Book Your Photo Booth?',
    boothGridEyebrow: 'Our collection',
    boothGridHeading: page.boothGridHeading || 'Choose Your Perfect Booth',
    boothGridDesc: page.boothGridDesc || '',
    boothGrid: boothGridCards(),
  };
}

function assemble(page) {
  const canonical = `${site.url}${page.url}`;
  const ogImage = page.ogImage ? `${site.url}${page.ogImage}` : `${site.url}${site.defaultOgImage}`;
  const ogDims = page.ogImage ? page.ogImageDims : { w: 1200, h: 630 };
  const breadcrumbs = page.breadcrumbs.map((c, i, arr) => ({ ...c, last: i === arr.length - 1 }));
  const model = {
    ...baseContext(page),
    ...page.model,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.h1,
    intro: page.intro,
    sections: page.sections || [],
    faqs: page.faqs || [],
    breadcrumbs,
    canonical,
    ogImage,
    ogImageWidth: ogDims.w,
    ogImageHeight: ogDims.h,
    ogType: page.ogType || 'website',
    noindex: Boolean(page.noindex),
    bodyClass: page.bodyClass || 'page',
    preloadImage: page.preloadImage || null,
    linkGroups: page.linkGroups || [],
  };
  model.content = renderTemplate(`pages/${page.template}.html`, model);
  model.schemaJson = buildSchema({
    canonical,
    title: page.title,
    metaDescription: page.metaDescription,
    breadcrumbs: page.breadcrumbs,
    faqs: page.faqs,
    ogImage,
    schemaPageType: page.schemaPageType,
    extraSchema: page.extraSchema,
  });
  // Non-breaking spaces keep the phone number on one line (and satisfy html-validate's tel rule).
  const html = renderTemplate('layout.html', model).replace(/07368 631 516/g, '07368\u00a0631\u00a0516');
  const mainText = stripHtml(model.content);
  pages.push({
    outFile: page.outFile,
    url: page.url,
    canonical,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.h1,
    primaryKeyword: page.primaryKeyword,
    kind: page.kind,
    html,
    words: wordCount(mainText),
    lastmod: page.lastmod || TODAY,
    faqCount: (page.faqs || []).length,
    noindex: Boolean(page.noindex),
    sourceFile: page.sourceFile,
    sections: page.sections || [],
    intro: page.intro,
    sitemapPriority: page.sitemapPriority,
  });
}

const HOME_CRUMB = { name: 'Home', href: '/' };

/* Booth pages */
for (const booth of booths) {
  const specList = Object.entries(booth.specs || {}).map(([label, value]) => ({ label, value }));
  assemble({
    kind: 'booth',
    template: 'booth',
    outFile: `booths/${booth.urlSlug}.html`,
    url: booth.href,
    sourceFile: booth._file,
    lastmod: gitLastModified(booth._file),
    title: booth.title,
    metaDescription: booth.metaDescription,
    h1: booth.h1,
    intro: booth.intro,
    primaryKeyword: booth.primaryKeyword,
    sections: booth.sections,
    faqs: booth.faqs,
    preselectBooth: booth.formValue,
    ogImage: fs.existsSync(path.join(ROOT, 'images', `${booth.image}.svg`)) ? null : `/images/${booth.image}-opt.jpg`,
    ogImageDims: images[booth.image] ? { w: images[booth.image].w, h: images[booth.image].h } : null,
    preloadImage: preloadFor(booth.image),
    breadcrumbs: [HOME_CRUMB, { name: 'Booths', href: '/booths/' }, { name: booth.name, href: booth.href }],
    quoteHeading: `Get a ${booth.name} Quote`,
    ctaHeading: `Ready to Book the ${booth.name}?`,
    faqHeading: `${booth.name} Hire FAQs`,
    extraSchema: [serviceNode(booth)],
    linkGroups: [
      { title: `${booth.name} hire for your event`, links: allEventLinks() },
      { title: 'Where we bring the ' + booth.name, links: [{ href: '/areas/', name: 'All areas we cover' }, ...linkList(areas.filter((a) => ['london', 'essex', 'hertfordshire', 'kent', 'surrey', 'berkshire'].includes(a.slug)))] },
      { title: 'Other booths', links: linkList(booths.filter((b) => b.slug !== booth.slug)) },
    ],
    model: {
      name: booth.name,
      badge: booth.badge,
      eyebrow: 'Photo booth hire',
      heroSpecs: [booth.specs['Guests per shot'] ? `${booth.specs['Guests per shot']} per shot` : null, booth.specs['Floor space'] ? `Floor space ${booth.specs['Floor space']}` : null, booth.specs.Power || null].filter(Boolean),
      heroImage: picture(booth.image, `${booth.name} photo booth hire`, { lazy: false, className: 'bd-hero-img', fetchPriority: 'high' }),
      included: booth.included,
      specList,
      customisation: booth.customisation,
      priceFrom: booth.priceFrom,
    },
  });
}

/* Event pages */
for (const event of events) {
  assemble({
    kind: 'event',
    template: 'event',
    outFile: `events/${event.slug}.html`,
    url: event.href,
    sourceFile: event._file,
    lastmod: gitLastModified(event._file),
    title: event.title,
    metaDescription: event.metaDescription,
    h1: event.h1,
    intro: event.intro,
    primaryKeyword: event.primaryKeyword,
    sections: event.sections,
    faqs: event.faqs,
    preselectEvent: { 'wedding-photo-booth-hire': 'Wedding', 'asian-wedding-photo-booth-hire': 'Asian Wedding', 'corporate-photo-booth-hire': 'Corporate Event', 'prom-photo-booth-hire': 'Prom / School Event', 'birthday-party-photo-booth-hire': 'Birthday Party' }[event.slug],
    ogImage: `/images/${event.image}-opt.jpg`,
    ogImageDims: { w: images[event.image].w, h: images[event.image].h },
    preloadImage: preloadFor(event.image),
    breadcrumbs: [HOME_CRUMB, { name: 'Events', href: '/events/' }, { name: event.name, href: event.href }],
    quoteHeading: `Get a Quote for Your ${event.name === 'Corporate Events' ? 'Corporate Event' : event.name.replace(/ies$/, 'y').replace(/s$/, '')}`,
    ctaHeading: `Ready to Book a Photo Booth for Your ${event.name === 'Corporate Events' ? 'Event' : event.name.replace(/ies$/, 'y').replace(/s$/, '')}?`,
    faqHeading: `${event.name} Photo Booth FAQs`,
    extraSchema: [{ '@type': 'Service', '@id': `${site.url}${event.href}#service`, name: `${event.name} photo booth hire`, serviceType: 'Photo booth hire', provider: { '@id': BUSINESS_ID }, offers: { '@type': 'Offer', priceCurrency: 'GBP', price: String(site.priceFrom) } }],
    linkGroups: [
      { title: 'All our booths', links: allBoothLinks() },
      { title: 'Other event types', links: linkList(events.filter((e) => e.slug !== event.slug)) },
      { title: 'Areas we cover', links: [{ href: '/areas/', name: 'All areas we cover' }, ...linkList(areas.filter((a) => a.type === 'london-parent' || a.type === 'county'))] },
    ],
    model: {
      name: event.name,
      eyebrow: 'Event photo booth hire',
      heroImage: picture(event.image, `${event.name} photo booth hire`, { lazy: false, className: 'bd-hero-img', fetchPriority: 'high' }),
      popularBoothCards: popularCards(event.popularBooths),
    },
  });
}

/* Area pages */
const AREA_HERO_IMAGES = ['booth-magic', 'booth-selfie', 'booth-slimpod', 'booth-party', 'booth-retro'];
areas.forEach((area, index) => {
  const parent = area.parent ? areaBySlug.get(area.parent) : null;
  const children = area.children.map((s) => areaBySlug.get(s));
  const neighbours = area.neighbours.map((s) => areaBySlug.get(s));
  const crumbs = [HOME_CRUMB, { name: 'Areas', href: '/areas/' }];
  if (parent && parent.parent) crumbs.push({ name: areaBySlug.get(parent.parent).name, href: areaBySlug.get(parent.parent).href });
  if (parent) crumbs.push({ name: parent.name, href: parent.href });
  crumbs.push({ name: area.name, href: area.href });
  const heroImage = AREA_HERO_IMAGES[index % AREA_HERO_IMAGES.length];
  const linkGroups = [];
  if (children.length) {
    linkGroups.push({ title: area.type === 'london-parent' ? 'Photo booth hire across London' : `Towns we cover in ${area.name}`, links: linkList(children) });
  }
  if (parent) {
    linkGroups.push({ title: `Part of our ${parent.name} coverage`, links: [parent, ...(parent.parent ? [areaBySlug.get(parent.parent)] : [])].map((p) => ({ href: p.href, name: `Photo booth hire ${p.name}` })) });
  }
  linkGroups.push({ title: `Nearby areas`, links: neighbours.map((n) => ({ href: n.href, name: `Photo booth hire ${n.name}` })) });
  linkGroups.push({ title: `Events we cover in ${area.name}`, links: allEventLinks() });
  linkGroups.push({ title: 'More areas', links: [{ href: '/areas/', name: 'All areas we cover' }] });

  assemble({
    kind: 'area',
    template: 'area',
    outFile: `areas/photo-booth-hire-${area.slug}.html`,
    url: area.href,
    sourceFile: area._file,
    lastmod: gitLastModified(area._file),
    title: area.title,
    metaDescription: area.metaDescription,
    h1: area.h1,
    intro: area.intro,
    primaryKeyword: area.primaryKeyword,
    sections: area.sections,
    faqs: area.faqs,
    ogImage: `/images/${heroImage}-opt.jpg`,
    ogImageDims: { w: images[heroImage].w, h: images[heroImage].h },
    preloadImage: preloadFor(heroImage),
    breadcrumbs: crumbs,
    quoteHeading: `Get a Photo Booth Quote for ${area.name}`,
    ctaHeading: `Ready to Book a Photo Booth in ${area.name}?`,
    faqHeading: `Photo Booth Hire in ${area.name}: Local FAQs`,
    boothGridHeading: `Booths Available in ${area.name}`,
    boothGridDesc: `Every booth below is available for hire in ${area.name} with delivery, setup and an attendant included.`,
    extraSchema: [areaServiceNode(area)],
    linkGroups,
    model: {
      name: area.name,
      eyebrow: parent ? `Photo booth hire ${parent.name}` : 'Photo booth hire',
      heroImage: picture(heroImage, `Photo booth hire in ${area.name}`, { lazy: false, className: 'bd-hero-img', fetchPriority: 'high' }),
      popularBoothCards: popularCards(area.popularBooths),
    },
  });
});

/* Generic content pages */
function simplePage({ slug, url, outFile, template = 'page', crumbName, eyebrow, heroImage = 'booth-magic', model = {}, linkGroups = [], extras = {} }) {
  const copy = pageCopy(slug);
  assemble({
    kind: 'page',
    template,
    outFile,
    url,
    sourceFile: copy._file,
    lastmod: gitLastModified(copy._file),
    title: copy.title,
    metaDescription: copy.metaDescription,
    h1: copy.h1,
    intro: copy.intro,
    primaryKeyword: copy.primaryKeyword,
    sections: copy.sections,
    faqs: copy.faqs,
    preloadImage: preloadFor(heroImage),
    breadcrumbs: [HOME_CRUMB, { name: crumbName, href: url }],
    linkGroups,
    model: {
      name: copy.h1,
      eyebrow,
      heroImage: picture(heroImage, copy.h1, { lazy: false, className: 'bd-hero-img', fetchPriority: 'high' }),
      showReviews: true,
      ...model,
    },
    ...extras,
  });
}

simplePage({
  slug: 'booths', url: '/booths/', outFile: 'booths/index.html', crumbName: 'Booths', eyebrow: 'Our collection', heroImage: 'booth-slimpod',
  model: { showBoothGrid: true },
  linkGroups: [{ title: 'Photo booths by event', links: allEventLinks() }, { title: 'Areas we cover', links: [{ href: '/areas/', name: 'All areas we cover' }] }],
  extras: { schemaPageType: 'CollectionPage', boothGridHeading: 'All Eight Booths', extraSchema: [{ '@type': 'ItemList', itemListElement: booths.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: `${b.name} hire`, url: `${site.url}${b.href}` })) }] },
});

simplePage({
  slug: 'events', url: '/events/', outFile: 'events/index.html', crumbName: 'Events', eyebrow: 'Event photo booth hire', heroImage: 'booth-party',
  model: { showBoothGrid: true },
  linkGroups: [{ title: 'Photo booth hire by event type', links: allEventLinks() }, { title: 'Areas we cover', links: [{ href: '/areas/', name: 'All areas we cover' }] }],
  extras: { schemaPageType: 'CollectionPage' },
});

const londonParent = areaBySlug.get('london');
simplePage({
  slug: 'areas', url: '/areas/', outFile: 'areas/index.html', crumbName: 'Areas', eyebrow: 'Where we work', heroImage: 'booth-selfie',
  model: { showBoothGrid: false },
  linkGroups: [
    { title: 'London', links: [londonParent, ...londonParent.children.map((s) => areaBySlug.get(s))].map((a) => ({ href: a.href, name: `Photo booth hire ${a.name}` })) },
    { title: 'Counties', links: areas.filter((a) => a.type === 'county').map((a) => ({ href: a.href, name: `Photo booth hire ${a.name}` })) },
    { title: 'Towns and cities', links: areas.filter((a) => a.type === 'town').map((a) => ({ href: a.href, name: `Photo booth hire ${a.name}` })) },
    { title: 'Our booths', links: allBoothLinks() },
  ],
  extras: { schemaPageType: 'CollectionPage', extraSchema: [{ '@type': 'ItemList', itemListElement: areas.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: `Photo booth hire ${a.name}`, url: `${site.url}${a.href}` })) }] },
});

simplePage({
  slug: 'reviews', url: '/reviews', outFile: 'reviews.html', crumbName: 'Reviews', eyebrow: 'Customer reviews', heroImage: 'booth-magic',
  model: { showBoothGrid: true, showReviews: true },
  linkGroups: [{ title: 'Photo booths by event', links: allEventLinks() }],
});

simplePage({
  slug: 'faq', url: '/faq', outFile: 'faq.html', crumbName: 'FAQ', eyebrow: 'Help & advice', heroImage: 'booth-retro',
  model: { showBoothGrid: true },
  linkGroups: [{ title: 'Our booths', links: allBoothLinks() }, { title: 'Photo booths by event', links: allEventLinks() }],
  extras: { faqHeading: 'Photo Booth Hire: Your Questions Answered' },
});

simplePage({
  slug: 'contact', url: '/contact', outFile: 'contact.html', crumbName: 'Contact', eyebrow: 'Get in touch', heroImage: 'booth-slimpod',
  model: { showBoothGrid: false, bookingWidget: true },
  linkGroups: [{ title: 'Our booths', links: allBoothLinks() }, { title: 'Areas we cover', links: [{ href: '/areas/', name: 'All areas we cover' }] }],
  extras: { schemaPageType: 'ContactPage', quoteHeading: 'Request Your Free Quote' },
});

/* Privacy policy (hand-written copy, generic page template) */
simplePage({
  slug: 'privacy-policy', url: '/privacy-policy', outFile: 'privacy-policy.html', crumbName: 'Privacy Policy', eyebrow: 'Legal', heroImage: 'booth-retro',
  model: { showBoothGrid: false, showReviews: false },
  extras: { sitemapPriority: '0.2' },
});

/* Blog */
for (const post of posts) {
  post.lastmod = gitLastModified(post._file);
  assemble({
    kind: 'blog',
    template: 'blog-post',
    outFile: `blog/${post.slug}.html`,
    url: post.href,
    sourceFile: post._file,
    lastmod: post.lastmod,
    title: post.title,
    metaDescription: post.metaDescription,
    h1: post.h1,
    intro: post.intro,
    primaryKeyword: post.primaryKeyword,
    sections: post.sections,
    faqs: post.faqs,
    ogType: 'article',
    ogImage: `/images/${post.image}-opt.jpg`,
    ogImageDims: { w: images[post.image].w, h: images[post.image].h },
    preloadImage: preloadFor(post.image),
    breadcrumbs: [HOME_CRUMB, { name: 'Blog', href: '/blog/' }, { name: post.h1, href: post.href }],
    schemaPageType: 'WebPage',
    extraSchema: [articleNode(post, `${site.url}${post.href}`)],
    linkGroups: [{ title: 'More from the blog', links: posts.filter((p) => p.slug !== post.slug).map((p) => ({ href: p.href, name: p.h1 })) }, { title: 'Our booths', links: allBoothLinks() }],
    model: {
      category: post.category,
      dateDisplay: post.dateDisplay,
      readingTime: post.readingTime,
      heroImage: picture(post.image, post.h1, { lazy: false, className: 'bd-hero-img', fetchPriority: 'high', sizes: '(max-width: 900px) 100vw, 900px' }),
    },
  });
}

assemble({
  kind: 'page',
  template: 'blog-index',
  outFile: 'blog/index.html',
  url: '/blog/',
  title: 'Photo Booth Blog & Event Tips | Boothdrop Entertainment',
  metaDescription: 'Planning advice, photo booth trends and event tips from the Boothdrop Entertainment team. Read our latest guides, then get a free quote for your event.',
  h1: 'Photo Booth Blog and Event Planning Tips',
  intro: 'Advice from our team on choosing the right booth, planning the running order of your event and getting the most from your hire.',
  primaryKeyword: 'photo booth blog',
  sections: [],
  faqs: [],
  breadcrumbs: [HOME_CRUMB, { name: 'Blog', href: '/blog/' }],
  schemaPageType: 'CollectionPage',
  linkGroups: [{ title: 'Our booths', links: allBoothLinks() }, { title: 'Photo booths by event', links: allEventLinks() }],
  model: {
    posts: posts.map((p) => ({ ...p, picture: picture(p.image, p.h1, { className: 'blog-card-img', sizes: '(max-width: 768px) 100vw, 33vw' }) })),
  },
  sitemapPriority: '0.5',
});

/* Home */
{
  const home = pageCopy('home');
  // The "About" section is rendered in the dedicated about block rather than the prose area.
  const aboutIndex = (home.sections || []).findIndex((s) => /^about/i.test(s.heading));
  const aboutSection = aboutIndex >= 0 ? home.sections[aboutIndex] : null;
  const homeSections = (home.sections || []).filter((_, i) => i !== aboutIndex);
  const testimonials = readJson(path.join(DATA, 'testimonials.json')).map((t) => ({ ...t, initial: t.author.charAt(0) }));
  const eventBlurbs = {
    'wedding-photo-booth-hire': 'Elegant booths that blend into any wedding theme and give guests a keepsake to take home.',
    'asian-wedding-photo-booth-hire': 'High-capacity booths, privacy options and multi-day packages for mehndi, nikah, sangeet and reception events.',
    'corporate-photo-booth-hire': 'Branded prints and digital files for awards nights, Christmas parties, launches and exhibitions.',
    'prom-photo-booth-hire': 'Supervised, fast-moving booths that keep a whole year group entertained and give every student a print.',
    'birthday-party-photo-booth-hire': 'From 18ths to 60ths, themed templates and props that get everyone in front of the camera.',
  };
  const londonChildren = londonParent.children.map((s) => areaBySlug.get(s));
  const galleryMods = ['', 'gallery-item--tall', '', 'gallery-item--wide', '', '', 'gallery-item--tall', ''];
  assemble({
    kind: 'home',
    template: 'home',
    outFile: 'index.html',
    url: '/',
    sourceFile: home._file,
    lastmod: gitLastModified(home._file),
    title: home.title,
    metaDescription: home.metaDescription,
    h1: home.h1,
    intro: home.intro,
    primaryKeyword: home.primaryKeyword,
    sections: homeSections,
    faqs: home.faqs,
    breadcrumbs: [HOME_CRUMB],
    bodyClass: 'home',
    preloadImage: preloadFor('hero-bg'),
    boothGridHeading: 'Choose Your Perfect Booth',
    boothGridDesc: 'Eight booth styles, all with an attendant, props, a custom template and free delivery and setup.',
    model: {
      h1Html: escapeHtml(home.h1).replace(/\bfor\b/i, '<br>for').replace(/Every Occasion/, '<span class="gold-text">Every Occasion</span>'),
      heroSubtitle: home.heroSubtitle,
      heroTagline: home.heroTagline,
      aboutHeading: (aboutSection && aboutSection.heading) || home.aboutHeading || 'Your Photo Booth Experience Across the UK',
      aboutParagraphs: (aboutSection && aboutSection.paragraphs) || home.aboutParagraphs || [],
      eventCards: events.map((e) => ({ href: e.href, name: e.name, blurb: eventBlurbs[e.slug] })),
      testimonials,
      areaGroups: [
        { title: 'London', href: londonParent.href, links: londonChildren.map((a) => ({ href: a.href, name: a.name })) },
        { title: 'Counties', href: '/areas/', links: areas.filter((a) => a.type === 'county').map((a) => ({ href: a.href, name: a.name })) },
        { title: 'Towns & cities', href: '/areas/', links: areas.filter((a) => a.type === 'town').map((a) => ({ href: a.href, name: a.name })) },
      ],
      gallery: booths.map((b, i) => ({ href: b.href, name: b.name, mod: galleryMods[i] || '', picture: picture(b.image, `${b.name} photo booth`, { sizes: '(max-width: 768px) 50vw, 25vw' }) })),
      posts: posts.map((p) => ({ ...p, picture: picture(p.image, p.h1, { className: 'blog-card-img', sizes: '(max-width: 768px) 100vw, 33vw' }) })),
    },
    sitemapPriority: '1.0',
  });
}

/* 404 page (noindex, not in sitemap) */
assemble({
  kind: 'system',
  template: 'page',
  outFile: '404.html',
  url: '/404',
  title: 'Page Not Found | Boothdrop Entertainment',
  metaDescription: 'Sorry, that page could not be found. Browse our photo booths, event pages and areas we cover, or get a free quote from Boothdrop Entertainment today.',
  h1: 'Page Not Found',
  intro: 'The page you were looking for has moved or no longer exists. Use the links below to find our booths, events and areas, or get in touch for a quote.',
  primaryKeyword: '',
  sections: [{ heading: 'Where would you like to go?', paragraphs: ['Our most popular pages are the <a href="/booths/">booth overview</a>, the <a href="/areas/">areas we cover</a> and the <a href="/contact">contact page</a>. If you followed a link from another site, let us know and we will fix it.'] }],
  faqs: [],
  noindex: true,
  breadcrumbs: [HOME_CRUMB, { name: 'Page not found', href: '/404' }],
  model: { name: 'Page not found', eyebrow: 'Error 404', heroImage: picture('booth-retro', 'Boothdrop Entertainment photo booth', { lazy: false, className: 'bd-hero-img' }), showBoothGrid: true, showReviews: false },
  linkGroups: [{ title: 'Our booths', links: allBoothLinks() }, { title: 'Events', links: allEventLinks() }, { title: 'Areas', links: [{ href: '/areas/', name: 'All areas we cover' }] }],
});

/* ────────────────────────────────────────────────────────────────────────────
 * Validation (quality gate)
 * ──────────────────────────────────────────────────────────────────────────── */

const problems = [];
const seenTitles = new Map();
const seenDescriptions = new Map();
const seenParagraphs = new Map();
const FIRST_PERSON_SINGULAR = /(^|[\s"(])(I|I'm|I've|I'd|I'll|my|My|me)([\s.,;:!?')]|$)/;

for (const p of pages) {
  if (p.kind === 'system') continue;
  const where = `${p.url} (${p.sourceFile || 'generated'})`;
  if (p.title.length > 60) problems.push(`${where}: title is ${p.title.length} chars (max 60)`);
  if (!p.title.endsWith('| Boothdrop Entertainment')) problems.push(`${where}: title must end with "| Boothdrop Entertainment"`);
  if (p.metaDescription.length < 140 || p.metaDescription.length > 155) problems.push(`${where}: meta description is ${p.metaDescription.length} chars (140–155)`);
  if (!p.h1 || !p.h1.trim()) problems.push(`${where}: missing h1`);
  const minWords = p.kind === 'page' && p.url === '/blog/' ? 150 : p.url === '/privacy-policy' ? 300 : 500;
  if (p.words < minWords) problems.push(`${where}: only ${p.words} words (min ${minWords})`);
  if (p.kind !== 'blog' && p.url !== '/blog/' && p.url !== '/privacy-policy' && (p.faqCount < 4 || p.faqCount > 18)) problems.push(`${where}: ${p.faqCount} FAQs (need 4–6, FAQ page up to 18)`);
  if ((p.html.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${where}: must contain exactly one <h1>`);
  if (seenTitles.has(p.title)) problems.push(`${where}: duplicate title (also ${seenTitles.get(p.title)})`);
  seenTitles.set(p.title, p.url);
  if (seenDescriptions.has(p.metaDescription)) problems.push(`${where}: duplicate meta description (also ${seenDescriptions.get(p.metaDescription)})`);
  seenDescriptions.set(p.metaDescription, p.url);
  const copyText = [p.intro, ...p.sections.flatMap((s) => [s.heading, ...(s.paragraphs || []), ...(s.list || [])])].join('\n');
  const fps = copyText.match(FIRST_PERSON_SINGULAR);
  if (fps) problems.push(`${where}: first-person singular found near "${fps[0].trim()}"`);
  for (const s of p.sections) {
    for (const para of s.paragraphs || []) {
      const key = stripHtml(para).toLowerCase();
      if (key.length < 60) continue;
      if (seenParagraphs.has(key)) problems.push(`${where}: paragraph duplicated from ${seenParagraphs.get(key)}: "${key.slice(0, 60)}…"`);
      seenParagraphs.set(key, p.url);
    }
  }
  if (/<img(?![^>]*\balt=)/.test(p.html)) problems.push(`${where}: <img> without alt`);
  if (/<img(?![^>]*\bwidth=)/.test(p.html)) problems.push(`${where}: <img> without width`);
  if (/\son[a-z]+\s*=/.test(p.html)) problems.push(`${where}: inline event handler found`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Output
 * ──────────────────────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`\n${problems.length} content problem(s):\n- ${problems.join('\n- ')}\n`);
  if (!process.argv.includes('--force')) process.exit(1);
}

if (!CHECK_ONLY) {
  for (const p of pages) writeFile(p.outFile, p.html);

  const sitemapPages = pages.filter((p) => !p.noindex && p.kind !== 'system');
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapPages
      .map((p) => {
        const priority = p.sitemapPriority || (p.kind === 'booth' || p.kind === 'area' || p.kind === 'event' ? '0.8' : p.kind === 'blog' ? '0.5' : '0.6');
        return `  <url>\n    <loc>${escapeHtml(p.canonical)}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
      })
      .join('\n') +
    `\n</urlset>\n`;
  writeFile('sitemap.xml', sitemap);

  /* .htaccess from template + redirect map */
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const redirectLines = redirects
    .map((r) => {
      const from = r.from.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
      return `  RewriteRule ^${escapeRegex(from)}(\\.html)?/?$ ${r.to} [R=301,L,NE]`;
    })
    .join('\n');
  const htaccess = readText(path.join(TEMPLATES, 'htaccess.txt')).replace('{{REDIRECTS}}', redirectLines);
  writeFile('.htaccess', htaccess);

  /* Page manifest for the report */
  const manifest = pages
    .filter((p) => p.kind !== 'system')
    .map((p) => ({ url: p.url, title: p.title, metaDescription: p.metaDescription, h1: p.h1, words: p.words, primaryKeyword: p.primaryKeyword, kind: p.kind, lastmod: p.lastmod }));
  writeFile('data/page-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Built ${pages.length} pages, sitemap.xml (${sitemapPages.length} URLs) and .htaccess (${redirects.length} redirects).`);
} else {
  console.log(`Checked ${pages.length} pages: ${problems.length ? 'problems found' : 'OK'}.`);
}
