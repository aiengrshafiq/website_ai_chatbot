// /frontend/script.js - FINAL ROBUST VERSION

document.addEventListener('DOMContentLoaded', () => {

    // --- This function will now contain all the chatbot's logic ---
    function initChatbot() {
        // --- DOM Element References (now they are guaranteed to exist) ---
        const chatBubble = document.getElementById('chat-bubble');
        const chatWindow = document.getElementById('chat-window');
        const closeBtn = document.getElementById('close-btn');
        const chatBody = document.getElementById('chat-body');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        // --- State Management ---
        let chatHistory = [];
        const API_BASE_URL = 'https://6t3mediachatbot-d6hvfrg5gah4djcd.uaenorth-01.azurewebsites.net';

        // --- UI Event Listeners ---
        chatBubble.addEventListener('click', () => toggleChatWindow());
        closeBtn.addEventListener('click', () => toggleChatWindow());

        // --- Main Logic ---
        function toggleChatWindow() {
            chatWindow.classList.toggle('hidden');
            if (!chatWindow.classList.contains('hidden')) {
                setTimeout(() => chatInput.focus(), 100);
            }
        }

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (userMessage && !sendBtn.disabled) {
                handleUserMessage(userMessage);
            }
        });

        function handleUserMessage(message) {
            addMessageToUI(message, 'user');
            chatHistory.push({ role: 'user', content: message });
            chatInput.value = '';
            showTypingIndicator();
            getBotResponse();
        }

        async function getBotResponse() {
            const payload = {
                message: chatHistory[chatHistory.length - 1].content,
                history: chatHistory.slice(0, -1)
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Network response was not ok.');

                removeTypingIndicator();

                const botMessageElement = document.createElement('div');
                botMessageElement.className = 'message bot';
                chatBody.appendChild(botMessageElement);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let botReply = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    botReply += chunk;
                    botMessageElement.innerHTML = marked.parse(botReply);
                    scrollToBottom();
                }
                chatHistory.push({ role: 'assistant', content: botReply });
            } catch (error) {
                console.error('Error fetching bot response:', error);
                removeTypingIndicator();
                addMessageToUI("I'm having trouble connecting right now. Please try again later.", 'bot');
            }
        }

        function addMessageToUI(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${sender}`;
            if (sender === 'bot') {
                messageElement.innerHTML = marked.parse(message);
            } else {
                messageElement.textContent = message;
            }
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
    }


    // --- This is the new setup block at the bottom ---
    // It creates the elements first, then calls initChatbot()

    // 1. Inject the CSS file
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://6t3mediachatbot-d6hvfrg5gah4djcd.uaenorth-01.azurewebsites.net/static/style.css';
    document.head.appendChild(cssLink);

    // 2. Create the HTML for the widget
    const chatWidgetContainer = document.createElement('div');
    chatWidgetContainer.id = 'chat-widget-container';
    chatWidgetContainer.innerHTML = `
        <div id="chat-bubble">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
        </div>
        <div id="chat-window" class="hidden">
            <div class="chat-header">
                <h3>AI Assistant</h3>
                <button id="close-btn">&times;</button>
            </div>
            <div id="chat-body">
                <div class="message bot">Hello! How can I help you today?</div>
            </div>
            <div id="chat-input-container">
                <form id="chat-form">
                    <input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off" required>
                    <button type="submit" id="send-btn" aria-label="Send">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(chatWidgetContainer);

    // 3. Add the Markdown library, then initialize the chatbot
    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    markedScript.onload = () => {
        // IMPORTANT: Call initChatbot() only AFTER marked.js has loaded.
        initChatbot();
    };
    document.head.appendChild(markedScript);

});