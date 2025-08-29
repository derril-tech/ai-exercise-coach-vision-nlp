'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ASRResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: string;
  timestamp: number;
}

export interface ASRSettings {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

// Voice commands in different languages
const VOICE_COMMANDS = {
  'en-US': {
    pause: ['pause', 'stop', 'wait', 'hold'],
    resume: ['resume', 'continue', 'start', 'go'],
    next: ['next', 'skip', 'next exercise'],
    previous: ['previous', 'back', 'last exercise'],
    easier: ['easier', 'make it easier', 'too hard', 'reduce'],
    harder: ['harder', 'make it harder', 'too easy', 'increase'],
    repeat: ['repeat', 'again', 'one more time'],
    help: ['help', 'what can I say', 'commands'],
    volume_up: ['louder', 'volume up', 'speak up'],
    volume_down: ['quieter', 'volume down', 'lower volume']
  },
  'es-ES': {
    pause: ['pausa', 'parar', 'esperar', 'detener'],
    resume: ['continuar', 'seguir', 'empezar', 'vamos'],
    next: ['siguiente', 'saltar', 'próximo ejercicio'],
    previous: ['anterior', 'atrás', 'último ejercicio'],
    easier: ['más fácil', 'hazlo más fácil', 'muy difícil', 'reducir'],
    harder: ['más difícil', 'hazlo más difícil', 'muy fácil', 'aumentar'],
    repeat: ['repetir', 'otra vez', 'una vez más'],
    help: ['ayuda', 'qué puedo decir', 'comandos'],
    volume_up: ['más alto', 'subir volumen', 'habla más fuerte'],
    volume_down: ['más bajo', 'bajar volumen', 'menos volumen']
  },
  'fr-FR': {
    pause: ['pause', 'arrêter', 'attendre', 'stop'],
    resume: ['continuer', 'reprendre', 'commencer', 'allez'],
    next: ['suivant', 'passer', 'prochain exercice'],
    previous: ['précédent', 'retour', 'dernier exercice'],
    easier: ['plus facile', 'rendre plus facile', 'trop dur', 'réduire'],
    harder: ['plus dur', 'rendre plus dur', 'trop facile', 'augmenter'],
    repeat: ['répéter', 'encore', 'une fois de plus'],
    help: ['aide', 'que puis-je dire', 'commandes'],
    volume_up: ['plus fort', 'monter le volume', 'parler plus fort'],
    volume_down: ['moins fort', 'baisser le volume', 'moins de volume']
  },
  'de-DE': {
    pause: ['pause', 'stopp', 'warten', 'anhalten'],
    resume: ['weiter', 'fortsetzen', 'anfangen', 'los'],
    next: ['nächste', 'überspringen', 'nächste übung'],
    previous: ['vorherige', 'zurück', 'letzte übung'],
    easier: ['einfacher', 'leichter machen', 'zu schwer', 'reduzieren'],
    harder: ['schwerer', 'schwerer machen', 'zu einfach', 'erhöhen'],
    repeat: ['wiederholen', 'nochmal', 'noch einmal'],
    help: ['hilfe', 'was kann ich sagen', 'befehle'],
    volume_up: ['lauter', 'lautstärke hoch', 'lauter sprechen'],
    volume_down: ['leiser', 'lautstärke runter', 'weniger laut']
  },
  'ja-JP': {
    pause: ['一時停止', 'ポーズ', '止めて', '待って'],
    resume: ['再開', '続ける', '始める', '行く'],
    next: ['次', 'スキップ', '次の運動'],
    previous: ['前', '戻る', '前の運動'],
    easier: ['簡単に', 'もっと簡単に', '難しすぎる', '減らす'],
    harder: ['難しく', 'もっと難しく', '簡単すぎる', '増やす'],
    repeat: ['繰り返す', 'もう一度', 'もう一回'],
    help: ['ヘルプ', '何が言える', 'コマンド'],
    volume_up: ['大きく', '音量上げて', 'もっと大きく'],
    volume_down: ['小さく', '音量下げて', 'もっと小さく']
  }
};

export function useMultiLanguageASR() {
  const [isListening, setIsListening] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [asrSettings, setASRSettings] = useState<ASRSettings>({
    language: 'en-US',
    continuous: false,
    interimResults: true,
    maxAlternatives: 3,
    noiseReduction: true,
    echoCancellation: true
  });
  const [lastResult, setLastResult] = useState<ASRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    const recognition = new SpeechRecognition();
    recognition.continuous = asrSettings.continuous;
    recognition.interimResults = asrSettings.interimResults;
    recognition.maxAlternatives = asrSettings.maxAlternatives;
    recognition.lang = asrSettings.language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence || 0;

      const asrResult: ASRResult = {
        transcript,
        confidence,
        isFinal: result.isFinal,
        language: asrSettings.language,
        timestamp: Date.now()
      };

      setLastResult(asrResult);

      // Process command if final result
      if (result.isFinal) {
        processVoiceCommand(transcript, asrSettings.language);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Auto-restart if continuous mode is enabled
      if (asrSettings.continuous && !error) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [asrSettings]);

  const processVoiceCommand = useCallback((
    transcript: string, 
    language: string
  ) => {
    const commands = VOICE_COMMANDS[language as keyof typeof VOICE_COMMANDS] || 
                    VOICE_COMMANDS['en-US'];

    // Find matching command
    for (const [commandType, variations] of Object.entries(commands)) {
      for (const variation of variations) {
        if (transcript.includes(variation.toLowerCase())) {
          // Dispatch custom event for the command
          const event = new CustomEvent('voiceCommand', {
            detail: {
              command: commandType,
              transcript,
              language,
              confidence: lastResult?.confidence || 0
            }
          });
          window.dispatchEvent(event);
          return;
        }
      }
    }

    // If no command matched, dispatch generic speech event
    const event = new CustomEvent('speechRecognized', {
      detail: {
        transcript,
        language,
        confidence: lastResult?.confidence || 0
      }
    });
    window.dispatchEvent(event);
  }, [lastResult]);

  const startListening = useCallback((duration?: number) => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not available');
      return;
    }

    try {
      recognitionRef.current.start();
      
      // Set timeout if duration specified
      if (duration) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, duration);
      }
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  const changeLanguage = useCallback((languageCode: string) => {
    setCurrentLanguage(languageCode);
    setASRSettings(prev => ({ ...prev, language: languageCode }));
  }, []);

