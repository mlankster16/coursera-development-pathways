/* Coursera Development Pathways — flatten design sources to shippable static HTML.

   Usage:  node tools/build.mjs <path to design_handoff .../designs>
   Output: index.html, find-your-pathway.html, specialization-pathways.html,
           course-pathways.html and the hover block of site.css, at repo root.

   Transform rules (same conventions as the Coursera Design Guide build):
     <helmet>                   -> each page's <head>
     style-hover="…"            -> class hN, rule emitted into site.css (!important)
     *.dc.html links            -> *.html
     Find page finder           -> data-step / data-pick / data-text, run by site.js
     Find page FAQ              -> real <button> triggers + hidden panels
     design-tool scripts        -> removed
   Nothing about the rendered design changes. The script refuses to write if
   anything from the design tool survives, or if an internal link or anchor
   does not resolve. */

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2];
if (!SRC) { console.error('usage: node tools/build.mjs <designs dir>'); process.exit(1); }
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  { src: 'index.dc.html', slug: 'index', title: 'Coursera Development Pathways | Duke CTL' },
  { src: 'find-your-pathway.dc.html', slug: 'find-your-pathway', title: 'Find Your Pathway — Coursera Development Pathways | Duke CTL' },
  { src: 'specialization-pathways.dc.html', slug: 'specialization-pathways', title: 'Specialization Pathways — Coursera Development Pathways | Duke CTL' },
  { src: 'course-pathways.dc.html', slug: 'course-pathways', title: 'Course Pathways — Coursera Development Pathways | Duke CTL' },
];

const DESCRIPTION = 'Duke CTL’s starting point for faculty developing a Coursera Course or Specialization: how development works, how the work is shared, and which development pathway fits your project.';

const classMap = {}, order = [];

function hoverClasses(body) {
  return body.replace(/<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)>/g, (tag, name, attrs) => {
    if (!/style-(hover|focus|active)=/.test(attrs)) return tag;
    const cls = [];
    attrs = attrs.replace(/\s+style-(hover|focus|active)="([^"]*)"/g, (m, state, decl) => {
      const key = state + '|' + decl.trim().replace(/;$/, '');
      if (!classMap[key]) { classMap[key] = 'h' + (order.length + 1); order.push(key); }
      cls.push(classMap[key]);
      return '';
    });
    if (/\sclass="/.test(attrs)) attrs = attrs.replace(/\sclass="([^"]*)"/, (m, c) => ' class="' + c + ' ' + cls.join(' ') + '"');
    else attrs = attrs.replace(/\s*$/, '') + ' class="' + cls.join(' ') + '"';
    return '<' + name + attrs + '>';
  });
}

