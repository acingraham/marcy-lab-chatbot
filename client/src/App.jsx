import { useEffect, useRef, useState } from 'react';
import ChatMessage from './components/ChatMessage.jsx';
import AdminView from './components/AdminView.jsx';
import { sendChatStream } from './api.js';

const SUGGESTIONS = [
  'What is React Context?',
  'How do I write a SQL JOIN?',
  "What's the difference between let and var?",
  'Explain promises',
];

const STORAGE_KEY = 'marcy-chat-messages-v1';
const HISTORY_TURNS = 6;

function loadStoredMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
    return <AdminView />;
  }
  return <ChatApp />;
}

function ChatApp() {
  const [messages, setMessages] = useState(loadStoredMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Quota exceeded or storage disabled; ignore.
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function clearConversation() {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function submit(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput('');

    const history = messages
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    try {
      await sendChatStream(
        trimmed,
        {
          onSources: (sources) => {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: '', sources, refused: false },
            ]);
          },
          onRefused: () => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, refused: true };
              }
              return next;
            });
          },
          onToken: (token) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + token };
              }
              return next;
            });
          },
          onFollowUps: (questions) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, followUps: questions };
              }
              return next;
            });
          },
        },
        history,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div>
            <h1>Marcy Lab Study Assistant</h1>
            <p>Ask anything covered by the Marcy curriculum.</p>
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              className="header-action"
              onClick={clearConversation}
              disabled={loading}
            >
              New chat
            </button>
          ) : null}
        </div>
      </header>

      <main className="app__main">
        {messages.length === 0 ? (
          <div className="suggestions">
            <p>Try one of these:</p>
            <div className="suggestions__list">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion" onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} onFollowUp={submit} />
        ))}

        {loading && messages[messages.length - 1]?.role === 'user' ? (
          <div className="message message--assistant">
            <div className="message__role">Assistant</div>
            <div className="message__content typing">Thinking…</div>
          </div>
        ) : null}

        {error ? <div className="error">{error}</div> : null}
        <div ref={scrollRef} />
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the curriculum…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
