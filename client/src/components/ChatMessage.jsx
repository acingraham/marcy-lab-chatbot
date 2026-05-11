import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import Sources from './Sources.jsx';

export default function ChatMessage({ message }) {
  const { role, content, sources, refused } = message;
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
    </div>
  );
}
