'use client';

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useTTS } from '@/hooks/useTTS';
import { CoachingCue } from '@/types';
import { X, Volume2, VolumeX, AlertTriangle, Info, Target, Zap } from 'lucide-react';

interface CueDockProps {
  className?: string;
  autoSpeak?: boolean;
  maxVisibleCues?: number;
}

const CUE_ICONS = {
  safety: AlertTriangle,
  form: Target,
  tempo: Zap,
  motivation: Volume2,
  instruction: Info,
};

const CUE_COLORS = {
  safety: 'border-red-500 bg-red-50 text-red-800',
  form: 'border-orange-500 bg-orange-50 text-orange-800',
  tempo: 'border-blue-500 bg-blue-50 text-blue-800',
  motivation: 'border-green-500 bg-green-50 text-green-800',
  instruction: 'border-gray-500 bg-gray-50 text-gray-800',
};

export function CueDock({ 
  className = '', 
  autoSpeak = true, 
  maxVisibleCues = 3 
}: CueDockProps) {
  const { activeCues, dismissCue, clearCues } = useWorkoutStore();
  const { speak, isSpeaking, stop, isSupported } = useTTS();

  // Auto-speak new cues
  useEffect(() => {
    if (!autoSpeak || !isSupported) return;

    const latestCue = activeCues[0]; // Highest priority cue
    if (latestCue && !isSpeaking) {
      const priority = latestCue.type === 'safety' ? 'high' : 'normal';
      speak(latestCue.ttsText, { priority });
    }
  }, [activeCues, autoSpeak, isSupported, speak, isSpeaking]);

  const handleDismissCue = (cueId: string) => {
    dismissCue(cueId);
  };

  const handleClearAll = () => {
    stop(); // Stop any ongoing speech
    clearCues();
  };

  const handleReplayCue = (cue: CoachingCue) => {
    const priority = cue.type === 'safety' ? 'high' : 'normal';
    speak(cue.ttsText, { priority });
  };

  if (activeCues.length === 0) {
    return null;
  }

  const visibleCues = activeCues.slice(0, maxVisibleCues);

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Coaching Cues</h3>
          <div className="flex gap-2">
            {isSupported && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => stop()}
                disabled={!isSpeaking}
                className="h-6 w-6 p-0"
              >
                <VolumeX className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearAll}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {visibleCues.map((cue) => {
            const Icon = CUE_ICONS[cue.type];
            const colorClass = CUE_COLORS[cue.type];

            return (
              <div
                key={cue.id}
                className={`relative p-3 rounded-lg border-l-4 ${colorClass} transition-all duration-200`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {cue.message}
                    </p>
                    
                    {cue.bodyPart && (
                      <p className="text-xs opacity-75 mt-1">
                        Focus: {cue.bodyPart}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {isSupported && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReplayCue(cue)}
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissCue(cue.id)}
                      className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Priority indicator */}
                <div className="absolute top-1 right-1">
                  <div className={`w-2 h-2 rounded-full ${
                    cue.priority >= 8 ? 'bg-red-500' :
                    cue.priority >= 6 ? 'bg-orange-500' :
                    cue.priority >= 4 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                </div>
              </div>
            );
          })}

          {activeCues.length > maxVisibleCues && (
            <div className="text-center py-2">
              <p className="text-xs text-gray-500">
                +{activeCues.length - maxVisibleCues} more cues
              </p>
            </div>
          )}
        </div>

        {/* TTS Status */}
        {isSupported && isSpeaking && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Speaking...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
