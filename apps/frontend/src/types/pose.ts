/**
 * Pose detection and exercise types
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseKeypoints {
  // Face
  nose: Landmark;
  leftEyeInner: Landmark;
  leftEye: Landmark;
  leftEyeOuter: Landmark;
  rightEyeInner: Landmark;
  rightEye: Landmark;
  rightEyeOuter: Landmark;
  leftEar: Landmark;
  rightEar: Landmark;
  mouthLeft: Landmark;
  mouthRight: Landmark;
  
  // Upper body
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftElbow: Landmark;
  rightElbow: Landmark;
  leftWrist: Landmark;
  rightWrist: Landmark;
  leftPinky: Landmark;
  rightPinky: Landmark;
  leftIndex: Landmark;
  rightIndex: Landmark;
  leftThumb: Landmark;
  rightThumb: Landmark;
  
  // Core
  leftHip: Landmark;
  rightHip: Landmark;
  
  // Lower body
  leftKnee: Landmark;
  rightKnee: Landmark;
  leftAnkle: Landmark;
  rightAnkle: Landmark;
  leftHeel: Landmark;
  rightHeel: Landmark;
  leftFootIndex: Landmark;
  rightFootIndex: Landmark;
}

export interface PoseDetectionResult {
  keypoints: PoseKeypoints;
  confidence: number;
  timestamp: number;
  frameId: string;
}

export interface ExerciseMetrics {
  repCount: number;
  formScore: number; // 0-100
  tempoScore: number; // 0-100
  rangeOfMotionScore: number; // 0-100
  currentPhase: 'up' | 'down' | 'hold' | 'rest';
}

export interface WorkoutSession {
  id: string;
  userId: string;
  programId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: Date;
  endedAt?: Date;
  currentExercise?: string;
  exercises: ExerciseSet[];
  totalDuration: number;
  caloriesBurned?: number;
}

export interface ExerciseSet {
  id: string;
  exerciseName: string;
  targetReps?: number;
  actualReps: number;
  duration: number;
  formScore: number;
  tempoScore: number;
  romScore: number;
  startedAt: Date;
  completedAt?: Date;
  cuesGiven: string[];
  poseData?: PoseDetectionResult[];
}

export interface CoachingCue {
  id: string;
  type: 'safety' | 'form' | 'tempo' | 'motivation' | 'instruction';
  priority: number; // 1-10, 10 being highest
  message: string;
  ttsText: string;
  timestamp: Date;
  exercisePhase?: string;
  bodyPart?: string;
}

export interface CameraSettings {
  deviceId?: string;
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
}

export interface CalibrationData {
  userHeight?: number; // cm
  armSpan?: number; // cm
  cameraDistance?: number; // cm
  cameraAngle?: number; // degrees
  referencePoints?: Point2D[];
  timestamp: Date;
}
