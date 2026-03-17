import os
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get API key from .env
API_KEY = os.getenv("GEMINI_API_KEY")  # Remove any spaces from your actual key

genai.configure(api_key=API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")  # Updated to current model name
chat = model.start_chat()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat_handler():
    try:
        user_input = request.json.get('message')
        
        if not user_input:
            return jsonify({'error': 'Empty message'}), 400
        
        # Send message to Gemini
        response = chat.send_message(user_input)
        
        return jsonify({
            'response': response.text,
            'history': [{'role': 'user', 'content': user_input},
                       {'role': 'assistant', 'content': response.text}]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clear', methods=['POST'])
def clear_chat():
    global chat
    chat = model.start_chat(history=[])
    return jsonify({'status': 'Chat history cleared'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)