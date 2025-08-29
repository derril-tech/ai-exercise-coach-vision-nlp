'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMultiLanguageTTS } from '@/hooks/useMultiLanguageTTS';
import { useMultiLanguageASR } from '@/hooks/useMultiLanguageASR';
import { 
  Globe, 
  Volume2, 
  Mic, 
  Play, 
  Settings, 
  Check,
  AlertCircle,
  Headphones,
  MessageSquare
} from 'lucide-react';

export function LanguageSettings() {
  const {
    currentLanguage: ttsLanguage,
    availableLanguages,
    ttsSettings,
    isSpeaking,
    speak,
    speakCoachingPhrase,
    changeLanguage: changeTTSLanguage,
    updateTTSSettings,
    getAvailableVoices,
    isLanguageSupported: isTTSSupported
  } = useMultiLanguageTTS();

  const {
    currentLanguage: asrLanguage,
    isListening,
    asrSettings,
    lastResult,
    error: asrError,
    isSupported: asrSupported,
    startListening,
    stopListening,
    changeLanguage: changeASRLanguage,
    getAvailableCommands,
    testMicrophone
  } = useMultiLanguageASR();

  const [selectedLanguage, setSelectedLanguage] = useState(ttsLanguage);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  const [testingMicrophone, setTestingMicrophone] = useState(false);

  useEffect(() => {
    // Test microphone permission on mount
    testMicrophone().then(setMicrophonePermission);
  }, [testMicrophone]);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    changeTTSLanguage(languageCode);
    changeASRLanguage(languageCode);
  };

  const testTTS = () => {
    speakCoachingPhrase('start');
  };

  const testASR = async () => {
    if (isListening) {
      stopListening();
    } else {
      setTestingMicrophone(true);
      startListening(5000); // Listen for 5 seconds
      setTimeout(() => setTestingMicrophone(false), 5000);
    }
  };

  const handleTTSSettingChange = (setting: string, value: number) => {
    updateTTSSettings({ [setting]: value });
  };

  const getLanguageFlag = (languageCode: string) => {
    const flags: Record<string, string> = {
      'en-US': '🇺🇸',
      'en-GB': '🇬🇧',
      'es-ES': '🇪🇸',
      'es-MX': '🇲🇽',
      'fr-FR': '🇫🇷',
      'de-DE': '🇩🇪',
      'it-IT': '🇮🇹',
      'pt-BR': '🇧🇷',
      'ja-JP': '🇯🇵',
      'ko-KR': '🇰🇷',
      'zh-CN': '🇨🇳',
      'zh-TW': '🇹🇼',
      'ru-RU': '🇷🇺',
      'ar-SA': '🇸🇦',
      'hi-IN': '🇮🇳'
    };
    return flags[languageCode] || '🌐';
  };

  const availableCommands = getAvailableCommands(selectedLanguage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Language Settings
          </h1>
          <p className="text-muted-foreground">Configure text-to-speech and voice recognition</p>
        </div>
      </div>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Select Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableLanguages.map((language) => (
              <Button
                key={language.code}
                variant={selectedLanguage === language.code ? 'default' : 'outline'}
                onClick={() => handleLanguageChange(language.code)}
                className="flex items-center gap-3 h-auto p-4 justify-start"
              >
                <span className="text-2xl">{getLanguageFlag(language.code)}</span>
                <div className="text-left">
                  <div className="font-medium">{language.name}</div>
                  <div className="text-xs opacity-75">{language.nativeName}</div>
                </div>
                {selectedLanguage === language.code && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Text-to-Speech Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Text-to-Speech Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Voice</label>
            <select
              value={ttsSettings.voice || ''}
              onChange={(e) => updateTTSSettings({ voice: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Default Voice</option>
              {getAvailableVoices(selectedLanguage).map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} {voice.localService ? '(Local)' : '(Online)'}
                </option>
              ))}
            </select>
          </div>

          {/* TTS Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Speech Rate: {ttsSettings.rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsSettings.rate}
                onChange={(e) => handleTTSSettingChange('rate', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pitch: {ttsSettings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsSettings.pitch}
                onChange={(e) => handleTTSSettingChange('pitch', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Volume: {Math.round(ttsSettings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsSettings.volume}
                onChange={(e) => handleTTSSettingChange('volume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Test TTS */}
          <div className="flex items-center gap-4">
            <Button
              onClick={testTTS}
              disabled={isSpeaking}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isSpeaking ? 'Speaking...' : 'Test Voice'}
            </Button>
            <Badge variant={isTTSSupported(selectedLanguage) ? 'default' : 'secondary'}>
              {isTTSSupported(selectedLanguage) ? 'Supported' : 'Limited Support'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Speech Recognition Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Speech Recognition Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Microphone Status */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              <span className="font-medium">Microphone Status:</span>
            </div>
            <div className="flex items-center gap-2">
              {microphonePermission === null ? (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Testing...</span>
                </>
              ) : microphonePermission ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-700">Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700">Permission Required</span>
                </>
              )}
            </div>
          </div>

          {/* ASR Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="continuous"
                checked={asrSettings.continuous}
                onChange={(e) => changeASRLanguage(selectedLanguage)}
                className="rounded"
              />
              <label htmlFor="continuous" className="text-sm">
                Continuous listening
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="interimResults"
                checked={asrSettings.interimResults}
                onChange={(e) => changeASRLanguage(selectedLanguage)}
                className="rounded"
              />
              <label htmlFor="interimResults" className="text-sm">
                Show interim results
              </label>
            </div>
          </div>

          {/* Test ASR */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={testASR}
                disabled={!asrSupported || !microphonePermission}
                className="flex items-center gap-2"
                variant={isListening ? 'destructive' : 'default'}
              >
                <Mic className="h-4 w-4" />
                {isListening ? 'Stop Listening' : 'Test Voice Recognition'}
              </Button>
              <Badge variant={asrSupported ? 'default' : 'secondary'}>
                {asrSupported ? 'Supported' : 'Not Supported'}
              </Badge>
            </div>

            {/* Live ASR Results */}
            {(isListening || lastResult) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {isListening ? 'Listening...' : 'Last Result:'}
                  </span>
                </div>
                {lastResult && (
                  <div className="space-y-1">
                    <p className="text-blue-900">"{lastResult.transcript}"</p>
                    <div className="flex items-center gap-4 text-xs text-blue-700">
                      <span>Confidence: {Math.round(lastResult.confidence * 100)}%</span>
                      <span>Language: {lastResult.language}</span>
                      <Badge variant={lastResult.isFinal ? 'default' : 'secondary'}>
                        {lastResult.isFinal ? 'Final' : 'Interim'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {asrError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Error:</span>
                  <span>{asrError}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Voice Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Available Voice Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCommands.map((cmd) => (
              <div key={cmd.command} className="p-3 border rounded-lg">
                <h4 className="font-medium capitalize mb-2">{cmd.command.replace('_', ' ')}</h4>
                <div className="space-y-1">
                  {cmd.variations.slice(0, 2).map((variation, index) => (
                    <Badge key={index} variant="outline" className="text-xs mr-1">
                      "{variation}"
                    </Badge>
                  ))}
                  {cmd.variations.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{cmd.variations.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
