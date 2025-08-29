'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseDetectionResult, PoseKeypoints } from '@/types';

interface UsePoseDetectionReturn {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: PoseDetectionResult | null;
  fps: number;
  initialize: () => Promise<void>;
  detectPose: (imageData: ImageData) => Promise<PoseDetectionResult | null>;
  cleanup: () => void;
}

// Mock pose detection for now - will be replaced with actual MediaPipe/MoveNet
class MockPoseDetector {
  private isReady = false;

  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isReady = true;
  }

  async detect(imageData: ImageData): Promise<PoseDetectionResult | null> {
    if (!this.isReady) return null;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps

    // Generate mock pose keypoints
    const mockKeypoints: PoseKeypoints = {
      // Face
      nose: { x: 0.5, y: 0.3, z: 0 },
      leftEyeInner: { x: 0.48, y: 0.28, z: 0 },
      leftEye: { x: 0.47, y: 0.28, z: 0 },
      leftEyeOuter: { x: 0.46, y: 0.28, z: 0 },
      rightEyeInner: { x: 0.52, y: 0.28, z: 0 },
      rightEye: { x: 0.53, y: 0.28, z: 0 },
      rightEyeOuter: { x: 0.54, y: 0.28, z: 0 },
      leftEar: { x: 0.44, y: 0.3, z: 0 },
      rightEar: { x: 0.56, y: 0.3, z: 0 },
      mouthLeft: { x: 0.48, y: 0.32, z: 0 },
      mouthRight: { x: 0.52, y: 0.32, z: 0 },
      
      // Upper body
      leftShoulder: { x: 0.4, y: 0.45, z: 0, visibility: 0.9 },
      rightShoulder: { x: 0.6, y: 0.45, z: 0, visibility: 0.9 },
      leftElbow: { x: 0.35, y: 0.6, z: 0, visibility: 0.8 },
      rightElbow: { x: 0.65, y: 0.6, z: 0, visibility: 0.8 },
      leftWrist: { x: 0.3, y: 0.75, z: 0, visibility: 0.7 },
      rightWrist: { x: 0.7, y: 0.75, z: 0, visibility: 0.7 },
      leftPinky: { x: 0.28, y: 0.77, z: 0 },
      rightPinky: { x: 0.72, y: 0.77, z: 0 },
      leftIndex: { x: 0.29, y: 0.78, z: 0 },
      rightIndex: { x: 0.71, y: 0.78, z: 0 },
      leftThumb: { x: 0.31, y: 0.76, z: 0 },
      rightThumb: { x: 0.69, y: 0.76, z: 0 },
      
      // Core
      leftHip: { x: 0.42, y: 0.8, z: 0, visibility: 0.9 },
      rightHip: { x: 0.58, y: 0.8, z: 0, visibility: 0.9 },
      
      // Lower body
      leftKnee: { x: 0.4, y: 1.1, z: 0, visibility: 0.8 },
      rightKnee: { x: 0.6, y: 1.1, z: 0, visibility: 0.8 },
      leftAnkle: { x: 0.38, y: 1.4, z: 0, visibility: 0.7 },
      rightAnkle: { x: 0.62, y: 1.4, z: 0, visibility: 0.7 },
      leftHeel: { x: 0.36, y: 1.42, z: 0 },
      rightHeel: { x: 0.64, y: 1.42, z: 0 },
      leftFootIndex: { x: 0.39, y: 1.45, z: 0 },
      rightFootIndex: { x: 0.61, y: 1.45, z: 0 },
    };

    return {
      keypoints: mockKeypoints,
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      timestamp: Date.now(),
      frameId: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  cleanup(): void {
    this.isReady = false;
  }
}

export function usePoseDetection(): UsePoseDetectionReturn {
  const detectorRef = useRef<MockPoseDetector | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PoseDetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate FPS
  const updateFps = useCallback(() => {
    const now = performance.now();
    frameTimesRef.current.push(now);
    
    // Keep only last 30 frames for FPS calculation
    if (frameTimesRef.current.length > 30) {
      frameTimesRef.current.shift();
    }
    
    if (frameTimesRef.current.length >= 2) {
      const timeDiff = now - frameTimesRef.current[0];
      const currentFps = (frameTimesRef.current.length - 1) / (timeDiff / 1000);
      setFps(Math.round(currentFps));
    }
  }, []);

  // Initialize pose detector
  const initialize = useCallback(async () => {
    try {
      setError(null);
      
      if (!detectorRef.current) {
        detectorRef.current = new MockPoseDetector();
      }
      
      await detectorRef.current.initialize();
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize pose detector:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize pose detector');
    }
  }, []);

  // Detect pose in image
  const detectPose = useCallback(async (imageData: ImageData): Promise<PoseDetectionResult | null> => {
    if (!detectorRef.current || !isInitialized) {
      return null;
    }

    try {
      setIsProcessing(true);
      const result = await detectorRef.current.detect(imageData);
      
      if (result) {
        setLastResult(result);
        updateFps();
      }
      
      return result;
    } catch (err) {
      console.error('Pose detection failed:', err);
      setError(err instanceof Error ? err.message : 'Pose detection failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isInitialized, updateFps]);

  // Cleanup detector
  const cleanup = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.cleanup();
      detectorRef.current = null;
    }
    setIsInitialized(false);
    setLastResult(null);
    setFps(0);
    frameTimesRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    fps,
    initialize,
    detectPose,
    cleanup,
  };
}
