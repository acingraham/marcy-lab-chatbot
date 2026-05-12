import { Fragment, useEffect, useState } from 'react';
import { toGitbookUrl } from '../lib/docs.js';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminView() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/admin/logs?limit=100')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setLogs(d.logs ?? []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="admin">
        <h1>Admin · Recent Chats</h1>
        <div className="error">Failed to load logs: {error}</div>
      </div>
    );
  }

  if (!logs) {
    return (
      <div className="admin">
        <h1>Admin · Recent Chats</h1>
        <p>Loading…</p>
      </div>
    );
  }

  const total = logs.length;
  const refused = logs.filter((l) => l.was_refused).length;
  const refusedPct = total ? Math.round((refused / total) * 100) : 0;
  const avgLatency =
    total > 0
      ? Math.round(
          logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / total,
        )
      : 0;

  return (
    <div className="admin">
      <header className="admin__header">
        <h1>Admin · Recent Chats</h1>
        <p>
          Showing {total} most recent · {refused} refused ({refusedPct}%) ·
          avg latency {avgLatency}ms
        </p>
        <a className="admin__back" href="/">
          ← Back to chat
        </a>
      </header>

      <table className="admin__table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Query</th>
            <th>Top source</th>
            <th>Top sim</th>
            <th>Latency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const sources = Array.isArray(log.retrieved_sources)
              ? log.retrieved_sources
              : [];
            const top = sources[0];
            const isOpen = expanded === log.id;
            return (
              <Fragment key={log.id}>
                <tr
                  className={`admin__row ${log.was_refused ? 'admin__row--refused' : ''}`}
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                >
                  <td className="admin__time">{formatTime(log.created_at)}</td>
                  <td className="admin__query">{log.query}</td>
                  <td className="admin__src">
                    {top ? (
                      <code>{top.source_path}</code>
                    ) : (
                      <span className="admin__muted">—</span>
                    )}
                  </td>
                  <td className="admin__sim">
                    {top ? `${(top.similarity * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td>{log.latency_ms}ms</td>
                  <td>
                    {log.was_refused ? (
                      <span className="admin__badge admin__badge--refused">
                        REFUSED
                      </span>
                    ) : (
                      <span className="admin__badge">answered</span>
                    )}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="admin__detail-row">
                    <td colSpan={6}>
                      <div className="admin__detail">
                        <div>
                          <div className="admin__detail-label">Response</div>
                          <pre className="admin__response">{log.response}</pre>
                        </div>
                        <div>
                          <div className="admin__detail-label">
                            Retrieved sources
                          </div>
                          <ol className="admin__source-list">
                            {sources.map((s, i) => (
                              <li key={i}>
                                <span className="admin__sim-inline">
                                  {(s.similarity * 100).toFixed(0)}%
                                </span>{' '}
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
                          </ol>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
