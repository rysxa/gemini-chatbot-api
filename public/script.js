const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

/**
 * Appends a message to the chat box.
 * @param {string} message - The message content.
 * @param {string} sender - The sender of the message ('user' or 'ai').
 */
function appendMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  // Display user's message
  appendMessage(userMessage, 'user');
  userInput.value = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json();
      throw new Error(errorData.reply || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.reply;

    // Display AI's message
    appendMessage(aiReply, 'ai');

  } catch (error) {
    console.error('Error fetching AI reply:', error);
    appendMessage(`Sorry, something went wrong: ${error.message}`, 'ai');
  }
});