  const updateSettings = useCallback((updates: Partial<ASRSettings>) => {
    setASRSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getAvailableCommands = useCallback((language?: string) => {
    const lang = language || currentLanguage;
    const commands = VOICE_COMMANDS[lang as keyof typeof VOICE_COMMANDS] || 
                    VOICE_COMMANDS['en-US'];
    
    return Object.entries(commands).map(([command, variations]) => ({
      command,
      variations,
      example: variations[0]
    }));
  }, [currentLanguage]);

  const testMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      setError('Microphone access denied or not available');
      return false;
    }
  }, []);

  const calibrateNoise = useCallback(async (duration: number = 3000): Promise<number> => {
    // Mock noise calibration - in a real implementation, this would
    // measure ambient noise levels to adjust sensitivity
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockNoiseLevel = Math.random() * 0.3; // 0-30% noise level
        resolve(mockNoiseLevel);
      }, duration);
    });
  }, []);

  // Listen for voice commands (convenience method)
  const listenForCommand = useCallback((
    expectedCommands: string[],
    timeout: number = 5000
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const handleCommand = (event: CustomEvent) => {
        const { command } = event.detail;
        if (expectedCommands.includes(command)) {
          cleanup();
          resolve(command);
        }
      };

      const handleTimeout = () => {
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        window.removeEventListener('voiceCommand', handleCommand as EventListener);
        clearTimeout(timeoutId);
        stopListening();
      };

      window.addEventListener('voiceCommand', handleCommand as EventListener);
      const timeoutId = setTimeout(handleTimeout, timeout);
      
      startListening();
    });
  }, [startListening, stopListening]);

  return {
    // State
    isListening,
    currentLanguage,
    asrSettings,
    lastResult,
    error,
    isSupported,

    // Actions
    startListening,
    stopListening,
    changeLanguage,
    updateSettings,
    listenForCommand,

    // Utilities
    getAvailableCommands,
    testMicrophone,
    calibrateNoise,
    
    // Command processing
    processVoiceCommand,
    
    // Language support
    getSupportedLanguages: () => Object.keys(VOICE_COMMANDS),
    isLanguageSupported: (lang: string) => lang in VOICE_COMMANDS,
    
    // Status
    canListen: isSupported && !error,
    needsPermission: !isSupported && !error
  };
}
