'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseASRReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  startListening: (options?: ASROptions) => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

interface ASROptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
}

interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: Date;
}

export function useASR(onCommand?: (command: VoiceCommand) => void): UseASRReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    setIsSupported(supported);

    if (supported) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      // Event handlers
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcriptPart;
            setConfidence(result[0].confidence);
            
            // Process command if callback provided
            if (onCommand && transcriptPart.trim()) {
              const command: VoiceCommand = {
                command: transcriptPart.trim().toLowerCase(),
                confidence: result[0].confidence,
                timestamp: new Date(),
              };
              onCommand(command);
            }
          } else {
            interimTranscript += transcriptPart;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onCommand]);

  const startListening = useCallback((options: ASROptions = {}) => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      const recognition = recognitionRef.current;
      
      // Apply options
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.language ?? 'en-US';
      recognition.maxAlternatives = options.maxAlternatives ?? 1;

      recognition.start();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}

// Voice command processor hook
export function useVoiceCommands() {
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);

  const processCommand = useCallback((command: VoiceCommand) => {
    setLastCommand(command);
    setCommandHistory(prev => [command, ...prev.slice(0, 9)]); // Keep last 10 commands

    // Parse and execute command
    const cmd = command.command.toLowerCase();
    
    // Exercise control commands
    if (cmd.includes('pause') || cmd.includes('stop')) {
      return { type: 'pause', confidence: command.confidence };
    }
    
    if (cmd.includes('resume') || cmd.includes('continue') || cmd.includes('start')) {
      return { type: 'resume', confidence: command.confidence };
    }
    
    if (cmd.includes('next') || cmd.includes('skip')) {
      return { type: 'next', confidence: command.confidence };
    }
    
    if (cmd.includes('repeat') || cmd.includes('again')) {
      return { type: 'repeat', confidence: command.confidence };
    }
    
    // Difficulty adjustments
    if (cmd.includes('easier') || cmd.includes('reduce') || cmd.includes('less')) {
      return { type: 'easier', confidence: command.confidence };
    }
    
    if (cmd.includes('harder') || cmd.includes('increase') || cmd.includes('more')) {
      return { type: 'harder', confidence: command.confidence };
    }
    
    // Form feedback requests
    if (cmd.includes('form') || cmd.includes('how') && cmd.includes('doing')) {
      return { type: 'form_check', confidence: command.confidence };
    }
    
    // Rep count requests
    if (cmd.includes('count') || cmd.includes('reps') || cmd.includes('how many')) {
      return { type: 'rep_count', confidence: command.confidence };
    }
    
    // Help commands
    if (cmd.includes('help') || cmd.includes('commands')) {
      return { type: 'help', confidence: command.confidence };
    }

    // Unknown command
    return { type: 'unknown', command: cmd, confidence: command.confidence };
  }, []);

  const asr = useASR(processCommand);

  return {
    ...asr,
    lastCommand,
    commandHistory,
    processCommand,
  };
}
