/**
 * TTS Service - manages Chatterbox-Turbo Python server
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

const TTS_PORT = 5123;
const TTS_URL = `http://127.0.0.1:${TTS_PORT}`;

// Audio cache directory path (same as Python server uses)
function getAudioCacheDir(): string {
  const appData = process.env.APPDATA || path.join(process.env.HOME || '', '.cache');
  return path.join(appData, 'EnglishLearningApp', 'audio_cache');
}

// Get cache file path for text (same logic as Python server)
function getAudioCachePath(text: string): string {
  // Sanitize text for filename - keep only alphanumeric and spaces
  const cleanText = text.toLowerCase().trim();
  let safeName = cleanText.replace(/[^a-z0-9 ]/g, '').replace(/ /g, '_').slice(0, 50);

  // If the name is too short or empty, use simple hash
  if (safeName.length < 2) {
    // Simple hash for short texts
    let hash = 0;
    for (let i = 0; i < cleanText.length; i++) {
      hash = ((hash << 5) - hash) + cleanText.charCodeAt(i);
      hash |= 0;
    }
    safeName = Math.abs(hash).toString(16).slice(0, 12);
  }

  return path.join(getAudioCacheDir(), `${safeName}.wav`);
}

interface HealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  cache_dir: string;
}

interface ErrorResponse {
  error: string;
}

class TTSService {
  private pythonProcess: ChildProcess | null = null;
  private isReady: boolean = false;
  private startupPromise: Promise<void> | null = null;

  /**
   * Get the path to Python executable
   */
  private getPythonPath(): string {
    // Try common Python paths on Windows
    const possiblePaths = [
      'python',
      'python3',
      'py',
      process.env.PYTHON_PATH || '',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
    ].filter(Boolean);

    return possiblePaths[0]; // Will use PATH resolution
  }

  /**
   * Get the path to the TTS server script
   */
  private getServerScriptPath(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
      return path.join(process.cwd(), 'python', 'tts_server.py');
    } else {
      // In production, the python folder should be in resources
      return path.join(process.resourcesPath, 'python', 'tts_server.py');
    }
  }

  /**
   * Check if the TTS server is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${TTS_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json() as HealthResponse;
        return data.status === 'ok';
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the server to be ready
   */
  private async waitForServer(maxAttempts: number = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.checkHealth()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  /**
   * Start the TTS server
   */
  async start(): Promise<void> {
    // Return existing startup promise if already starting
    if (this.startupPromise) {
      return this.startupPromise;
    }

    // Check if already running
    if (await this.checkHealth()) {
      this.isReady = true;
      console.log('TTS server already running');
      return;
    }

    this.startupPromise = this._start();
    return this.startupPromise;
  }

  private async _start(): Promise<void> {
    const pythonPath = this.getPythonPath();
    const scriptPath = this.getServerScriptPath();

    console.log(`Starting TTS server with Python: ${pythonPath}`);
    console.log(`Script path: ${scriptPath}`);

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`TTS server script not found: ${scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      this.pythonProcess = spawn(pythonPath, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      this.pythonProcess.stdout?.on('data', (data) => {
        console.log(`[TTS] ${data.toString().trim()}`);
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        console.error(`[TTS Error] ${data.toString().trim()}`);
      });

      this.pythonProcess.on('error', (error) => {
        console.error('Failed to start TTS server:', error);
        this.isReady = false;
        this.startupPromise = null;
        reject(error);
      });

      this.pythonProcess.on('exit', (code) => {
        console.log(`TTS server exited with code ${code}`);
        this.isReady = false;
        this.pythonProcess = null;
        this.startupPromise = null;
      });

      // Wait for server to be ready
      this.waitForServer(60).then((ready) => {
        if (ready) {
          this.isReady = true;
          console.log('TTS server is ready!');
          resolve();
        } else {
          reject(new Error('TTS server failed to start in time'));
        }
      });
    });
  }

  /**
   * Stop the TTS server
   */
  async stop(): Promise<void> {
    if (!this.pythonProcess) {
      return;
    }

    try {
      // Try graceful shutdown first
      await fetch(`${TTS_URL}/shutdown`, { method: 'POST' }).catch(() => {});
    } catch {
      // Ignore errors
    }

    // Force kill if still running
    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
    }

    this.isReady = false;
    this.startupPromise = null;
  }

  /**
   * Generate speech from text
   * First checks local file cache, then falls back to server
   */
  async speak(text: string): Promise<Buffer> {
    // Check local file cache first (works without server!)
    const cachePath = getAudioCachePath(text);
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS] Cache hit: ${text} -> ${cachePath}`);
      return fs.readFileSync(cachePath);
    }

    // No cache - need server to generate
    if (!this.isReady) {
      await this.start();
    }

    const response = await fetch(`${TTS_URL}/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      throw new Error(error.error || 'TTS generation failed');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Preload the model
   */
  async preload(): Promise<void> {
    if (!this.isReady) {
      await this.start();
    }

    const response = await fetch(`${TTS_URL}/preload`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      throw new Error(error.error || 'Failed to preload model');
    }
  }

  /**
   * Get TTS status
   */
  async getStatus(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    device: string;
  }> {
    try {
      const response = await fetch(`${TTS_URL}/health`);
      if (response.ok) {
        const data = await response.json() as HealthResponse;
        return {
          available: true,
          modelLoaded: data.model_loaded,
          device: data.device
        };
      }
    } catch {
      // Server not running
    }

    return {
      available: false,
      modelLoaded: false,
      device: 'none'
    };
  }

  /**
   * Check if audio is cached for text (can play without server)
   */
  hasCachedAudio(text: string): boolean {
    const cachePath = getAudioCachePath(text);
    return fs.existsSync(cachePath);
  }

  /**
   * Get cached audio without needing server
   */
  getCachedAudio(text: string): Buffer | null {
    const cachePath = getAudioCachePath(text);
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath);
    }
    return null;
  }
}

// Singleton instance
export const ttsService = new TTSService();
