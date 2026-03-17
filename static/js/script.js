document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const clearChatBtn = document.getElementById('clear-chat');
    const typingIndicator = document.getElementById('typing-indicator');
    const micBtn = document.getElementById('mic-btn');
    const sendBtn = document.getElementById('send-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Configure Marked.js options
    marked.setOptions({
        breaks: true, // Convert \n to <br>
        gfm: true, // Github Flavored Markdown
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });

    // Theme Management
    function initTheme() {
        const savedTheme = localStorage.getItem('frog-theme') || 'dark';
        htmlElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('frog-theme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun'; // Show sun to switch to light
        } else {
            icon.className = 'fas fa-moon'; // Show moon to switch to dark
        }
    }

    themeToggleBtn.addEventListener('click', toggleTheme);
    initTheme(); // Initialize on load

    // Enable/Disable Send button
    userInput.addEventListener('input', function() {
        sendBtn.disabled = this.value.trim().length === 0;
    });

    // Add welcome message logic
    const welcomeMessageContainer = document.getElementById('welcome-message-dom');
    function ensureWelcomeMessageVisible() {
        // If there are no .message-wrapper elements, make sure welcome is visible
        const messages = chatHistory.querySelectorAll('.message-wrapper');
        if (messages.length === 0 && welcomeMessageContainer) {
            welcomeMessageContainer.style.display = 'block';
        } else if (messages.length > 0 && welcomeMessageContainer) {
            welcomeMessageContainer.style.display = 'none';
        }
    }

    // Handle suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(button => {
        button.addEventListener('click', function() {
            const text = this.querySelector('span').textContent;
            userInput.value = text;
            sendBtn.disabled = false;
            userInput.focus();
        });
    });

    // Speech recognition handling
    const isSpeechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (!isSpeechRecognitionSupported) {
        micBtn.style.display = 'none';
    } else {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        micBtn.addEventListener('click', function() {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
                micBtn.classList.remove('recording');
            } else {
                recognition.start();
                micBtn.classList.add('recording');
                userInput.placeholder = "Listening...";
            }
        });
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendBtn.disabled = false;
            micBtn.classList.remove('recording');
            userInput.placeholder = "Message Frog AI...";
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            micBtn.classList.remove('recording');
            userInput.placeholder = "Message Frog AI...";
        };

        recognition.onend = function() {
            micBtn.classList.remove('recording');
            userInput.placeholder = "Message Frog AI...";
        }
    }
    
    // Handle form submission
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        
        if (message) {
            // Disable button immediately to prevent double submits
            sendBtn.disabled = true;
            addMessageToChat('user', message);
            userInput.value = '';
            
            showTypingIndicator();
            
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                
                if (data.error) throw new Error(data.error);
                
                hideTypingIndicator();
                addMessageToChat('assistant', data.response);
                
            } catch (error) {
                hideTypingIndicator();
                addMessageToChat('assistant', `**Error:** Details below:\n\`\`\`text\n${error.message}\n\`\`\``);
                console.error('Error:', error);
            }
        }
    });

    // Clear Chat Logic
    clearChatBtn.addEventListener('click', async function() {
        // Visual feedback
        clearChatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
        
        try {
            const response = await fetch('/clear', { method: 'POST' });
            const data = await response.json();
            
            if (data.status) {
                // Remove all specific message divs
                const messages = chatHistory.querySelectorAll('.message-wrapper');
                messages.forEach(msg => {
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateY(10px)';
                    setTimeout(() => msg.remove(), 300); // Wait for transition
                });

                // Show welcome container again after a delay
                setTimeout(() => {
                    ensureWelcomeMessageVisible();
                    clearChatBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear';
                }, 350);
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            clearChatBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            setTimeout(() => {
                clearChatBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear';
            }, 2000);
        }
    });

    // Core message rendering function
    function addMessageToChat(role, content) {
        ensureWelcomeMessageVisible(); // Hide welcome message if it's there
        
        const isAssistant = role === 'assistant';
        
        // Parse markdown and sanitize HTML for Assistant output
        const formattedContent = isAssistant ? DOMPurify.sanitize(marked.parse(content)) : escapeHTML(content);

        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper', role);
        
        const messageInner = document.createElement('div');
        messageInner.classList.add('message');
        messageInner.innerHTML = formattedContent;
        
        const timeStamp = document.createElement('div');
        timeStamp.classList.add('message-time');
        const now = new Date();
        timeStamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeStamp.setAttribute('aria-label', `Sent at ${now.toLocaleTimeString()}`);
        
        messageWrapper.appendChild(messageInner);
        messageWrapper.appendChild(timeStamp);
        
        chatHistory.appendChild(messageWrapper);
        
        // Ensure HighlightJS applies to newly added generated blocks
        if (isAssistant) {
            messageWrapper.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        
        scrollToBottom();
    }
    
    // UI Feedback Utilities
    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        scrollToBottom();
    }
    
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }

    function scrollToBottom() {
        // Use a short timeout to ensure DOM paints before scrolling
        setTimeout(() => {
            chatHistory.scrollTo({
                top: chatHistory.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    }

    // Helper to escape user input so they can't inject HTML
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }

    // Live Real-Time Clock
    const liveClock = document.getElementById('live-clock');
    function updateClock() {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        liveClock.textContent = now.toLocaleString(undefined, options);
    }
    updateClock(); // Set immediately
    setInterval(updateClock, 1000); // Update every second
});