import { toGitbookUrl } from '../lib/docs.js';

function groupBySource(sources) {
  const order = [];
  const grouped = new Map();
  for (const s of sources) {
    if (!grouped.has(s.source_path)) {
      grouped.set(s.source_path, {
        source_path: s.source_path,
        title: s.title,
        topSimilarity: s.similarity,
        headings: [],
      });
      order.push(s.source_path);
    }
    const g = grouped.get(s.source_path);
    if (s.heading && !g.headings.includes(s.heading)) {
      g.headings.push(s.heading);
    }
    if (s.similarity > g.topSimilarity) {
      g.topSimilarity = s.similarity;
    }
  }
  return order.map((p) => grouped.get(p));
}

export default function Sources({ sources }) {
  if (!sources?.length) return null;
  const groups = groupBySource(sources);
  const label =
    groups.length === 1 ? 'Related Chapter' : `Related Chapters (${groups.length})`;
  return (
    <details className="sources">
      <summary>{label}</summary>
      <ul>
        {groups.map((g) => (
          <li key={g.source_path} className="sources__chapter">
            <div className="sources__chapter-row">
              <span className="similarity">{(g.topSimilarity * 100).toFixed(0)}%</span>
              <a
                className="sources__title"
                href={toGitbookUrl(g.source_path)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {g.title || g.source_path.replace(/\.md$/i, '')}
              </a>
              <span className="sources__path">
                {g.source_path.replace(/\.md$/i, '')}
              </span>
            </div>
            {g.headings.length > 0 ? (
              <ul className="sources__headings">
                {g.headings.map((h, i) => (
                  <li key={i}>
                    <a
                      href={toGitbookUrl(g.source_path, h)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {h}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
