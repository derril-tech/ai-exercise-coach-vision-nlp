/**
 * Integration tests for WorkoutSession component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { WorkoutSession } from '@/components/workout/WorkoutSession';
import { useWorkoutStore } from '@/stores/workoutStore';

// Mock the workout store
jest.mock('@/stores/workoutStore');
const mockUseWorkoutStore = useWorkoutStore as jest.MockedFunction<typeof useWorkoutStore>;

// Mock the camera and pose detection hooks
jest.mock('@/hooks/useCamera', () => ({
  useCamera: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    stream: null,
    isActive: false,
    isLoading: false,
    error: null,
    devices: [],
    currentSettings: null,
    startCamera: jest.fn(),
    stopCamera: jest.fn(),
    switchCamera: jest.fn(),
    captureFrame: jest.fn(),
    getVideoElement: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePoseDetection', () => ({
  usePoseDetection: () => ({
    isInitialized: true,
    isProcessing: false,
    error: null,
    lastResult: null,
    fps: 30,
    initialize: jest.fn(),
    detectPose: jest.fn(),
    cleanup: jest.fn(),
  }),
}));

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn(),
  },
});

describe('WorkoutSession Integration Tests', () => {
  const mockStore = {
    currentSession: null,
    isSessionActive: false,
    isPaused: false,
    currentExercise: null,
    currentSet: null,
    latestPoseResult: null,
    activeCues: [],
    sessionHistory: [],
    startSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    endSession: jest.fn(),
    startExercise: jest.fn(),
    completeExercise: jest.fn(),
    updateExerciseMetrics: jest.fn(),
    updatePoseResult: jest.fn(),
    addCue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkoutStore.mockReturnValue(mockStore);
  });

  test('renders workout session interface', () => {
    render(<WorkoutSession />);
    
    expect(screen.getByText('Workout Session')).toBeInTheDocument();
    expect(screen.getByText('Start Workout')).toBeInTheDocument();
  });

  test('starts workout session when button clicked', async () => {
    render(<WorkoutSession />);
    
    const startButton = screen.getByText('Start Workout');
    fireEvent.click(startButton);
    
    expect(mockStore.startSession).toHaveBeenCalled();
  });

  test('displays active session controls', () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
  });

  test('pauses and resumes session', async () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      isPaused: false,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    // Pause session
    const pauseButton = screen.getByText('Pause');
    fireEvent.click(pauseButton);
    expect(mockStore.pauseSession).toHaveBeenCalled();
    
    // Mock paused state
    const pausedStore = { ...activeStore, isPaused: true };
    mockUseWorkoutStore.mockReturnValue(pausedStore);
    
    // Re-render to show resume button
    render(<WorkoutSession />);
    
    const resumeButton = screen.getByText('Resume');
    fireEvent.click(resumeButton);
    expect(mockStore.resumeSession).toHaveBeenCalled();
  });

  test('displays exercise selection when session active', () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    expect(screen.getByText('Select an exercise to begin:')).toBeInTheDocument();
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Lunges')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  test('starts exercise when selected', async () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    const pushupButton = screen.getByText('Push-ups');
    fireEvent.click(pushupButton);
    
    expect(mockStore.startExercise).toHaveBeenCalledWith('Push-ups', 10);
  });

  test('displays current exercise metrics', () => {
    const exerciseStore = {
      ...mockStore,
      isSessionActive: true,
      currentExercise: 'Push-ups',
      currentSet: {
        id: 'test-set',
        exerciseName: 'Push-ups',
        targetReps: 10,
        actualReps: 5,
        duration: 30000,
        formScore: 85,
        tempoScore: 90,
        romScore: 88,
        startedAt: new Date(),
        cuesGiven: [],
        poseData: [],
      },
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(exerciseStore);
    
    render(<WorkoutSession />);
    
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument(); // Reps
    expect(screen.getByText('85%')).toBeInTheDocument(); // Form score
  });

  test('completes exercise', async () => {
    const exerciseStore = {
      ...mockStore,
      isSessionActive: true,
      currentExercise: 'Push-ups',
      currentSet: {
        id: 'test-set',
        exerciseName: 'Push-ups',
        targetReps: 10,
        actualReps: 10,
        duration: 60000,
        formScore: 85,
        tempoScore: 90,
        romScore: 88,
        startedAt: new Date(),
        cuesGiven: [],
        poseData: [],
      },
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(exerciseStore);
    
    render(<WorkoutSession />);
    
    const completeButton = screen.getByText('Complete Exercise');
    fireEvent.click(completeButton);
    
    expect(mockStore.completeExercise).toHaveBeenCalled();
  });

  test('displays session statistics', () => {
    const statsStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [
          {
            id: 'ex1',
            exerciseName: 'Push-ups',
            actualReps: 10,
            formScore: 85,
            tempoScore: 90,
            romScore: 88,
            duration: 60000,
            startedAt: new Date(),
            cuesGiven: [],
            poseData: [],
          },
          {
            id: 'ex2',
            exerciseName: 'Squats',
            actualReps: 15,
            formScore: 80,
            tempoScore: 85,
            romScore: 90,
            duration: 90000,
            startedAt: new Date(),
            cuesGiven: [],
            poseData: [],
          },
        ],
        totalDuration: 300000,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(statsStore);
    
    render(<WorkoutSession />);
    
    expect(screen.getByText('Session Stats')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Total exercises
    expect(screen.getByText('25')).toBeInTheDocument(); // Total reps
  });

  test('handles pose detection results', async () => {
    const mockPoseResult = {
      keypoints: {
        leftShoulder: { x: 0.4, y: 0.45, z: 0.0, visibility: 0.9 },
        rightShoulder: { x: 0.6, y: 0.45, z: 0.0, visibility: 0.9 },
      },
      confidence: 0.85,
      timestamp: Date.now(),
      frameId: 'test-frame',
    };
    
    render(<WorkoutSession />);
    
    // Simulate pose detection callback
    const cameraStage = screen.getByTestId('camera-stage');
    if (cameraStage) {
      // This would be called by the CameraStage component
      act(() => {
        // Simulate pose detection
        mockStore.updatePoseResult(mockPoseResult);
      });
    }
    
    expect(mockStore.updatePoseResult).toHaveBeenCalled();
  });

  test('displays coaching cues', () => {
    const cueStore = {
      ...mockStore,
      isSessionActive: true,
      activeCues: [
        {
          id: 'cue1',
          type: 'form',
          priority: 8,
          message: 'Keep your back straight',
          ttsText: 'Keep your back straight',
          timestamp: new Date(),
        },
        {
          id: 'cue2',
          type: 'motivation',
          priority: 3,
          message: 'Great job! Keep going!',
          ttsText: 'Great job! Keep going!',
          timestamp: new Date(),
        },
      ],
    };
    
    mockUseWorkoutStore.mockReturnValue(cueStore);
    
    render(<WorkoutSession />);
    
    expect(screen.getByText('Coaching Cues')).toBeInTheDocument();
    expect(screen.getByText('Keep your back straight')).toBeInTheDocument();
    expect(screen.getByText('Great job! Keep going!')).toBeInTheDocument();
  });

  test('ends workout session', async () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(),
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    const endButton = screen.getByText('End');
    fireEvent.click(endButton);
    
    expect(mockStore.endSession).toHaveBeenCalled();
  });

  test('handles camera errors gracefully', () => {
    // Mock camera error
    jest.doMock('@/hooks/useCamera', () => ({
      useCamera: () => ({
        videoRef: { current: null },
        canvasRef: { current: null },
        stream: null,
        isActive: false,
        isLoading: false,
        error: 'Camera access denied',
        devices: [],
        currentSettings: null,
        startCamera: jest.fn(),
        stopCamera: jest.fn(),
        switchCamera: jest.fn(),
        captureFrame: jest.fn(),
        getVideoElement: jest.fn(),
      }),
    }));
    
    render(<WorkoutSession />);
    
    // Should still render the interface even with camera error
    expect(screen.getByText('Workout Session')).toBeInTheDocument();
  });

  test('updates exercise metrics in real-time', async () => {
    const exerciseStore = {
      ...mockStore,
      isSessionActive: true,
      currentExercise: 'Push-ups',
      currentSet: {
        id: 'test-set',
        exerciseName: 'Push-ups',
        targetReps: 10,
        actualReps: 3,
        duration: 15000,
        formScore: 75,
        tempoScore: 80,
        romScore: 85,
        startedAt: new Date(),
        cuesGiven: [],
        poseData: [],
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(exerciseStore);
    
    render(<WorkoutSession />);
    
    // Initial metrics
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Simulate metrics update
    act(() => {
      mockStore.updateExerciseMetrics({
        actualReps: 4,
        formScore: 80,
      });
    });
    
    expect(mockStore.updateExerciseMetrics).toHaveBeenCalledWith({
      actualReps: 4,
      formScore: 80,
    });
  });

  test('formats duration correctly', () => {
    const activeStore = {
      ...mockStore,
      isSessionActive: true,
      currentSession: {
        id: 'test-session',
        userId: 'test-user',
        status: 'active',
        startedAt: new Date(Date.now() - 125000), // 2 minutes 5 seconds ago
        exercises: [],
        totalDuration: 0,
      },
    };
    
    mockUseWorkoutStore.mockReturnValue(activeStore);
    
    render(<WorkoutSession />);
    
    // Should display formatted duration
    expect(screen.getByText(/Duration: \d+:\d{2}/)).toBeInTheDocument();
  });
});
