import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WorkoutSession, ExerciseSet, CoachingCue, PoseDetectionResult } from '@/types';

interface WorkoutState {
  // Session state
  currentSession: WorkoutSession | null;
  isSessionActive: boolean;
  isPaused: boolean;
  
  // Current exercise
  currentExercise: string | null;
  currentSet: ExerciseSet | null;
  
  // Real-time data
  latestPoseResult: PoseDetectionResult | null;
  activeCues: CoachingCue[];
  
  // Session history
  sessionHistory: WorkoutSession[];
  
  // Actions
  startSession: (programId?: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  
  // Exercise actions
  startExercise: (exerciseName: string, targetReps?: number) => void;
  completeExercise: () => void;
  updateExerciseMetrics: (metrics: Partial<ExerciseSet>) => void;
  
  // Real-time updates
  updatePoseResult: (result: PoseDetectionResult) => void;
  addCue: (cue: CoachingCue) => void;
  dismissCue: (cueId: string) => void;
  clearCues: () => void;
  
  // History
  addToHistory: (session: WorkoutSession) => void;
  clearHistory: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      isSessionActive: false,
      isPaused: false,
      currentExercise: null,
      currentSet: null,
      latestPoseResult: null,
      activeCues: [],
      sessionHistory: [],

      // Session actions
      startSession: (programId?: string) => {
        const session: WorkoutSession = {
          id: `session_${Date.now()}`,
          userId: 'demo_user', // TODO: Get from auth
          programId,
          status: 'active',
          startedAt: new Date(),
          exercises: [],
          totalDuration: 0,
        };

        set({
          currentSession: session,
          isSessionActive: true,
          isPaused: false,
          activeCues: [],
        });
      },

      pauseSession: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            isPaused: true,
            currentSession: {
              ...currentSession,
              status: 'paused',
            },
          });
        }
      },

      resumeSession: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            isPaused: false,
            currentSession: {
              ...currentSession,
              status: 'active',
            },
          });
        }
      },

      endSession: () => {
        const { currentSession, sessionHistory } = get();
        if (currentSession) {
          const completedSession: WorkoutSession = {
            ...currentSession,
            status: 'completed',
            endedAt: new Date(),
            totalDuration: Date.now() - currentSession.startedAt.getTime(),
          };

          set({
            currentSession: null,
            isSessionActive: false,
            isPaused: false,
            currentExercise: null,
            currentSet: null,
            activeCues: [],
            sessionHistory: [completedSession, ...sessionHistory],
          });
        }
      },

      // Exercise actions
      startExercise: (exerciseName: string, targetReps?: number) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const exerciseSet: ExerciseSet = {
          id: `set_${Date.now()}`,
          exerciseName,
          targetReps,
          actualReps: 0,
          duration: 0,
          formScore: 0,
          tempoScore: 0,
          romScore: 0,
          startedAt: new Date(),
          cuesGiven: [],
          poseData: [],
        };

        set({
          currentExercise: exerciseName,
          currentSet: exerciseSet,
          currentSession: {
            ...currentSession,
            currentExercise: exerciseName,
          },
        });
      },

      completeExercise: () => {
        const { currentSession, currentSet } = get();
        if (!currentSession || !currentSet) return;

        const completedSet: ExerciseSet = {
          ...currentSet,
          completedAt: new Date(),
          duration: Date.now() - currentSet.startedAt.getTime(),
        };

        const updatedSession: WorkoutSession = {
          ...currentSession,
          exercises: [...currentSession.exercises, completedSet],
          currentExercise: undefined,
        };

        set({
          currentExercise: null,
          currentSet: null,
          currentSession: updatedSession,
        });
      },

      updateExerciseMetrics: (metrics: Partial<ExerciseSet>) => {
        const { currentSet } = get();
        if (!currentSet) return;

        set({
          currentSet: {
            ...currentSet,
            ...metrics,
          },
        });
      },

      // Real-time updates
      updatePoseResult: (result: PoseDetectionResult) => {
        const { currentSet } = get();
        
        set({ latestPoseResult: result });

        // Add pose data to current set if active
        if (currentSet) {
          const updatedPoseData = [...(currentSet.poseData || []), result];
          // Keep only last 100 poses to prevent memory issues
          if (updatedPoseData.length > 100) {
            updatedPoseData.shift();
          }

          set({
            currentSet: {
              ...currentSet,
              poseData: updatedPoseData,
            },
          });
        }
      },

      addCue: (cue: CoachingCue) => {
        const { activeCues, currentSet } = get();
        
        // Add to active cues (sorted by priority)
        const newActiveCues = [...activeCues, cue].sort((a, b) => b.priority - a.priority);
        
        // Keep only top 3 cues
        if (newActiveCues.length > 3) {
          newActiveCues.splice(3);
        }

        set({ activeCues: newActiveCues });

        // Add to current set's cue history
        if (currentSet) {
          set({
            currentSet: {
              ...currentSet,
              cuesGiven: [...currentSet.cuesGiven, cue.message],
            },
          });
        }
      },

      dismissCue: (cueId: string) => {
        const { activeCues } = get();
        set({
          activeCues: activeCues.filter(cue => cue.id !== cueId),
        });
      },

      clearCues: () => {
        set({ activeCues: [] });
      },

      // History management
      addToHistory: (session: WorkoutSession) => {
        const { sessionHistory } = get();
        set({
          sessionHistory: [session, ...sessionHistory.slice(0, 49)], // Keep last 50 sessions
        });
      },

      clearHistory: () => {
        set({ sessionHistory: [] });
      },
    }),
    {
      name: 'workout-store',
    }
  )
);
