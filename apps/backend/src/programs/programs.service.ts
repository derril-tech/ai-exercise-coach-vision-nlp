import { Injectable } from '@nestjs/common';

export interface UserProfile {
  userId: string;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  availableTime: number; // minutes
  equipment: string[];
  injuries: string[];
  preferences: {
    exerciseTypes: string[];
    intensity: 'low' | 'moderate' | 'high';
    focusAreas: string[];
  };
}

export interface ExerciseBlock {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'balance';
  duration: number; // seconds
  reps?: number;
  sets?: number;
  restTime: number; // seconds
  difficulty: number; // 1-10
  equipment: string[];
  muscleGroups: string[];
  instructions: string[];
  modifications: {
    easier: string[];
    harder: string[];
  };
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  duration: number; // total minutes
  difficulty: number; // 1-10
  blocks: ExerciseBlock[];
  warmup: ExerciseBlock[];
  cooldown: ExerciseBlock[];
  tags: string[];
  estimatedCalories: number;
}

export interface GenerateProgramRequest {
  userProfile: UserProfile;
  programType?: 'strength' | 'cardio' | 'mixed' | 'flexibility';
  duration?: number; // minutes
  intensity?: 'low' | 'moderate' | 'high';
  focusAreas?: string[];
}

@Injectable()
export class ProgramsService {
  private exerciseDatabase: ExerciseBlock[] = [
    {
      id: 'pushup',
      name: 'Push-ups',
      type: 'strength',
      duration: 180,
      reps: 10,
      sets: 3,
      restTime: 60,
      difficulty: 4,
      equipment: [],
      muscleGroups: ['chest', 'shoulders', 'triceps', 'core'],
      instructions: [
        'Start in plank position with hands shoulder-width apart',
        'Lower body until chest nearly touches floor',
        'Push back up to starting position',
        'Keep core engaged throughout movement'
      ],
      modifications: {
        easier: ['Knee push-ups', 'Wall push-ups', 'Incline push-ups'],
        harder: ['Diamond push-ups', 'One-arm push-ups', 'Decline push-ups']
      }
    },
    {
      id: 'squat',
      name: 'Squats',
      type: 'strength',
      duration: 180,
      reps: 15,
      sets: 3,
      restTime: 60,
      difficulty: 3,
      equipment: [],
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'core'],
      instructions: [
        'Stand with feet shoulder-width apart',
        'Lower body as if sitting back into chair',
        'Keep chest up and knees behind toes',
        'Return to standing position'
      ],
      modifications: {
        easier: ['Chair squats', 'Partial squats', 'Wall squats'],
        harder: ['Jump squats', 'Single-leg squats', 'Goblet squats']
      }
    }
  ];

  async generateProgram(request: GenerateProgramRequest): Promise<WorkoutProgram> {
    const { userProfile, programType = 'mixed', duration = 30 } = request;
    
    // Filter exercises based on user profile
    const availableExercises = this.filterExercisesByProfile(userProfile);
    
    // Select exercises for the program
    const selectedExercises = this.selectExercisesForProgram(availableExercises, duration, userProfile);
    
    // Create warmup and cooldown
    const warmup = this.generateWarmup();
    const cooldown = this.generateCooldown();
    
    // Generate program
    const program: WorkoutProgram = {
      id: `program_${Date.now()}`,
      name: this.generateProgramName(programType, userProfile),
      description: `A ${duration}-minute ${programType} workout for ${userProfile.fitnessLevel} level`,
      duration,
      difficulty: this.calculateOverallDifficulty(selectedExercises, userProfile),
      blocks: selectedExercises,
      warmup,
      cooldown,
      tags: [programType, userProfile.fitnessLevel],
      estimatedCalories: this.calculateCalories(selectedExercises, userProfile)
    };
    
    return program;
  }

  private filterExercisesByProfile(profile: UserProfile): ExerciseBlock[] {
    return this.exerciseDatabase.filter(exercise => {
      const hasRequiredEquipment = exercise.equipment.every(eq => 
        profile.equipment.includes(eq) || exercise.equipment.length === 0
      );
      
      const difficultyRange = this.getDifficultyRange(profile.fitnessLevel);
      const withinDifficultyRange = exercise.difficulty >= difficultyRange.min && 
                                   exercise.difficulty <= difficultyRange.max;
      
      return hasRequiredEquipment && withinDifficultyRange;
    });
  }

  private getDifficultyRange(fitnessLevel: string): { min: number; max: number } {
    switch (fitnessLevel) {
      case 'beginner': return { min: 1, max: 4 };
      case 'intermediate': return { min: 3, max: 7 };
      case 'advanced': return { min: 5, max: 10 };
      default: return { min: 1, max: 10 };
    }
  }

  private selectExercisesForProgram(
    availableExercises: ExerciseBlock[],
    duration: number,
    profile: UserProfile
  ): ExerciseBlock[] {
    const targetCount = Math.max(3, Math.min(6, Math.floor(duration / 5)));
    return availableExercises.slice(0, targetCount);
  }

  private generateWarmup(): ExerciseBlock[] {
    return [{
      id: 'warmup',
      name: 'Dynamic Warmup',
      type: 'flexibility',
      duration: 300,
      sets: 1,
      restTime: 0,
      difficulty: 1,
      equipment: [],
      muscleGroups: ['full_body'],
      instructions: ['Light movement to prepare body'],
      modifications: { easier: [], harder: [] }
    }];
  }

  private generateCooldown(): ExerciseBlock[] {
    return [{
      id: 'cooldown',
      name: 'Cool Down Stretch',
      type: 'flexibility',
      duration: 300,
      sets: 1,
      restTime: 0,
      difficulty: 1,
      equipment: [],
      muscleGroups: ['full_body'],
      instructions: ['Gentle stretching to recover'],
      modifications: { easier: [], harder: [] }
    }];
  }

  private calculateCalories(exercises: ExerciseBlock[], profile: UserProfile): number {
    const baseCaloriesPerMinute = { strength: 6, cardio: 8, flexibility: 3, balance: 4 };
    let totalCalories = 0;
    
    exercises.forEach(exercise => {
      const durationMinutes = exercise.duration / 60;
      const baseCalories = baseCaloriesPerMinute[exercise.type] || 5;
      totalCalories += baseCalories * durationMinutes;
    });
    
    return Math.round(totalCalories);
  }

  private calculateOverallDifficulty(exercises: ExerciseBlock[], profile: UserProfile): number {
    if (exercises.length === 0) return 1;
    return Math.round(exercises.reduce((sum, ex) => sum + ex.difficulty, 0) / exercises.length);
  }

  private generateProgramName(programType: string, profile: UserProfile): string {
    const levelNames = { beginner: 'Starter', intermediate: 'Progressive', advanced: 'Elite' };
    const typeNames = { strength: 'Strength', cardio: 'Cardio', mixed: 'Total Body', flexibility: 'Flexibility' };
    
    return `${levelNames[profile.fitnessLevel]} ${typeNames[programType]}`;
  }

  async getExerciseLibrary(): Promise<ExerciseBlock[]> {
    return this.exerciseDatabase;
  }
}