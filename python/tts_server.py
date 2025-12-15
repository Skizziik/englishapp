"""
Chatterbox-Turbo TTS Server for English Learning App
Runs on localhost:5123
"""

import os
import sys
import io
import hashlib
from pathlib import Path

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import torch
import torchaudio

# Set cache directories in AppData
if sys.platform == 'win32':
    APP_DATA = Path(os.environ.get('APPDATA', '')) / 'EnglishLearningApp'
else:
    APP_DATA = Path.home() / '.cache' / 'EnglishLearningApp'

CACHE_DIR = APP_DATA / 'models'
AUDIO_CACHE_DIR = APP_DATA / 'audio_cache'

CACHE_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

os.environ['HF_HOME'] = str(CACHE_DIR)
os.environ['TRANSFORMERS_CACHE'] = str(CACHE_DIR)

def get_audio_cache_path(text: str) -> Path:
    """Get cache file path for text (using sanitized filename)"""
    # Sanitize text for filename - keep only alphanumeric and spaces
    clean_text = text.lower().strip()
    # Replace spaces with underscores, remove special chars
    safe_name = ''.join(c if c.isalnum() or c == ' ' else '' for c in clean_text)
    safe_name = safe_name.replace(' ', '_')[:50]  # Limit length

    # If the name is too short or empty, use hash
    if len(safe_name) < 2:
        safe_name = hashlib.md5(clean_text.encode()).hexdigest()[:12]

    return AUDIO_CACHE_DIR / f"{safe_name}.wav"

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

        # Check if audio is already cached
        cache_path = get_audio_cache_path(text)
        if cache_path.exists():
            print(f"[Cache HIT] {text} -> {cache_path.name}")
            return send_file(
                str(cache_path),
                mimetype='audio/wav',
                as_attachment=False
            )

        print(f"[Cache MISS] Generating: {text}")

        # Load model if not loaded
        tts = load_model()

        # Generate audio
        wav = tts.generate(text)

        print(f"Generated wav shape: {wav.shape}, dim: {wav.dim()}")

        # Flatten to 2D (channels, samples) for torchaudio
        while wav.dim() > 2:
            wav = wav.squeeze(0)
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)

        print(f"Final wav shape: {wav.shape}")

        # Save to cache file
        torchaudio.save(str(cache_path), wav.cpu(), 24000, format='wav')
        print(f"[Cached] {text} -> {cache_path.name}")

        # Return the cached file
        return send_file(
            str(cache_path),
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
