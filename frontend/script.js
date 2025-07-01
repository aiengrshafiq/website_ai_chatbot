// /frontend/script.js - FINAL DEBUG VERSION

document.addEventListener('DOMContentLoaded', () => {
    console.log("Step 1: DOM Content Loaded. Starting chatbot setup.");

    // This function contains all the chatbot's interactive logic.
    function initChatbot() {
        console.log("Step 4: initChatbot() has been called.");

        const chatBubble = document.getElementById('chat-bubble');
        const chatWindow = document.getElementById('chat-window');
        // ... (the rest of your variables)

        if (chatBubble && chatWindow) {
            console.log("Step 5: Chat bubble and window elements found successfully.");
            chatBubble.addEventListener('click', () => {
                console.log("Bubble clicked! Toggling window.");
                chatWindow.classList.toggle('hidden');
                if (!chatWindow.classList.contains('hidden')) {
                    setTimeout(() => document.getElementById('chat-input').focus(), 100);
                }
            });
            document.getElementById('close-btn').addEventListener('click', () => {
                 console.log("Close button clicked! Toggling window.");
                 chatWindow.classList.toggle('hidden');
            });
        } else {
            console.error("FATAL ERROR: Chat bubble or window element was not found in the DOM.");
            return; // Stop execution if UI elements aren't found
        }
        
        // --- The rest of your working chat logic ---
        const chatBody = document.getElementById('chat-body');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        let chatHistory = [];
        const API_BASE_URL = 'https://6t3mediachatbot-d6hvfrg5gah4djcd.uaenorth-01.azurewebsites.net';

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
                scrollToBottom();
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let botReply = '';
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    botReply += chunk;
                    botMessageElement.innerHTML = addMessageToUI(botReply, 'bot', true);
                    scrollToBottom();
                }
                chatHistory.push({ role: 'assistant', content: botReply });
            } catch (error) {
                console.error('Error fetching bot response:', error);
                removeTypingIndicator();
                addMessageToUI("I'm having trouble connecting right now. Please try again later.", 'bot', false);
            }
        }

        function addMessageToUI(message, sender, isStreaming = false) {
            let content = message;
            if (sender === 'bot' && typeof marked !== 'undefined') {
                content = marked.parse(message);
            }
            if (isStreaming) return content;
            const messageElement = document.createElement('div');
            messageElement.className = `message ${sender}`;
            if (sender === 'bot') {
                messageElement.innerHTML = content;
            } else {
                messageElement.textContent = content;
            }
            chatBody.appendChild(messageElement);
            if (!isStreaming) scrollToBottom();
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

    // --- CORRECTED SETUP BLOCK ---

    // 1. Inject CSS and HTML first
    console.log("Step 2: Injecting CSS and HTML into the page.");
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://6t3mediachatbot-d6hvfrg5gah4djcd.uaenorth-01.azurewebsites.net/static/style.css';
    document.head.appendChild(cssLink);

    const chatWidgetContainer = document.createElement('div');
    chatWidgetContainer.id = 'chat-widget-container';
    chatWidgetContainer.innerHTML = `
        <div id="chat-bubble">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        </div>
        <div id="chat-window" class="hidden">
            <div class="chat-header"><h3>AI Assistant</h3><button id="close-btn">&times;</button></div>
            <div id="chat-body"><div class="message bot">Hello! How can I help you today?</div></div>
            <div id="chat-input-container">
                 <form id="chat-form"><input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off" required><button type="submit" id="send-btn" aria-label="Send"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button></form>
            </div>
        </div>
    `;
    document.body.appendChild(chatWidgetContainer);

    // 2. Load the Markdown library and initialize the chatbot logic in the callbacks.
    console.log("Step 3: Loading external marked.js library. Waiting for onload or onerror...");
    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    
    markedScript.onload = () => {
        console.log("marked.js loaded successfully.");
        initChatbot(); // Initialize after the library is ready
    };
    
    markedScript.onerror = () => {
        console.warn('marked.js failed to load. Using plain text fallback.');
        window.marked = { parse: (text) => text }; // Create a fallback object
        initChatbot(); // Initialize even if the library fails
    };

    document.head.appendChild(markedScript);
});