import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import Sources from './Sources.jsx';

export default function ChatMessage({ message, onFollowUp }) {
  const { role, content, sources, refused, followUps } = message;
  return (
    <div className={`message message--${role} ${refused ? 'message--refused' : ''}`}>
      <div className="message__role">{role === 'user' ? 'You' : 'Assistant'}</div>
      <div className="message__content">
        {role === 'user' ? (
          content
        ) : (
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
        )}
      </div>
      {role === 'assistant' && !refused ? <Sources sources={sources} /> : null}
      {role === 'assistant' && !refused && followUps?.length ? (
        <div className="follow-ups">
          <div className="follow-ups__label">Try a follow-up:</div>
          <div className="follow-ups__list">
            {followUps.map((q, i) => (
              <button
                key={i}
                type="button"
                className="follow-up"
                onClick={() => onFollowUp?.(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