/* Header: nav landmark + aria-current on the page's own item. */
function header(body) {
  body = body.replace(
    /<div style="display:flex; align-items:center; justify-content:flex-end; gap:10px 24px;([^"]*)">([\s\S]*?)<\/div>/,
    (m, rest, inner) => '<nav aria-label="Site" style="display:flex; align-items:center; justify-content:flex-end; gap:10px 24px;' + rest + '">' + inner + '</nav>');
  body = body.replace(/<span style="color:#012169; font-weight:600; border-bottom:3px solid/, '<span aria-current="page" style="color:#012169; font-weight:600; border-bottom:3px solid');
  /* data-label lets site.css reserve each item's bold width, so the nav is
     the same width on every page whichever item is current */
  body = body.replace(/<nav [\s\S]*?<\/nav>/, (nav) => nav
    /* Design Guide is linked from each page's footer; it is not a nav item */
    .replace(/\n<a href="https:\/\/mlankster16\.github\.io\/coursera-design-guide\/"[^>]*>Design Guide ↗<\/a>/, '')
    .replace(/<(a|span)([^>]*)>([^<]+)<\/\1>/g,
      (m, tag, attrs, label) => '<' + tag + attrs + ' data-label="' + label + '">' + label + '</' + tag + '>'));
  /* main landmark: from the hero to the end of the shell */
  body = body.replace(/\n\n(<div style="padding:72px 56px)/, '\n\n<main>\n$1');
  body = body.replace(/\n<\/div>\n<\/div>\s*$/, '\n</main>\n\n</div>\n</div>\n');
  return body;
}

/* Decorative arrows are not read aloud; new-tab links say so. */
function arrows(body) {
  body = body.replace(/ ↗</g, ' <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span><');
  body = body.replace(/ (→|↓)</g, ' <span aria-hidden="true">$1</span><');
  body = body.replace(/>← /g, '><span aria-hidden="true">←</span> ');
  /* readiness-scale dots in the pathway index */
  body = body.replace(/<span style="flex:none; display:flex; gap:3px;">/g, '<span aria-hidden="true" style="flex:none; display:flex; gap:3px;">');
  return body;
}

function finder(body) {
  /* steps */
  body = body.replace(/<sc-if value="\{\{ step(\d) \}\}"[^>]*>/g, (m, n) => '<div data-step="' + n + '"' + (n === '0' ? '' : ' hidden') + '>');
  body = body.replace(/<sc-if value="\{\{ atResult \}\}"[^>]*>/, '<div data-step="4" hidden>');
  /* each step's question takes focus when the step appears */
  body = body.replace(/<p style="margin:0 0 20px; font-size:19px; font-weight:600; color:#012169;">/g,
    '<p data-step-heading="" tabindex="-1" style="margin:0 0 20px; font-size:19px; font-weight:600; color:#012169;">');
  body = body.replace(/<h3 style="margin:0 0 10px; font-family:'EB Garamond',serif; font-size:30px; color:#012169;">/,
    '<h3 data-step-heading="" tabindex="-1" style="margin:0 0 10px; font-family:\'EB Garamond\',serif; font-size:30px; color:#012169;">');
  /* choices */
  body = body.replace(/\sonClick="\{\{ (pick\w+|restart) \}\}"/g, (m, n) => ' data-pick="' + n + '"');
  /* text that swaps with state */
  body = body.replace(/>\{\{ (readiness\w+|result(?:Title|Duration|Blurb)) \}\}</g, (m, n) => ' data-text="' + n + '"><');
  body = body.replace(/href="\{\{ resultUrl \}\}"/, 'href="#" data-result-url=""');
  return body;
}

function faq(body) {
  /* trigger rows -> heading + real button */
  body = body.replace(
    /<div onClick="\{\{ tf(\d+) \}\}" onKeyDown="\{\{ tkf\d+ \}\}" role="button" tabindex="0" aria-expanded="\{\{ af\d+ \}\}" style="([^"]*)"( class="[^"]*")>\n <p style="([^"]*)">([\s\S]*?)<\/p>\n <span style="([^"]*)">\{\{ sf\d+ \}\}<\/span>\n<\/div>/g,
    (m, n, style, cls, pStyle, q, signStyle) =>
      '<h3 style="margin:0; font-size:inherit; font-weight:inherit;">' +
      '<button type="button" data-faq="' + n + '" aria-expanded="false" aria-controls="faq-' + n + '" id="faq-q-' + n + '"' + cls +
      ' style="' + style + ' width:100%; border:0; background:none; font:inherit; text-align:left; color:inherit;">\n' +
      ' <span style="display:block; ' + pStyle + '">' + q + '</span>\n' +
      ' <span aria-hidden="true" data-faq-sign="" style="' + signStyle + '">+</span>\n' +
      '</button></h3>');
  body = body.replace(/<sc-if value="\{\{ f(\d+) \}\}"[^>]*>/g,
    (m, n) => '<div id="faq-' + n + '" role="region" aria-labelledby="faq-q-' + n + '" data-faq-panel="" hidden>');
  return body;
}

