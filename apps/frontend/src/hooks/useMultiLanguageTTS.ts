'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  ttsSupported: boolean;
  asrSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

export interface TTSSettings {
  language: string;
  voice?: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface ASRSettings {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

const SUPPORTED_LANGUAGES: Omit<Language, 'voices'>[] = [
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English (United States)',
    region: 'US',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English (United Kingdom)',
    region: 'GB',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    region: 'ES',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'es-MX',
    name: 'Spanish (Mexico)',
    nativeName: 'Español (México)',
    region: 'MX',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'fr-FR',
    name: 'French (France)',
    nativeName: 'Français (France)',
    region: 'FR',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'de-DE',
    name: 'German (Germany)',
    nativeName: 'Deutsch (Deutschland)',
    region: 'DE',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'it-IT',
    name: 'Italian (Italy)',
    nativeName: 'Italiano (Italia)',
    region: 'IT',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    region: 'BR',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    region: 'JP',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    region: 'KR',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '中文 (简体)',
    region: 'CN',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'zh-TW',
    name: 'Chinese (Traditional)',
    nativeName: '中文 (繁體)',
    region: 'TW',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    region: 'RU',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'ar-SA',
    name: 'Arabic (Saudi Arabia)',
    nativeName: 'العربية (السعودية)',
    region: 'SA',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  },
  {
    code: 'hi-IN',
    name: 'Hindi (India)',
    nativeName: 'हिन्दी (भारत)',
    region: 'IN',
    ttsSupported: true,
    asrSupported: true,
    voices: []
  }
];

// Localized coaching phrases for different languages
const COACHING_PHRASES = {
  'en-US': {
    start: 'Let\'s begin your workout!',
    pause: 'Workout paused',
    resume: 'Resuming workout',
    complete: 'Great job! Workout completed!',
    goodForm: 'Excellent form!',
    improveForm: 'Focus on your form',
    breathe: 'Remember to breathe',
    pushHarder: 'You can do it! Push harder!',
    almostDone: 'Almost done, keep going!',
    rest: 'Take a rest',
    nextExercise: 'Moving to next exercise',
    repCount: (count: number) => `${count} reps completed`,
    setComplete: 'Set completed',
    encouragement: ['Great work!', 'Keep it up!', 'You\'re doing amazing!', 'Stay strong!']
  },
  'es-ES': {
    start: '¡Comencemos tu entrenamiento!',
    pause: 'Entrenamiento pausado',
    resume: 'Reanudando entrenamiento',
    complete: '¡Excelente trabajo! ¡Entrenamiento completado!',
    goodForm: '¡Excelente forma!',
    improveForm: 'Concéntrate en tu forma',
    breathe: 'Recuerda respirar',
    pushHarder: '¡Puedes hacerlo! ¡Esfuérzate más!',
    almostDone: 'Casi terminamos, ¡sigue así!',
    rest: 'Descansa',
    nextExercise: 'Pasando al siguiente ejercicio',
    repCount: (count: number) => `${count} repeticiones completadas`,
    setComplete: 'Serie completada',
    encouragement: ['¡Excelente trabajo!', '¡Sigue así!', '¡Lo estás haciendo increíble!', '¡Mantente fuerte!']
  },
  'fr-FR': {
    start: 'Commençons votre entraînement!',
    pause: 'Entraînement en pause',
    resume: 'Reprise de l\'entraînement',
    complete: 'Excellent travail! Entraînement terminé!',
    goodForm: 'Excellente forme!',
    improveForm: 'Concentrez-vous sur votre forme',
    breathe: 'N\'oubliez pas de respirer',
    pushHarder: 'Vous pouvez le faire! Poussez plus fort!',
    almostDone: 'Presque fini, continuez!',
    rest: 'Reposez-vous',
    nextExercise: 'Passage à l\'exercice suivant',
    repCount: (count: number) => `${count} répétitions terminées`,
    setComplete: 'Série terminée',
    encouragement: ['Excellent travail!', 'Continuez!', 'Vous êtes incroyable!', 'Restez fort!']
  },
  'de-DE': {
    start: 'Lass uns mit deinem Training beginnen!',
    pause: 'Training pausiert',
    resume: 'Training wird fortgesetzt',
    complete: 'Großartige Arbeit! Training abgeschlossen!',
    goodForm: 'Ausgezeichnete Form!',
    improveForm: 'Konzentriere dich auf deine Form',
    breathe: 'Vergiss nicht zu atmen',
    pushHarder: 'Du schaffst das! Streng dich mehr an!',
    almostDone: 'Fast geschafft, mach weiter!',
    rest: 'Mach eine Pause',
    nextExercise: 'Weiter zur nächsten Übung',
    repCount: (count: number) => `${count} Wiederholungen abgeschlossen`,
    setComplete: 'Satz abgeschlossen',
    encouragement: ['Großartige Arbeit!', 'Weiter so!', 'Du machst das fantastisch!', 'Bleib stark!']
  },
  'ja-JP': {
    start: 'ワークアウトを始めましょう！',
    pause: 'ワークアウトを一時停止しました',
    resume: 'ワークアウトを再開します',
    complete: '素晴らしい！ワークアウト完了！',
    goodForm: '素晴らしいフォームです！',
    improveForm: 'フォームに集中してください',
    breathe: '呼吸を忘れずに',
    pushHarder: 'できます！もっと頑張って！',
    almostDone: 'もう少しです、続けて！',
    rest: '休憩してください',
    nextExercise: '次のエクササイズに移ります',
    repCount: (count: number) => `${count}回完了`,
    setComplete: 'セット完了',
    encouragement: ['素晴らしい！', '続けて！', '素晴らしい頑張りです！', '強く！']
  }
};

export function useMultiLanguageTTS() {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en-US');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    language: 'en-US',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize TTS and load available languages/voices
  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthRef.current = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() || [];
      
      const languagesWithVoices = SUPPORTED_LANGUAGES.map(lang => ({
        ...lang,
        voices: voices.filter(voice => voice.lang.startsWith(lang.code.split('-')[0]))
      }));

      // Filter to only include languages that have available voices
      const availableLangs = languagesWithVoices.filter(lang => lang.voices.length > 0);
      
      setAvailableLanguages(availableLangs);
      setIsLoading(false);
    };

