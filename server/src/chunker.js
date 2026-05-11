import fs from 'node:fs';
import path from 'node:path';

const MAX_TOKENS = 900;
const MIN_TOKENS = 40;

export const approxTokens = (text) => Math.ceil(text.length / 4);

function stripFrontmatter(content) {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  return end === -1 ? content : content.slice(end + 5);
}

function stripGitbookSyntax(content) {
  return content
    .replace(/\{%\s*hint[^%]*%\}([\s\S]*?)\{%\s*endhint\s*%\}/g, '$1')
    .replace(/\{%\s*tabs?\s*%\}[\s\S]*?\{%\s*endtabs?\s*%\}/g, '')
    .replace(/\{%[\s\S]*?%\}/g, '');
}

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function splitByHeading(content, level) {
  const marker = '#'.repeat(level);
  const pattern = new RegExp(`^${marker}\\s+(.+)$`, 'gm');
  const matches = [...content.matchAll(pattern)];

  if (matches.length === 0) {
    return [{ heading: null, content: content.trim() }];
  }

  const sections = [];
  if (matches[0].index > 0) {
    sections.push({ heading: null, content: content.slice(0, matches[0].index).trim() });
  }
  matches.forEach((m, i) => {
    const start = m.index;
    const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
    sections.push({ heading: m[1].trim(), content: content.slice(start, end).trim() });
  });
  return sections.filter((s) => s.content);
}

function splitLongSection(section, parentHeading) {
  const headingPath = [parentHeading, section.heading].filter(Boolean).join(' > ');

  if (approxTokens(section.content) <= MAX_TOKENS) {
    return [{ heading: headingPath, content: section.content }];
  }

  const subs = splitByHeading(section.content, 3);
  if (subs.length > 1) {
    return subs.flatMap((sub) => splitLongSection(sub, headingPath));
  }

  const paragraphs = section.content.split(/\n\n+/);
  const out = [];
  let buffer = '';
  for (const para of paragraphs) {
    const next = buffer ? `${buffer}\n\n${para}` : para;
    if (approxTokens(next) > MAX_TOKENS && buffer) {
      out.push({ heading: headingPath, content: buffer.trim() });
      buffer = para;
    } else {
      buffer = next;
    }
  }
  if (buffer.trim()) out.push({ heading: headingPath, content: buffer.trim() });
  return out;
}

export function chunkMarkdown(rawContent, sourcePath) {
  const stripped = stripGitbookSyntax(stripFrontmatter(rawContent));
  const title = extractTitle(stripped, path.basename(sourcePath, '.md'));

  const topSections = splitByHeading(stripped, 2);
  const rawChunks = topSections.flatMap((s) => splitLongSection(s, null));

  return rawChunks
    .filter((c) => approxTokens(c.content) >= MIN_TOKENS)
    .map((chunk, index) => {
      const breadcrumbHeading = chunk.heading
        ? `${title} > ${chunk.heading}`
        : title;
      const breadcrumb = `Source: ${sourcePath} > ${breadcrumbHeading}\n\n`;
      return {
        source_path: sourcePath,
        title,
        heading: chunk.heading,
        chunk_index: index,
        content: breadcrumb + chunk.content,
      };
    });
}

export function chunkAllDocs(docsRoot) {
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
        return walk(full);
      }
      if (!entry.name.endsWith('.md')) return [];
      if (entry.name === 'SUMMARY.md') return [];
      return [full];
    });
  }

  const files = walk(docsRoot);
  const allChunks = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourcePath = path.relative(docsRoot, filePath);
    allChunks.push(...chunkMarkdown(content, sourcePath));
  }
  return allChunks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docsRoot = process.argv[2] || 'data/marcy-curriculum-docs';
  const chunks = chunkAllDocs(docsRoot);

  const tokens = chunks.map((c) => approxTokens(c.content)).sort((a, b) => a - b);
  const median = tokens[Math.floor(tokens.length / 2)];
  const p95 = tokens[Math.floor(tokens.length * 0.95)];

  console.log(`Files walked under: ${docsRoot}`);
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Token distribution: min=${tokens[0]} median=${median} p95=${p95} max=${tokens.at(-1)}`);
  console.log(`Chunks over MAX_TOKENS (${MAX_TOKENS}): ${tokens.filter((t) => t > MAX_TOKENS).length}`);

  const sample = chunks[Math.min(20, chunks.length - 1)];
  console.log('\n--- Sample chunk ---');
  console.log(`source_path: ${sample.source_path}`);
  console.log(`title:       ${sample.title}`);
  console.log(`heading:     ${sample.heading}`);
  console.log(`chunk_index: ${sample.chunk_index}`);
  console.log(`tokens:      ${approxTokens(sample.content)}`);
  console.log('---');
  console.log(sample.content.slice(0, 800));
  if (sample.content.length > 800) console.log('...[truncated]');
}
