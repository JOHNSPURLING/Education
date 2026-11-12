// Builds the knowledge base site from content/**/*.md.
//   node scripts/build.mjs          -> docs/index.html (GitHub Pages) + dist/staffroom-reference.html (page fragment)
//   node scripts/build.mjs --check  -> validate only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const checkOnly = process.argv.includes('--check');

const TYPES = ['topic', 'guidance', 'person', 'source'];
const STATUSES = [
  'Statutory guidance', 'Non-statutory guidance', 'Legislation', 'Inspection framework',
  'Evidence summary', 'Research and theory', 'Professional practice', 'Thinker profile',
  'Organisation or publication',
];

const categories = JSON.parse(fs.readFileSync(path.join(contentDir, 'categories.json'), 'utf8'));
const catSlugs = new Set(categories.map((c) => c.slug));

const errors = [];
const warnings = [];

marked.use({
  gfm: true,
  renderer: {
    html() { return ''; }, // raw HTML in entries is dropped
  },
});

function renderMarkdown(md) {
  let html = marked.parse(md);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
  html = html.replace(/<h1(\s[^>]*)?>/g, '<h2>').replace(/<\/h1>/g, '</h2>');
  return html;
}

function toText(html) {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

const entries = [];
for (const cat of fs.readdirSync(contentDir, { withFileTypes: true })) {
  if (!cat.isDirectory()) continue;
  if (!catSlugs.has(cat.name)) { errors.push(`content/${cat.name}/ is not a category in categories.json`); continue; }
  for (const file of fs.readdirSync(path.join(contentDir, cat.name))) {
    if (!file.endsWith('.md')) continue;
    const rel = `content/${cat.name}/${file}`;
    const raw = fs.readFileSync(path.join(contentDir, cat.name, file), 'utf8').replace(/\r\n/g, '\n');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) { errors.push(`${rel}: missing front matter`); continue; }
    let fm;
    try { fm = yaml.load(m[1]) || {}; } catch (e) { errors.push(`${rel}: front matter YAML error: ${e.message.split('\n')[0]}`); continue; }
    const slug = file.replace(/\.md$/, '');
    const entry = {
      slug,
      title: str(fm.title),
      category: cat.name,
      type: str(fm.type),
      summary: str(fm.summary),
      status: str(fm.status),
      evidence: str(fm.evidence),
      tags: Array.isArray(fm.tags) ? fm.tags.map((t) => str(t).toLowerCase()).filter(Boolean) : [],
      checked: str(fm.last_checked instanceof Date ? fm.last_checked.toISOString().slice(0, 10) : fm.last_checked),
      sources: [],
      related: Array.isArray(fm.related) ? fm.related.map(str).filter(Boolean) : [],
    };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push(`${rel}: slug must be lower-case and hyphenated`);
    if (!entry.title) errors.push(`${rel}: missing title`);
    if (!entry.summary) errors.push(`${rel}: missing summary`);
    if (!TYPES.includes(entry.type)) errors.push(`${rel}: type must be one of ${TYPES.join(', ')}`);
    if (!STATUSES.includes(entry.status)) errors.push(`${rel}: status "${entry.status}" is not in the allowed list`);
    if (fm.category && str(fm.category) !== cat.name) warnings.push(`${rel}: front matter category "${fm.category}" differs from its folder`);
    for (const s of Array.isArray(fm.sources) ? fm.sources : []) {
      if (!s || typeof s !== 'object') continue;
      const url = str(s.url);
      if (url && !/^https?:\/\//.test(url)) { warnings.push(`${rel}: dropped non-http source URL ${url}`); continue; }
      entry.sources.push({ title: str(s.title) || url, publisher: str(s.publisher), year: str(s.year), url });
    }
    if (!entry.sources.length) warnings.push(`${rel}: no sources`);
    entry.html = renderMarkdown(m[2]);
    entry.text = toText(entry.html);
    entry.words = entry.text ? entry.text.split(' ').length : 0;
    if (entry.words < 150) warnings.push(`${rel}: very short body (${entry.words} words)`);
    entries.push(entry);
  }
}

const bySlug = new Map();
for (const e of entries) {
  if (bySlug.has(e.slug)) errors.push(`duplicate slug "${e.slug}" in ${e.category} and ${bySlug.get(e.slug).category}`);
  bySlug.set(e.slug, e);
}
for (const e of entries) {
  const kept = [];
  for (const r of e.related) {
    if (r === e.slug) continue;
    if (bySlug.has(r)) { if (!kept.includes(r)) kept.push(r); } else warnings.push(`content/${e.category}/${e.slug}.md: related "${r}" does not exist (dropped)`);
  }
  e.related = kept;
}
// Internal links written as [text](slug) or [text](#slug) become hash links.
for (const e of entries) {
  e.html = e.html.replace(/<a href="#?([a-z0-9-]+)(?:\.md)?"/g, (all, s) => (bySlug.has(s) ? `<a href="#${s}"` : all));
}

entries.sort((a, b) => a.title.localeCompare(b.title, 'en'));

for (const w of warnings) console.warn('warn  ' + w);
for (const e of errors) console.error('ERROR ' + e);
const words = entries.reduce((n, e) => n + e.words, 0);
console.log(`${entries.length} entries, ${words.toLocaleString('en-GB')} words, ${warnings.length} warnings, ${errors.length} errors`);
if (errors.length) process.exit(1);
if (checkOnly) process.exit(0);

const data = {
  built: new Date().toISOString().slice(0, 10),
  categories,
  entries: entries.map(({ words: _w, ...e }) => e),
};
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/ /g, '\\u2028').replace(/ /g, '\\u2029');

const read = (f) => fs.readFileSync(path.join(root, 'site', f), 'utf8');
const head = read('head.html').replace('/*{{CSS}}*/', () => read('styles.css'));
const body = read('body.html')
  .replace('{{DATA}}', () => json)
  .replace('/*{{JS}}*/', () => read('app.js'));

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs', 'index.html'),
  `<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}</head>\n<body>\n${body}</body>\n</html>\n`,
);
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');
fs.writeFileSync(path.join(root, 'dist', 'staffroom-reference.html'), head + body);
const kb = (f) => Math.round(fs.statSync(path.join(root, f)).size / 1024);
console.log(`wrote docs/index.html (${kb('docs/index.html')} KB) and dist/staffroom-reference.html`);