    // Load voices immediately if available
    loadVoices();
    
    // Some browsers load voices asynchronously
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    // Detect user's preferred language
    const userLang = navigator.language || 'en-US';
    const supportedUserLang = SUPPORTED_LANGUAGES.find(lang => 
      lang.code === userLang || lang.code.startsWith(userLang.split('-')[0])
    );
    
    if (supportedUserLang) {
      setCurrentLanguage(supportedUserLang.code);
      setTTSSettings(prev => ({ ...prev, language: supportedUserLang.code }));
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((
    text: string, 
    options?: Partial<TTSSettings>
  ) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const settings = { ...ttsSettings, ...options };
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find the best voice for the language
    const language = availableLanguages.find(lang => lang.code === settings.language);
    if (language && language.voices.length > 0) {
      // Prefer the specified voice or use the first available
      const voice = settings.voice 
        ? language.voices.find(v => v.name === settings.voice) || language.voices[0]
        : language.voices[0];
      
      utterance.voice = voice;
    }

    utterance.lang = settings.language;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [ttsSettings, availableLanguages]);

  const speakCoachingPhrase = useCallback((
    phraseKey: keyof typeof COACHING_PHRASES['en-US'],
    ...args: any[]
  ) => {
    const phrases = COACHING_PHRASES[currentLanguage as keyof typeof COACHING_PHRASES] || 
                   COACHING_PHRASES['en-US'];
    
    let text: string;
    const phrase = phrases[phraseKey];
    
    if (typeof phrase === 'function') {
      text = phrase(...args);
    } else if (Array.isArray(phrase)) {
      // Random selection from array
      text = phrase[Math.floor(Math.random() * phrase.length)];
    } else {
      text = phrase;
    }

    speak(text);
  }, [currentLanguage, speak]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const changeLanguage = useCallback((languageCode: string) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    if (language) {
      setCurrentLanguage(languageCode);
      setTTSSettings(prev => ({ 
        ...prev, 
        language: languageCode,
        voice: language.voices[0]?.name 
      }));
    }
  }, [availableLanguages]);

  const updateTTSSettings = useCallback((updates: Partial<TTSSettings>) => {
    setTTSSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getAvailableVoices = useCallback((languageCode?: string) => {
    const targetLang = languageCode || currentLanguage;
    const language = availableLanguages.find(lang => lang.code === targetLang);
    return language?.voices || [];
  }, [availableLanguages, currentLanguage]);

  const translateText = useCallback(async (
    text: string, 
    targetLanguage: string
  ): Promise<string> => {
    // In a real implementation, this would use a translation service like Google Translate API
    // For demo purposes, we'll return the original text with a note
    
    if (targetLanguage === 'en-US') {
      return text;
    }
    
    // Mock translation - in production, integrate with translation service
    const mockTranslations: Record<string, Record<string, string>> = {
      'es-ES': {
        'Good form!': '¡Buena forma!',
        'Keep going!': '¡Sigue así!',
        'Take a break': 'Toma un descanso',
        'Well done!': '¡Bien hecho!'
      },
      'fr-FR': {
        'Good form!': 'Bonne forme!',
        'Keep going!': 'Continuez!',
        'Take a break': 'Prenez une pause',
        'Well done!': 'Bien joué!'
      }
    };

    const translations = mockTranslations[targetLanguage];
    return translations?.[text] || `[${targetLanguage}] ${text}`;
  }, []);

  return {
    // State
    currentLanguage,
    availableLanguages,
    ttsSettings,
    isSpeaking,
    isLoading,
    
    // Actions
    speak,
    speakCoachingPhrase,
    stopSpeaking,
    changeLanguage,
    updateTTSSettings,
    getAvailableVoices,
    translateText,
    
    // Utilities
    isLanguageSupported: (langCode: string) => 
      availableLanguages.some(lang => lang.code === langCode),
    getCurrentLanguageInfo: () => 
      availableLanguages.find(lang => lang.code === currentLanguage),
  };
}
