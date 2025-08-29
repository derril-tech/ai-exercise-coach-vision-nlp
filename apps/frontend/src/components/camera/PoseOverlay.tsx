'use client';

import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { PoseDetectionResult, PoseKeypoints, Landmark } from '@/types';

interface PoseOverlayProps {
  poseResult: PoseDetectionResult;
  videoElement: HTMLVideoElement | null;
  className?: string;
  showKeypoints?: boolean;
  showSkeleton?: boolean;
  keypointColor?: string;
  skeletonColor?: string;
  keypointRadius?: number;
  lineWidth?: number;
}

// Pose skeleton connections
const POSE_CONNECTIONS = [
  // Face
  ['leftEye', 'rightEye'],
  ['leftEye', 'nose'],
  ['rightEye', 'nose'],
  ['leftEar', 'leftEye'],
  ['rightEar', 'rightEye'],
  ['mouthLeft', 'mouthRight'],
  
  // Upper body
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['rightShoulder', 'rightElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightElbow', 'rightWrist'],
  
  // Hands
  ['leftWrist', 'leftThumb'],
  ['leftWrist', 'leftIndex'],
  ['leftWrist', 'leftPinky'],
  ['rightWrist', 'rightThumb'],
  ['rightWrist', 'rightIndex'],
  ['rightWrist', 'rightPinky'],
  
  // Torso
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  
  // Lower body
  ['leftHip', 'leftKnee'],
  ['rightHip', 'rightKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightKnee', 'rightAnkle'],
  
  // Feet
  ['leftAnkle', 'leftHeel'],
  ['rightAnkle', 'rightHeel'],
  ['leftAnkle', 'leftFootIndex'],
  ['rightAnkle', 'rightFootIndex'],
];

export const PoseOverlay = forwardRef<HTMLCanvasElement, PoseOverlayProps>(({
  poseResult,
  videoElement,
  className = '',
  showKeypoints = true,
  showSkeleton = true,
  keypointColor = '#00ff00',
  skeletonColor = '#ff0000',
  keypointRadius = 4,
  lineWidth = 2,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useImperativeHandle(ref, () => canvasRef.current!, []);

  // Draw pose overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !videoElement || !poseResult) {
      return;
    }

    // Set canvas size to match video
    const videoRect = videoElement.getBoundingClientRect();
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.strokeStyle = skeletonColor;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = keypointColor;

    const { keypoints } = poseResult;
    
    // Draw skeleton connections
    if (showSkeleton) {
      ctx.beginPath();
      
      POSE_CONNECTIONS.forEach(([startKey, endKey]) => {
        const startPoint = keypoints[startKey as keyof PoseKeypoints] as Landmark;
        const endPoint = keypoints[endKey as keyof PoseKeypoints] as Landmark;
        
        if (startPoint && endPoint) {
          // Check visibility threshold
          const startVisible = (startPoint.visibility ?? 1) > 0.5;
          const endVisible = (endPoint.visibility ?? 1) > 0.5;
          
          if (startVisible && endVisible) {
            const startX = startPoint.x * canvas.width;
            const startY = startPoint.y * canvas.height;
            const endX = endPoint.x * canvas.width;
            const endY = endPoint.y * canvas.height;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
          }
        }
      });
      
      ctx.stroke();
    }
    
    // Draw keypoints
    if (showKeypoints) {
      Object.values(keypoints).forEach((point: Landmark) => {
        if (point && (point.visibility ?? 1) > 0.5) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          
          ctx.beginPath();
          ctx.arc(x, y, keypointRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add a small border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.strokeStyle = skeletonColor;
          ctx.lineWidth = lineWidth;
        }
      });
    }
    
    // Draw confidence indicator
    const confidence = Math.round(poseResult.confidence * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`Confidence: ${confidence}%`, 10, 30);
    
    // Draw pose quality indicators
    drawPoseQualityIndicators(ctx, keypoints, canvas.width, canvas.height);
    
  }, [poseResult, videoElement, showKeypoints, showSkeleton, keypointColor, skeletonColor, keypointRadius, lineWidth]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ transform: 'scaleX(-1)' }} // Mirror to match video
    />
  );
});

PoseOverlay.displayName = 'PoseOverlay';

// Helper function to draw pose quality indicators
function drawPoseQualityIndicators(
  ctx: CanvasRenderingContext2D, 
  keypoints: PoseKeypoints, 
  width: number, 
  height: number
) {
  // Check if person is centered
  const leftShoulder = keypoints.leftShoulder;
  const rightShoulder = keypoints.rightShoulder;
  
  if (leftShoulder && rightShoulder) {
    const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    
    // Draw center guide
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width * 0.5, 0);
    ctx.lineTo(width * 0.5, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw framing guides
    const idealWidth = 0.3; // 30% of frame width
    const currentWidth = shoulderWidth;
    
    if (currentWidth < idealWidth * 0.8) {
      // Too far
      drawMessage(ctx, 'Move closer', width * 0.5, height * 0.1, '#ff6600');
    } else if (currentWidth > idealWidth * 1.2) {
      // Too close
      drawMessage(ctx, 'Move back', width * 0.5, height * 0.1, '#ff6600');
    }
    
    if (Math.abs(centerX - 0.5) > 0.1) {
      // Off center
      const direction = centerX < 0.5 ? 'right' : 'left';
      drawMessage(ctx, `Move ${direction}`, width * 0.5, height * 0.15, '#ff6600');
    }
  }
  
  // Check visibility of key points
  const criticalPoints = [
    keypoints.leftShoulder,
    keypoints.rightShoulder,
    keypoints.leftHip,
    keypoints.rightHip,
  ];
  
  const visiblePoints = criticalPoints.filter(point => 
    point && (point.visibility ?? 1) > 0.7
  ).length;
  
  if (visiblePoints < criticalPoints.length) {
    drawMessage(ctx, 'Ensure full body is visible', width * 0.5, height * 0.9, '#ff0000');
  }
}

function drawMessage(
  ctx: CanvasRenderingContext2D, 
  message: string, 
  x: number, 
  y: number, 
  color: string
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.font = '16px Arial';
  const metrics = ctx.measureText(message);
  const padding = 8;
  
  ctx.fillRect(
    x - metrics.width / 2 - padding,
    y - 20,
    metrics.width + padding * 2,
    24
  );
  
  ctx.fillStyle = color;
  ctx.fillText(message, x - metrics.width / 2, y);
}
