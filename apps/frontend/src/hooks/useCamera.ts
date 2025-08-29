'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraSettings } from '@/types';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stream: MediaStream | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  devices: MediaDeviceInfo[];
  currentSettings: CameraSettings | null;
  startCamera: (settings?: Partial<CameraSettings>) => Promise<void>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  captureFrame: () => ImageData | null;
  getVideoElement: () => HTMLVideoElement | null;
}

const DEFAULT_SETTINGS: CameraSettings = {
  width: 640,
  height: 480,
  frameRate: 30,
  facingMode: 'user',
};

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentSettings, setCurrentSettings] = useState<CameraSettings | null>(null);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      setError('Failed to access camera devices');
    }
  }, []);

  // Start camera with given settings
  const startCamera = useCallback(async (settings: Partial<CameraSettings> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: finalSettings.deviceId ? { exact: finalSettings.deviceId } : undefined,
          width: { ideal: finalSettings.width },
          height: { ideal: finalSettings.height },
          frameRate: { ideal: finalSettings.frameRate },
          facingMode: finalSettings.facingMode,
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
      }

      setStream(mediaStream);
      setCurrentSettings(finalSettings);
      setIsActive(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
    } finally {
      setIsLoading(false);
    }
  }, [stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setCurrentSettings(null);
  }, [stream]);

  // Switch to different camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (currentSettings) {
      await startCamera({ ...currentSettings, deviceId });
    }
  }, [currentSettings, startCamera]);

  // Capture current frame as ImageData
  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !isActive) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Extract ImageData
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [isActive]);

  // Get video element reference
  const getVideoElement = useCallback(() => videoRef.current, []);

  // Initialize devices on mount
  useEffect(() => {
    getDevices();
  }, [getDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    stream,
    isActive,
    isLoading,
    error,
    devices,
    currentSettings,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    getVideoElement,
  };
}
