'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Target, 
  Zap, 
  Users,
  Settings,
  Play,
  Save
} from 'lucide-react';

interface ExerciseBlock {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'balance';
  duration: number;
  reps?: number;
  sets?: number;
  restTime: number;
  difficulty: number;
  equipment: string[];
  muscleGroups: string[];
  instructions: string[];
}

interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  duration: number;
  difficulty: number;
  blocks: ExerciseBlock[];
  warmup: ExerciseBlock[];
  cooldown: ExerciseBlock[];
  tags: string[];
  estimatedCalories: number;
}

const EXERCISE_LIBRARY: ExerciseBlock[] = [
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
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    instructions: ['Start in plank position', 'Lower chest to floor', 'Push back up']
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
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    instructions: ['Stand with feet apart', 'Lower as if sitting', 'Return to standing']
  },
  {
    id: 'plank',
    name: 'Plank',
    type: 'strength',
    duration: 60,
    sets: 3,
    restTime: 30,
    difficulty: 5,
    equipment: [],
    muscleGroups: ['core', 'shoulders'],
    instructions: ['Hold push-up position', 'Keep body straight', 'Breathe normally']
  },
  {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    type: 'cardio',
    duration: 60,
    reps: 30,
    sets: 3,
    restTime: 30,
    difficulty: 3,
    equipment: [],
    muscleGroups: ['full_body'],
    instructions: ['Jump feet apart', 'Raise arms overhead', 'Return to start']
  },
  {
    id: 'lunges',
    name: 'Lunges',
    type: 'strength',
    duration: 180,
    reps: 12,
    sets: 3,
    restTime: 60,
    difficulty: 4,
    equipment: [],
    muscleGroups: ['quadriceps', 'glutes'],
    instructions: ['Step forward', 'Lower hips', 'Push back to start']
  }
];

export function ProgramBuilder() {
  const [program, setProgram] = useState<WorkoutProgram>({
    id: 'new-program',
    name: 'Custom Workout',
    description: 'Build your own workout program',
    duration: 0,
    difficulty: 1,
    blocks: [],
    warmup: [],
    cooldown: [],
    tags: ['custom'],
    estimatedCalories: 0
  });

  const [selectedExercise, setSelectedExercise] = useState<ExerciseBlock | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === 'exercise-library' && destination.droppableId === 'program-blocks') {
      // Add exercise from library to program
      const exercise = EXERCISE_LIBRARY.find(ex => ex.id === result.draggableId);
      if (exercise) {
        const newExercise = { ...exercise, id: `${exercise.id}-${Date.now()}` };
        setProgram(prev => ({
          ...prev,
          blocks: [...prev.blocks, newExercise]
        }));
      }
    } else if (source.droppableId === 'program-blocks' && destination.droppableId === 'program-blocks') {
      // Reorder exercises within program
      const newBlocks = Array.from(program.blocks);
      const [reorderedItem] = newBlocks.splice(source.index, 1);
      newBlocks.splice(destination.index, 0, reorderedItem);
      
      setProgram(prev => ({
        ...prev,
        blocks: newBlocks
      }));
    }
  }, [program.blocks]);

  const removeExercise = useCallback((exerciseId: string) => {
    setProgram(prev => ({
      ...prev,
      blocks: prev.blocks.filter(ex => ex.id !== exerciseId)
    }));
  }, []);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<ExerciseBlock>) => {
    setProgram(prev => ({
      ...prev,
      blocks: prev.blocks.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      )
    }));
  }, []);

  const calculateProgramStats = useCallback(() => {
    const totalDuration = program.blocks.reduce((sum, ex) => {
      const exerciseTime = ex.duration * (ex.sets || 1);
      const restTime = ex.restTime * ((ex.sets || 1) - 1);
      return sum + exerciseTime + restTime;
    }, 0);

    const avgDifficulty = program.blocks.length > 0 
      ? program.blocks.reduce((sum, ex) => sum + ex.difficulty, 0) / program.blocks.length
      : 1;

    const estimatedCalories = Math.round(totalDuration / 60 * 6); // Rough estimate

    return {
      duration: Math.round(totalDuration / 60),
      difficulty: Math.round(avgDifficulty),
      calories: estimatedCalories
    };
  }, [program.blocks]);

  const stats = calculateProgramStats();

  const filteredExercises = EXERCISE_LIBRARY.filter(exercise => 
    filterType === 'all' || exercise.type === filterType
  );

  const getTypeColor = (type: string) => {
    const colors = {
      strength: 'bg-blue-100 text-blue-800',
      cardio: 'bg-red-100 text-red-800',
      flexibility: 'bg-green-100 text-green-800',
      balance: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-600';
    if (difficulty <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Program Builder</h1>
          <p className="text-muted-foreground">Create your custom workout program</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Program
          </Button>
          <Button className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Preview Workout
          </Button>
        </div>
      </div>

      {/* Program Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Program Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.duration}</div>
              <div className="text-sm text-blue-700">Minutes</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Zap className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.difficulty}/10</div>
              <div className="text-sm text-green-700">Difficulty</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{stats.calories}</div>
              <div className="text-sm text-orange-700">Calories</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{program.blocks.length}</div>
              <div className="text-sm text-purple-700">Exercises</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exercise Library */}
          <Card>
            <CardHeader>
              <CardTitle>Exercise Library</CardTitle>
              <div className="flex gap-2">
                {['all', 'strength', 'cardio', 'flexibility'].map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="exercise-library" isDropDisabled>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 max-h-96 overflow-y-auto"
                  >
                    {filteredExercises.map((exercise, index) => (
                      <Draggable
                        key={exercise.id}
                        draggableId={exercise.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 border rounded-lg cursor-move transition-colors ${
                              snapshot.isDragging ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{exercise.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getTypeColor(exercise.type)}>
                                    {exercise.type}
                                  </Badge>
                                  <span className={`text-sm font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                                    Difficulty: {exercise.difficulty}/10
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedExercise(exercise)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              {exercise.reps ? `${exercise.reps} reps` : `${exercise.duration}s`} × {exercise.sets} sets
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Program Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Your Program</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag exercises from the library to build your workout
              </p>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="program-blocks">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-64 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    {program.blocks.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Drag exercises here to build your program</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {program.blocks.map((exercise, index) => (
                          <Draggable
                            key={exercise.id}
                            draggableId={exercise.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 bg-white border rounded-lg shadow-sm transition-all ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{index + 1}.</span>
                                      <h3 className="font-medium">{exercise.name}</h3>
                                      <Badge className={getTypeColor(exercise.type)}>
                                        {exercise.type}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {exercise.reps ? `${exercise.reps} reps` : `${exercise.duration}s`} × {exercise.sets} sets
                                      {exercise.restTime > 0 && ` • ${exercise.restTime}s rest`}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedExercise(exercise)}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeExercise(exercise.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </DragDropContext>

      {/* Exercise Details Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{selectedExercise.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Instructions</h4>
                <ul className="text-sm space-y-1">
                  {selectedExercise.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Muscle Groups</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedExercise.muscleGroups.map((muscle) => (
                    <Badge key={muscle} variant="outline" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedExercise(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const newExercise = { ...selectedExercise, id: `${selectedExercise.id}-${Date.now()}` };
                    setProgram(prev => ({
                      ...prev,
                      blocks: [...prev.blocks, newExercise]
                    }));
                    setSelectedExercise(null);
                  }}
                >
                  Add to Program
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
