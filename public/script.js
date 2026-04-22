const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Generate a session ID for this browser tab
const sessionId = 'session_' + Math.random().toString(36).slice(2);

/**
 * Format current time as HH:MM
 */
function getTime() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Remove welcome message on first interaction
 */
function removeWelcome() {
  const welcome = chatBox.querySelector('.welcome-message');
  if (welcome) welcome.remove();
}

/**
 * Convert basic markdown to HTML
 */
function parseMarkdown(text) {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Newlines to <br>
    .replace(/\n/g, '<br>');
}

/**
 * Appends a message bubble to the chat box.
 */
function appendMessage(message, sender) {
  removeWelcome();

  const wrapper = document.createElement('div');
  wrapper.classList.add('message', sender);

  const content = document.createElement('div');
  content.classList.add('message-content');

  if (sender === 'ai') {
    content.innerHTML = parseMarkdown(message);
  } else {
    content.textContent = message;
  }

  const time = document.createElement('span');
  time.classList.add('message-time');
  time.textContent = getTime();

  wrapper.appendChild(content);
  wrapper.appendChild(time);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  return wrapper;
}

/**
 * Show animated typing indicator
 */
function showTyping() {
  removeWelcome();

  const wrapper = document.createElement('div');
  wrapper.classList.add('message', 'ai', 'typing-indicator');

  const content = document.createElement('div');
  content.classList.add('message-content');

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.classList.add('typing-dot');
    content.appendChild(dot);
  }

  wrapper.appendChild(content);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  return wrapper;
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage(userMessage, 'user');
  userInput.value = '';

  const typingEl = showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, sessionId }),
    });

    typingEl.remove();

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.reply || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    appendMessage(data.reply, 'ai');

  } catch (error) {
    typingEl.remove();
    console.error('Error fetching AI reply:', error);
    appendMessage('Aduh, aku lagi ada gangguan teknis nih 😅 Coba lagi sebentar ya!', 'ai');
  }
});