async function flatten(page) {
  const s = await readFile(path.join(SRC, page.src), 'utf8');
  let body = s.slice(s.indexOf('<x-dc>') + 6, s.lastIndexOf('</x-dc>'));

  /* helmet -> head */
  const hs = body.indexOf('<helmet>'), he = body.indexOf('</helmet>');
  const helmet = body.slice(hs + 8, he);
  body = body.slice(he + 9);
  const links = [...helmet.matchAll(/<link [^>]*>/g)].map(m => m[0]).join('\n');
  const style = helmet.slice(helmet.indexOf('<style>') + 7, helmet.lastIndexOf('</style>')).trimEnd();

  body = hoverClasses(body);
  if (page.slug === 'find-your-pathway') {
    body = finder(body); body = faq(body);
    /* The design source has the footer 24px under the last FAQ hairline, so the
       two rules nearly touch and the page reads as clipped. Match Home's 64px.
       No-op once the source is corrected. */
    body = body.replace(/(justify-content:space-between; )margin:24px 56px 56px;( padding-top:40px;)/, '$1margin:64px 56px 56px;$2');
  }
  body = body.replace(/\s(hint-[\w-]+)="[^"]*"/g, '');
  body = body.replace(/<\/sc-if>/g, '</div>');
  body = body.replace(/href="([\w-]+)\.dc\.html(#[\w-]*)?"/g, (m, f, h) => 'href="' + f + '.html' + (h || '') + '"');
  body = header(body);
  body = arrows(body);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${DESCRIPTION}">
${links}
<link rel="stylesheet" href="site.css">
<style>
${style}
</style>
</head>
<body>
${body.trim()}
<script src="site.js"></script>
</body>
</html>
`;
}

/* ---- assertions ---- */
function check(slug, html, all) {
  const problems = [];
  for (const [label, re] of [
    ['style-hover', /style-(hover|focus|active)=/], ['template hole', /\{\{/], ['sc-if', /<\/?sc-if/],
    ['helmet', /<\/?helmet/], ['.dc.html link', /\.dc\.html/], ['support.js', /support\.js/],
    ['design-tool event', /\son[A-Z]\w+=/], ['role="button"', /role="button"/],
  ]) if (re.test(html)) problems.push('contains ' + label);

  const ids = (h) => new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(href) || href === '#' || !/^([\w-]+\.html)?(#|$)/.test(href)) continue;
    const [file, hash] = href.split('#');
    const target = file ? file.replace(/\.html$/, '') : slug;
    if (file && !all[target]) { problems.push('broken link ' + href); continue; }
    if (hash && !ids(all[target]).has(hash)) problems.push('missing anchor ' + href);
  }
  if (slug === 'find-your-pathway') {
    const n = (html.match(/data-faq="/g) || []).length;
    if (n !== 15) problems.push('FAQ triggers: expected 15, found ' + n);
    if ((html.match(/data-faq-panel=""/g) || []).length !== 15) problems.push('FAQ panels: expected 15');
    for (const p of ['pickSpecialization', 'pickCourse', 'pickReadyA', 'pickReadyB', 'pickReadyC', 'pickReadyD',
      'pickComplexYes', 'pickComplexNo', 'pickFamiliarYes', 'pickFamiliarNo', 'restart'])
      if (!html.includes('data-pick="' + p + '"')) problems.push('finder missing ' + p);
  }
  for (const [, c] of html.matchAll(/\sclass="([^"]+)"/g))
    for (const k of c.split(/\s+/)) if (!/^h\d+$/.test(k) && k !== 'sr-only') problems.push('unknown class ' + k);
  if (problems.length) throw new Error(slug + ':\n  ' + problems.join('\n  '));
}

/* ---- run ---- */
const out = {};
for (const p of PAGES) out[p.slug] = await flatten(p);
for (const p of PAGES) check(p.slug, out[p.slug], out);

for (const p of PAGES) await writeFile(path.join(OUT, p.slug + '.html'), out[p.slug]);

/* site.css: hand-written preamble kept, hover block regenerated */
const cssPath = path.join(OUT, 'site.css');
const MARK = '/* --- Hover states (generated by tools/build.mjs) --- */';
const css = await readFile(cssPath, 'utf8');
const preamble = css.includes(MARK) ? css.slice(0, css.indexOf(MARK)) : css + '\n';
let rules = '';
order.forEach((key, i) => {
  const [state, decl] = key.split('|');
  const sel = state === 'focus' ? ':focus-visible' : ':' + state;
  const props = decl.split(';').map(d => d.trim()).filter(Boolean)
    .map(d => '  ' + d.replace(/:\s*/, ': ') + ' !important;').join('\n');
  rules += '.h' + (i + 1) + sel + ' {\n' + props + '\n}\n\n';
});
await writeFile(cssPath, preamble + MARK + '\n\n' + rules.trimEnd() + '\n');

await mkdir(path.join(OUT, 'assets'), { recursive: true });
await copyFile(path.join(SRC, 'assets/ctl-logo-white.png'), path.join(OUT, 'assets/ctl-logo-white.png'));
if (!existsSync(path.join(OUT, '.nojekyll'))) await writeFile(path.join(OUT, '.nojekyll'), '');

console.log('wrote', PAGES.map(p => p.slug + '.html').join(' '));
console.log('hover classes:', order.length);
console.log('checks passed for all four pages');
