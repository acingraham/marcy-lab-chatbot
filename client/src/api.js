export async function sendChatStream(message, handlers) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      if (!raw.startsWith('data: ')) continue;
      let event;
      try {
        event = JSON.parse(raw.slice(6));
      } catch {
        continue;
      }
      switch (event.type) {
        case 'sources':
          handlers.onSources?.(event.sources);
          break;
        case 'refused':
          handlers.onRefused?.();
          break;
        case 'token':
          handlers.onToken?.(event.content);
          break;
        case 'done':
          handlers.onDone?.();
          break;
        case 'error':
          throw new Error(event.message || 'Stream error');
      }
    }
  }
}
