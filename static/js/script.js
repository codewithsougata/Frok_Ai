document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const clearChatBtn = document.getElementById('clear-chat');
    const typingIndicator = document.getElementById('typing-indicator');
    const micBtn = document.getElementById('mic-btn');
    
    // Check if browser supports speech recognition
    const isSpeechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (!isSpeechRecognitionSupported) {
        micBtn.style.display = 'none';
    }
    
    // Add welcome message to chat history
    const welcomeMessage = document.querySelector('.welcome-message');
    
    // Handle form submission
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        
        if (message) {
            addMessageToChat('user', message);
            userInput.value = '';
            showTypingIndicator();
            
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                hideTypingIndicator();
                addMessageToChat('assistant', data.response);
                
                // Scroll to bottom of chat
                chatHistory.scrollTop = chatHistory.scrollHeight;
                
            } catch (error) {
                hideTypingIndicator();
                addMessageToChat('assistant', `Error: ${error.message}`);
                console.error('Error:', error);
            }
        }
    });
    
    // Clear chat history
    clearChatBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/clear', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'Chat history cleared') {
                // Remove all messages except welcome message
                while (chatHistory.firstChild) {
                    chatHistory.removeChild(chatHistory.firstChild);
                }
                chatHistory.appendChild(welcomeMessage);
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    });
    
    // Handle suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(button => {
        button.addEventListener('click', function() {
            userInput.value = this.textContent;
            userInput.focus();
        });
    });
    
    // Speech recognition
    if (isSpeechRecognitionSupported) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        micBtn.addEventListener('click', function() {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
                micBtn.classList.remove('recording');
                micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            } else {
                recognition.start();
                micBtn.classList.add('recording');
                micBtn.innerHTML = '<i class="fas fa-stop"></i>';
            }
        });
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };
    }
    
    // Helper functions
    function addMessageToChat(role, content) {
        // Remove welcome message if it's the first user message
        if (role === 'user' && chatHistory.contains(welcomeMessage)) {
            chatHistory.removeChild(welcomeMessage);
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${role}-message`);
        
        const messageContent = document.createElement('div');
        messageContent.textContent = content;
        
        const messageTime = document.createElement('div');
        messageTime.classList.add('message-time');
        messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatHistory.appendChild(messageDiv);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function showTypingIndicator() {
        typingIndicator.style.display = 'block';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }
});