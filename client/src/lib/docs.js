const GITBOOK_BASE = 'https://marcylabschool.gitbook.io/marcy-lab-school-docs';

function chapterPath(sourcePath) {
  if (!sourcePath) return '';
  const noExt = sourcePath.replace(/\.md$/i, '');
  if (!noExt || noExt === 'README') return '';
  if (noExt.endsWith('/README')) return noExt.slice(0, -'/README'.length);
  return noExt;
}

export function headingSlug(heading) {
  if (!heading) return '';
  // Chunker stores nested headings as "Parent > Child". GitBook anchors are
  // generated per heading, so target the leaf.
  const leaf = heading.split(' > ').pop().trim();
  return leaf
    .toLowerCase()
    .replace(/[`'"]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toGitbookUrl(sourcePath, heading) {
  const path = chapterPath(sourcePath);
  const url = path ? `${GITBOOK_BASE}/${path}` : GITBOOK_BASE;
  if (!heading) return url;
  const slug = headingSlug(heading);
  return slug ? `${url}#${slug}` : url;
}
