const GITBOOK_BASE = 'https://marcylabschool.gitbook.io/marcy-lab-school-docs';

export function toGitbookUrl(sourcePath) {
  if (!sourcePath) return GITBOOK_BASE;
  const noExt = sourcePath.replace(/\.md$/i, '');
  if (!noExt || noExt === 'README') return GITBOOK_BASE;
  if (noExt.endsWith('/README')) {
    return `${GITBOOK_BASE}/${noExt.slice(0, -'/README'.length)}`;
  }
  return `${GITBOOK_BASE}/${noExt}`;
}
