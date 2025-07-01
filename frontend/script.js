// /frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-btn');
    const chatBody = document.getElementById('chat-body');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // --- State Management ---
    let chatHistory = []; // Stores the conversation { role: 'user'/'model', content: 'message' }
    const API_BASE_URL = 'https://6t3mediachatbot-d6hvfrg5gah4djcd.uaenorth-01.azurewebsites.net'; // IMPORTANT: Replace this after deployment

    // --- UI Event Listeners ---
    chatBubble.addEventListener('click', () => toggleChatWindow());
    closeBtn.addEventListener('click', () => toggleChatWindow());

    // --- Main Logic ---
    function toggleChatWindow() {
        chatWindow.classList.toggle('hidden');
    }

    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (userMessage) {
            handleUserMessage(userMessage);
        }
    });

    // Process user message
    function handleUserMessage(message) {
        // Add user message to UI and history
        addMessageToUI(message, 'user');
        
        chatHistory.push({ role: 'user', content: message });
        chatInput.value = '';

        // Show typing indicator and get bot response
        showTypingIndicator();
        getBotResponse();
    }

    // Fetch response from the back-end API
    async function getBotResponse() {
        // Prepare the payload for the API
        const payload = {
            message: chatHistory[chatHistory.length - 1].parts[0].text, // Last user message
            history: chatHistory.slice(0, -1) // All previous history
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            const data = await response.json();
            const botReply = data.reply;

            // Add bot reply to UI and history
            removeTypingIndicator();
            addMessageToUI(botReply, 'bot');
            chatHistory.push({ role: 'assistant', content: botReply });

        } catch (error) {
            console.error('Error fetching bot response:', error);
            removeTypingIndicator();
            addMessageToUI("I'm having trouble connecting right now. Please try again later.", 'bot');
        }
    }

    // --- UI Helper Functions ---
    function addMessageToUI(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.textContent = message;
        chatBody.appendChild(messageElement);
        scrollToBottom();
    }

    let typingIndicator;
    function showTypingIndicator() {
        sendBtn.disabled = true;
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot typing';
        typingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        chatBody.appendChild(typingIndicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        sendBtn.disabled = false;
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function scrollToBottom() {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
});