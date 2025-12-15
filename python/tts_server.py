"""
Chatterbox-Turbo TTS Server for English Learning App
Runs on localhost:5123
"""

import os
import sys
import io
import tempfile
from pathlib import Path

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import torch
import torchaudio

# Set model cache directory to AppData
if sys.platform == 'win32':
    CACHE_DIR = Path(os.environ.get('APPDATA', '')) / 'EnglishLearningApp' / 'models'
else:
    CACHE_DIR = Path.home() / '.cache' / 'EnglishLearningApp' / 'models'

CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ['HF_HOME'] = str(CACHE_DIR)
os.environ['TRANSFORMERS_CACHE'] = str(CACHE_DIR)

app = Flask(__name__)
CORS(app)

# Global model instance
model = None
device = None

def get_device():
    """Detect best available device"""
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"

def load_model():
    """Load Chatterbox-Turbo model (lazy loading)"""
    global model, device

    if model is not None:
        return model

    device = get_device()
    print(f"Loading Chatterbox-Turbo on {device}...")
    print(f"Model cache directory: {CACHE_DIR}")

    try:
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        model = ChatterboxTurboTTS.from_pretrained(device=device)
        print("Model loaded successfully!")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'device': device or get_device(),
        'cache_dir': str(CACHE_DIR)
    })

@app.route('/speak', methods=['POST'])
def speak():
    """Generate speech from text"""
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Load model if not loaded
        tts = load_model()

        # Generate audio
        wav = tts.generate(text)

        print(f"Generated wav shape: {wav.shape}, dim: {wav.dim()}")

        # Convert to bytes - flatten to 2D (channels, samples) for torchaudio
        buffer = io.BytesIO()
        # Squeeze all extra dimensions until we get 1D or 2D
        while wav.dim() > 2:
            wav = wav.squeeze(0)
        # If 1D, add channel dimension
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)

        print(f"Final wav shape: {wav.shape}")
        torchaudio.save(buffer, wav.cpu(), 24000, format='wav')
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='audio/wav',
            as_attachment=False
        )

    except Exception as e:
        print(f"Error generating speech: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/preload', methods=['POST'])
def preload():
    """Preload the model"""
    try:
        load_model()
        return jsonify({'status': 'ok', 'device': device})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Shutdown the server"""
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        # For newer Flask versions
        os._exit(0)
    func()
    return jsonify({'status': 'shutting down'})

if __name__ == '__main__':
    print("Starting Chatterbox-Turbo TTS Server...")
    print(f"Cache directory: {CACHE_DIR}")
    print(f"Device: {get_device()}")

    # Optionally preload model on startup
    if '--preload' in sys.argv:
        load_model()

    app.run(host='127.0.0.1', port=5123, debug=False, threaded=True)
