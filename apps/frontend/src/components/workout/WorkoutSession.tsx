'use client';

import React, { useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraStage } from '@/components/camera/CameraStage';
import { CueDock } from '@/components/camera/CueDock';
import { useWorkoutStore } from '@/stores/workoutStore';
import { PoseDetectionResult, CoachingCue } from '@/types';
import { 
  Play, 
  Pause, 
  Square, 
  Timer, 
  Target, 
  TrendingUp,
  Activity
} from 'lucide-react';

interface WorkoutSessionProps {
  className?: string;
}

export function WorkoutSession({ className = '' }: WorkoutSessionProps) {
  const {
    currentSession,
    isSessionActive,
    isPaused,
    currentExercise,
    currentSet,
    latestPoseResult,
    activeCues,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    startExercise,
    completeExercise,
    updateExerciseMetrics,
    updatePoseResult,
    addCue,
  } = useWorkoutStore();

  // Handle pose detection results
  const handlePoseDetected = useCallback((result: PoseDetectionResult) => {
    updatePoseResult(result);
    
    // Generate mock coaching cues based on pose data
    if (currentExercise && Math.random() < 0.01) { // 1% chance per frame
      generateMockCue(result);
    }
  }, [updatePoseResult, currentExercise]);

  // Generate mock coaching cues for demonstration
  const generateMockCue = useCallback((poseResult: PoseDetectionResult) => {
    const cueTypes = ['form', 'tempo', 'motivation'] as const;
    const cueType = cueTypes[Math.floor(Math.random() * cueTypes.length)];
    
    const cueMessages = {
      form: [
        'Keep your back straight',
        'Engage your core',
        'Lower your shoulders',
        'Align your knees',
      ],
      tempo: [
        'Slow down the movement',
        'Control the descent',
        'Hold for a moment',
        'Smooth and steady',
      ],
      motivation: [
        'Great form! Keep it up',
        'You\'re doing amazing',
        'Push through, you got this',
        'Excellent control',
      ],
    };

    const messages = cueMessages[cueType];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    const cue: CoachingCue = {
      id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: cueType,
      priority: cueType === 'form' ? 7 : cueType === 'tempo' ? 5 : 3,
      message,
      ttsText: message,
      timestamp: new Date(),
      exercisePhase: 'active',
    };

    addCue(cue);
  }, [addCue]);

  // Mock rep counting based on pose data
  useEffect(() => {
    if (currentSet && latestPoseResult) {
      // Simple mock rep detection based on shoulder movement
      const leftShoulder = latestPoseResult.keypoints.leftShoulder;
      const rightShoulder = latestPoseResult.keypoints.rightShoulder;
      
      if (leftShoulder && rightShoulder) {
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        
        // Mock rep counting logic (simplified)
        if (shoulderY < 0.4 && currentSet.actualReps < (currentSet.targetReps || 10)) {
          // Simulate rep completion
          if (Math.random() < 0.001) { // Very low chance to simulate actual reps
            updateExerciseMetrics({
              actualReps: currentSet.actualReps + 1,
              formScore: Math.min(100, currentSet.formScore + Math.random() * 5),
              tempoScore: Math.min(100, currentSet.tempoScore + Math.random() * 3),
              romScore: Math.min(100, currentSet.romScore + Math.random() * 4),
            });
          }
        }
      }
    }
  }, [latestPoseResult, currentSet, updateExerciseMetrics]);

  const handleStartSession = () => {
    startSession();
  };

  const handlePauseSession = () => {
    if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleEndSession = () => {
    endSession();
  };

  const handleStartExercise = (exerciseName: string) => {
    startExercise(exerciseName, 10); // Default 10 reps
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const sessionDuration = currentSession 
    ? Date.now() - currentSession.startedAt.getTime()
    : 0;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Camera and Pose Detection */}
      <div className="lg:col-span-2">
        <CameraStage 
          onPoseDetected={handlePoseDetected}
          showOverlay={true}
          className="w-full"
        />
      </div>

      {/* Session Controls and Info */}
      <div className="space-y-6">
        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Workout Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSessionActive ? (
              <Button 
                onClick={handleStartSession}
                className="w-full flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Workout
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Timer className="w-4 h-4" />
                  Duration: {formatDuration(sessionDuration)}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handlePauseSession}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  
                  <Button 
                    onClick={handleEndSession}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    End
                  </Button>
                </div>

                {currentSession && (
                  <div className="text-sm text-gray-600">
                    <p>Exercises completed: {currentSession.exercises.length}</p>
                    <p>Status: {isPaused ? 'Paused' : 'Active'}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Exercise */}
        {isSessionActive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Current Exercise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentExercise ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Select an exercise to begin:</p>
                  {['Push-ups', 'Squats', 'Lunges', 'Plank'].map((exercise) => (
                    <Button
                      key={exercise}
                      onClick={() => handleStartExercise(exercise)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {exercise}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold">{currentExercise}</h3>
                  
                  {currentSet && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Reps:</span>
                        <span>{currentSet.actualReps}/{currentSet.targetReps || '∞'}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Form:</span>
                          <span>{Math.round(currentSet.formScore)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${currentSet.formScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Tempo:</span>
                          <span>{Math.round(currentSet.tempoScore)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${currentSet.tempoScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Range:</span>
                          <span>{Math.round(currentSet.romScore)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${currentSet.romScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={completeExercise}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Complete Exercise
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Coaching Cues */}
        {isSessionActive && activeCues.length > 0 && (
          <CueDock 
            autoSpeak={true}
            maxVisibleCues={3}
          />
        )}

        {/* Session Stats */}
        {currentSession && currentSession.exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Exercises:</span>
                  <span>{currentSession.exercises.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Reps:</span>
                  <span>
                    {currentSession.exercises.reduce((sum, ex) => sum + ex.actualReps, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Form Score:</span>
                  <span>
                    {Math.round(
                      currentSession.exercises.reduce((sum, ex) => sum + ex.formScore, 0) / 
                      currentSession.exercises.length
                    )}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
