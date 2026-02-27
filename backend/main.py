from flask import Flask, request, jsonify
from flask_cors import CORS
import g4f
import json

app = Flask(__name__)
CORS(app)  # This handles the CORS issue for the VM

@app.route('/api/g4f', methods=['POST'])
def chat():
    try:
        data = request.json
        model = data.get('model', 'gpt-4o-mini')
        messages = data.get('messages', [])
        
        # Use g4f library directly for maximum reliability
        response = g4f.ChatCompletion.create(
            model=model,
            messages=messages,
            stream=False,
        )
        
        # Format like OpenAI response for frontend compatibility
        formatted_response = {
            "choices": [
                {
                    "message": {
                        "content": response
                    }
                }
            ]
        }
        
        return jsonify(formatted_response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Running on 6969 as expected by previous aiService logic
    app.run(host='0.0.0.0', port=8080)
