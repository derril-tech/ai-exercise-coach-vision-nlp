'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { PoseOverlay } from './PoseOverlay';
import { CameraControls } from './CameraControls';
import { PoseDetectionResult } from '@/types';
import { Play, Square, Camera, AlertCircle } from 'lucide-react';

interface CameraStageProps {
  onPoseDetected?: (result: PoseDetectionResult) => void;
  showOverlay?: boolean;
  className?: string;
}

export function CameraStage({ 
  onPoseDetected, 
  showOverlay = true, 
  className = '' 
}: CameraStageProps) {
  const {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    error: cameraError,
    devices,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
  } = useCamera();

  const {
    isInitialized,
    isProcessing,
    error: poseError,
    lastResult,
    fps,
    initialize: initializePoseDetection,
    detectPose,
    cleanup: cleanupPoseDetection,
  } = usePoseDetection();

  const [isDetecting, setIsDetecting] = useState(false);
  const animationFrameRef = useRef<number>();
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize pose detection when component mounts
  useEffect(() => {
    initializePoseDetection();
    return () => {
      cleanupPoseDetection();
    };
  }, [initializePoseDetection, cleanupPoseDetection]);

  // Pose detection loop
  const runPoseDetection = useCallback(async () => {
    if (!isActive || !isInitialized || !isDetecting) {
      return;
    }

    const imageData = captureFrame();
    if (imageData) {
      const result = await detectPose(imageData);
      if (result && onPoseDetected) {
        onPoseDetected(result);
      }
    }

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(runPoseDetection);
  }, [isActive, isInitialized, isDetecting, captureFrame, detectPose, onPoseDetected]);

  // Start/stop pose detection
  useEffect(() => {
    if (isDetecting && isActive && isInitialized) {
      runPoseDetection();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDetecting, isActive, isInitialized, runPoseDetection]);

  const handleStartCamera = async () => {
    await startCamera();
  };

  const handleStopCamera = () => {
    setIsDetecting(false);
    stopCamera();
  };

  const handleStartDetection = () => {
    if (isActive && isInitialized) {
      setIsDetecting(true);
    }
  };

  const handleStopDetection = () => {
    setIsDetecting(false);
  };

  const error = cameraError || poseError;

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="relative">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto bg-black"
          style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
        />
        
        {/* Hidden canvas for frame capture */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Pose Overlay Canvas */}
        {showOverlay && lastResult && (
          <PoseOverlay
            ref={overlayCanvasRef}
            poseResult={lastResult}
            videoElement={videoRef.current}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        )}
        
        {/* Status Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isActive && (
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
          
          {isDetecting && (
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              Pose Detection: {fps} FPS
            </div>
          )}
          
          {isProcessing && (
            <div className="bg-black/70 text-yellow-400 px-3 py-1 rounded-full text-sm">
              Processing...
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-red-500/90 text-white p-4 rounded-lg flex items-center gap-3 max-w-md">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Camera Error</h3>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {(isLoading || !isInitialized) && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
              <p>{isLoading ? 'Starting camera...' : 'Initializing pose detection...'}</p>
            </div>
          </div>
        )}
        
        {/* No Camera State */}
        {!isActive && !isLoading && !error && (
          <div className="aspect-video bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Camera className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Camera not active</p>
              <p className="text-sm">Click start to begin</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isActive ? (
              <Button 
                onClick={handleStartCamera}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Camera
              </Button>
            ) : (
              <Button 
                onClick={handleStopCamera}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Camera
              </Button>
            )}
            
            {isActive && isInitialized && (
              <>
                {!isDetecting ? (
                  <Button 
                    onClick={handleStartDetection}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Detection
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopDetection}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Detection
                  </Button>
                )}
              </>
            )}
          </div>
          
          {/* Camera Controls */}
          {devices.length > 1 && (
            <CameraControls
              devices={devices}
              onSwitchCamera={switchCamera}
            />
          )}
        </div>
        
        {/* Status Info */}
        {lastResult && (
          <div className="mt-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Confidence: {(lastResult.confidence * 100).toFixed(1)}%</span>
              <span>FPS: {fps}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
