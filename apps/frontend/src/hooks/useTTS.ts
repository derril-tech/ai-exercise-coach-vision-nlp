'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTTSReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setVolume: (volume: number) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
}

interface SpeechOptions {
  voice?: SpeechSynthesisVoice;
  volume?: number;
  rate?: number;
  pitch?: number;
  priority?: 'low' | 'normal' | 'high';
}

export function useTTS(): UseTTSReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [rate, setRateState] = useState(1.0);
  const [pitch, setPitchState] = useState(1.0);
  
  const speechQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for speech synthesis support
  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      // Load voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Set default voice (prefer English voices)
        if (!currentVoice && availableVoices.length > 0) {
          const englishVoice = availableVoices.find(voice => 
            voice.lang.startsWith('en') && voice.localService
          ) || availableVoices[0];
          setCurrentVoice(englishVoice);
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      // Monitor speaking state
      const checkSpeakingState = () => {
        setIsSpeaking(speechSynthesis.speaking);
        setIsPaused(speechSynthesis.paused);
      };

      const interval = setInterval(checkSpeakingState, 100);
      return () => clearInterval(interval);
    }
  }, [currentVoice]);

  // Speak text with options
  const speak = useCallback(async (text: string, options: SpeechOptions = {}): Promise<void> => {
    if (!isSupported || !text.trim()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Stop current speech if high priority
      if (options.priority === 'high' && speechSynthesis.speaking) {
        speechSynthesis.cancel();
        speechQueue.current = [];
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.voice = options.voice || currentVoice;
      utterance.volume = options.volume ?? volume;
      utterance.rate = options.rate ?? rate;
      utterance.pitch = options.pitch ?? pitch;

      // Event handlers
      utterance.onstart = () => {
        currentUtterance.current = utterance;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        currentUtterance.current = null;
        setIsSpeaking(false);
        resolve();
        
        // Process next in queue
        if (speechQueue.current.length > 0) {
          const next = speechQueue.current.shift();
          if (next) {
            speechSynthesis.speak(next);
          }
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        currentUtterance.current = null;
        setIsSpeaking(false);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      // Queue or speak immediately
      if (speechSynthesis.speaking && options.priority !== 'high') {
        speechQueue.current.push(utterance);
      } else {
        speechSynthesis.speak(utterance);
      }
    });
  }, [isSupported, currentVoice, volume, rate, pitch]);

  // Pause speech
  const pause = useCallback(() => {
    if (isSupported && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }, [isSupported]);

  // Resume speech
  const resume = useCallback(() => {
    if (isSupported && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }, [isSupported]);

  // Stop speech
  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      speechQueue.current = [];
      currentUtterance.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  // Set voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  // Set volume (0-1)
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  // Set rate (0.1-10)
  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.1, Math.min(10, newRate));
    setRateState(clampedRate);
  }, []);

  // Set pitch (0-2)
  const setPitch = useCallback((newPitch: number) => {
    const clampedPitch = Math.max(0, Math.min(2, newPitch));
    setPitchState(clampedPitch);
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    currentVoice,
    volume,
    rate,
    pitch,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setVolume,
    setRate,
    setPitch,
  };
}
