import { toGitbookUrl } from '../lib/docs.js';

export default function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <details className="sources">
      <summary>Related Chapters ({sources.length})</summary>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            <span className="similarity">{(s.similarity * 100).toFixed(0)}%</span>{' '}
            <a
              href={toGitbookUrl(s.source_path)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <code>{s.source_path}</code>
            </a>
            {s.heading ? <> &rsaquo; {s.heading}</> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
