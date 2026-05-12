import { toGitbookUrl } from '../lib/docs.js';

function groupBySource(sources) {
  const order = [];
  const grouped = new Map();
  for (const s of sources) {
    if (!grouped.has(s.source_path)) {
      grouped.set(s.source_path, {
        source_path: s.source_path,
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
          <li key={g.source_path}>
            <span className="similarity">{(g.topSimilarity * 100).toFixed(0)}%</span>{' '}
            <a
              href={toGitbookUrl(g.source_path)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <code>{g.source_path}</code>
            </a>
            {g.headings.length > 0 ? (
              <ul className="sources__headings">
                {g.headings.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
