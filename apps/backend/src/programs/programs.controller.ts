import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProgramsService, GenerateProgramRequest, WorkoutProgram, ExerciseBlock } from './programs.service';

@ApiTags('programs')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a personalized workout program' })
  @ApiResponse({ status: 201, description: 'Program generated successfully' })
  async generateProgram(@Body() request: GenerateProgramRequest): Promise<WorkoutProgram> {
    return this.programsService.generateProgram(request);
  }

  @Get('exercises')
  @ApiOperation({ summary: 'Get exercise library' })
  @ApiResponse({ status: 200, description: 'Exercise library retrieved' })
  async getExerciseLibrary(): Promise<ExerciseBlock[]> {
    return this.programsService.getExerciseLibrary();
  }

  @Get('exercises/:id')
  @ApiOperation({ summary: 'Get specific exercise by ID' })
  @ApiResponse({ status: 200, description: 'Exercise retrieved' })
  async getExercise(@Param('id') id: string): Promise<ExerciseBlock | null> {
    return this.programsService.getExerciseLibrary().then(exercises => 
      exercises.find(ex => ex.id === id) || null
    );
  }

  @Post('quick-generate')
  @ApiOperation({ summary: 'Quick program generation with minimal input' })
  @ApiResponse({ status: 201, description: 'Quick program generated' })
  async quickGenerate(
    @Body() body: {
      fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
      duration: number;
      programType?: 'strength' | 'cardio' | 'mixed' | 'flexibility';
    }
  ): Promise<WorkoutProgram> {
    const request: GenerateProgramRequest = {
      userProfile: {
        userId: 'quick-user',
        fitnessLevel: body.fitnessLevel,
        goals: ['general_fitness'],
        availableTime: body.duration,
        equipment: [],
        injuries: [],
        preferences: {
          exerciseTypes: ['strength', 'cardio'],
          intensity: 'moderate',
          focusAreas: []
        }
      },
      programType: body.programType || 'mixed',
      duration: body.duration
    };

    return this.programsService.generateProgram(request);
  }
}