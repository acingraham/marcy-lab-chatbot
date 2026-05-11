export default function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <details className="sources">
      <summary>Sources ({sources.length})</summary>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            <span className="similarity">{(s.similarity * 100).toFixed(0)}%</span>{' '}
            <code>{s.source_path}</code>
            {s.heading ? <> &rsaquo; {s.heading}</> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
