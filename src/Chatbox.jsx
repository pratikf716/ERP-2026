import React, { useState, useRef, useEffect } from 'react';
import './Chatbox.css';

// BACKEND URL
const API_BASE_URL = 'https://gptbot-api.onrender.com';

// fetch with AbortController timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 6000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const Chatbox = () => {
  const [messages, setMessages] = useState(() =>
    JSON.parse(localStorage.getItem('chatbot_messages') || '[]')
  );
  const [inputMessage, setInputMessage]   = useState('');
  const [connectionStatus, setStatus]     = useState('checking'); // checking | connected | disconnected
  const [isOpen, setIsOpen]               = useState(false); // Start closed by default
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const messagesEndRef                    = useRef(null);
  const textareaRef                       = useRef(null);

  // ── ONE-TIME health check ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchWithTimeout(`${API_BASE_URL}/`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 6000,
        });
        if (r.ok) {
          const data = await r.json();
          if (data.status === 'GPTBot API is running') {
            setStatus('connected');     // SUCCESS
            setError(null);
            return;
          }
        }
        throw new Error('Unexpected health response');
      } catch (err) {
        setStatus('disconnected');      // FAIL → manual connect
        setError(
          err.name === 'AbortError'
            ? 'Initial connection timed out.'
            : `Initial connection failed: ${err.message}`
        );
      }
    })();
  }, []); // empty dependency → runs exactly once

  // save & autoscroll
  useEffect(() => localStorage.setItem('chatbot_messages', JSON.stringify(messages)), [messages]);
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputMessage]);

  // manual (re)connect
  const handleManualConnect = async () => {
    setError(null);
    setStatus('checking');
    try {
      const r = await fetchWithTimeout(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 6000,
      });
      if (r.ok && (await r.json()).status === 'GPTBot API is running') {
        setStatus('connected');
        setError(null);
      } else throw new Error('Health check failed');
    } catch (err) {
      setStatus('disconnected');
      setError(err.name === 'AbortError' ? 'Connection timed out.' : err.message);
    }
  };

  // send chat
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || connectionStatus !== 'connected') return;

    const userMsg = { text: inputMessage, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    const payload = { client_id: 'clienta', message: inputMessage };
    setInputMessage('');
    setIsLoading(true);
    try {
      const r = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 15000,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const botReply =
        data.response || data.error || 'No response from server. Please try again.';
      setMessages(prev => [...prev, { text: botReply, sender: 'bot', timestamp: new Date().toISOString() }]);
      setStatus('connected');
    } catch (err) {
      const msg =
        err.name === 'AbortError'
          ? 'Message timed out (server may be waking up).'
          : err.message;
      setMessages(prev => [...prev, { text: `❌ Error: ${msg}`, sender: 'bot', timestamp: new Date().toISOString(), isError: true }]);
      setError(msg);
      setStatus('disconnected');   // require manual reconnect next time
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatbot_messages');
    }
  };

  const timeFmt = ts =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  // ── UI ───────────────────────────────────────────────────
  return (
    <>
      {/* Chatbot icon when closed */}
      {!isOpen && (
        <div 
          className="chatbot-icon-closed"
          onClick={() => setIsOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open chatbot"
        >
          <div className="chatbot-icon">🤖</div>
          {connectionStatus === 'connected' && <div className="status-indicator connected" />}
          {connectionStatus === 'disconnected' && <div className="status-indicator disconnected" />}
          {connectionStatus === 'checking' && <div className="status-indicator checking" />}
        </div>
      )}

      {/* Main chatbot container */}
      <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
        <div
          className="chatbot-header"
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          aria-label="Toggle chatbot"
        >
          <div className="chatbot-title">
            <div className="chatbot-icon">🤖</div>
            <h3>Customer Support</h3>
            <div className={`connection-status ${connectionStatus}`}>
              <div className="status-indicator" />
              <span>
                {connectionStatus === 'connected'
                  ? '🟢 Online'
                  : connectionStatus === 'disconnected'
                  ? '🔴 Offline'
                  : '🟡 Checking...'}
              </span>
            </div>
          </div>

          {isOpen && (
            <button
              className="clear-button"
              onClick={e => {
                e.stopPropagation();
                clearChat();
              }}
              title="Clear chat"
            >
              🗑️
            </button>
          )}
        </div>

        {/* manual connect prompt */}
        {isOpen && connectionStatus === 'disconnected' && (
          <div className="connection-retry">
            <button onClick={handleManualConnect}>Connect</button>
          </div>
        )}

        {/* chat area */}
        {isOpen && connectionStatus === 'connected' && (
          <div className="chatbot-content">
            <div className="chatbot-messages">
              {messages.length === 0 ? (
                <div className="welcome-message">
                  <div className="welcome-icon">👋</div>
                  <h3>Hello! I'm your AI assistant</h3>
                  <p>Powered by FastAPI + OpenAI</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={`${m.timestamp}-${i}`}
                    className={`message ${m.sender} ${m.isError ? 'error' : ''}`}
                  >
                    <div className="message-header">
                      <span className="sender-label">{m.sender === 'user' ? 'You' : 'Assistant'}</span>
                      <span className="message-time">{timeFmt(m.timestamp)}</span>
                    </div>
                    <div className="message-content">
                      {m.text.split('\n').map((line, j) => (
                        <p key={j}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="message bot">
                  <div className="message-content loading">
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* input */}
            <div className="chatbot-input-area">
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                  <button onClick={handleManualConnect}>Reconnect</button>
                </div>
              )}
              <div className="chatbot-input">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message…"
                  rows={1}
                  disabled={isLoading || connectionStatus !== 'connected'}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim() || connectionStatus !== 'connected'}
                  className={isLoading ? 'loading' : ''}
                >
                  {isLoading ? <span className="spinner" /> : '➤'}
                </button>
              </div>
              <div className="input-hint">Enter to send • Shift+Enter for newline</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Chatbox;