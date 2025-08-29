'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Target,
  TrendingUp
} from 'lucide-react';

interface CoachNote {
  id: string;
  userId: string;
  sessionId?: string;
  exerciseId?: string;
  type: 'observation' | 'correction' | 'encouragement' | 'modification' | 'goal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  content: string;
  tags: string[];
  isOverride: boolean; // Can override automatic coaching
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // coach/trainer ID
  isActive: boolean;
  expiresAt?: Date;
  metadata: {
    exerciseName?: string;
    bodyPart?: string;
    formIssue?: string;
    targetMetric?: string;
  };
}

interface CoachingOverride {
  id: string;
  noteId: string;
  originalCue: string;
  overrideCue: string;
  reason: string;
  appliedAt: Date;
  isActive: boolean;
}

export function CoachNotes() {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [overrides, setOverrides] = useState<CoachingOverride[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockNotes: CoachNote[] = [
      {
        id: '1',
        userId: 'user123',
        sessionId: 'session456',
        exerciseId: 'pushup',
        type: 'correction',
        priority: 'high',
        title: 'Elbow Position Correction',
        content: 'Keep elbows closer to body during push-ups. Current form shows elbows flaring out at 90 degrees, should be 45 degrees for better shoulder health.',
        tags: ['form', 'elbows', 'push-ups', 'shoulder-safety'],
        isOverride: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: 'coach_sarah',
        isActive: true,
        metadata: {
          exerciseName: 'Push-ups',
          bodyPart: 'shoulders',
          formIssue: 'elbow_flare',
          targetMetric: 'elbow_angle'
        }
      },
      {
        id: '2',
        userId: 'user123',
        type: 'encouragement',
        priority: 'medium',
        title: 'Progress Recognition',
        content: 'Excellent improvement in squat depth over the past week! Form score increased from 72% to 85%. Keep focusing on that controlled descent.',
        tags: ['progress', 'squats', 'motivation'],
        isOverride: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdBy: 'coach_sarah',
        isActive: true,
        metadata: {
          exerciseName: 'Squats',
          targetMetric: 'form_score'
        }
      },
      {
        id: '3',
        userId: 'user123',
        type: 'modification',
        priority: 'critical',
        title: 'Knee Injury Accommodation',
        content: 'Due to recent knee strain, avoid deep squats and jumping exercises. Use chair-assisted squats and focus on upper body exercises for the next 2 weeks.',
        tags: ['injury', 'modification', 'knee', 'safety'],
        isOverride: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'coach_sarah',
        isActive: true,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        metadata: {
          bodyPart: 'knee'
        }
      },
      {
        id: '4',
        userId: 'user123',
        type: 'goal',
        priority: 'medium',
        title: '30-Day Push-up Challenge',
        content: 'Goal: Achieve 20 consecutive standard push-ups by end of month. Current: 12 reps. Focus on progressive overload and form consistency.',
        tags: ['goal', 'push-ups', '30-day-challenge'],
        isOverride: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: 'coach_sarah',
        isActive: true,
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        metadata: {
          exerciseName: 'Push-ups',
          targetMetric: 'max_reps'
        }
      }
    ];

    const mockOverrides: CoachingOverride[] = [
      {
        id: '1',
        noteId: '1',
        originalCue: 'Good form on push-ups',
        overrideCue: 'Keep elbows closer to your body - aim for 45 degrees',
        reason: 'Specific form correction needed for shoulder safety',
        appliedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    setNotes(mockNotes);
    setOverrides(mockOverrides);
  }, []);

  const createNote = (noteData: Partial<CoachNote>) => {
    const newNote: CoachNote = {
      id: Date.now().toString(),
      userId: 'user123',
      type: noteData.type || 'observation',
      priority: noteData.priority || 'medium',
      title: noteData.title || '',
      content: noteData.content || '',
      tags: noteData.tags || [],
      isOverride: noteData.isOverride || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'coach_sarah',
      isActive: true,
      metadata: noteData.metadata || {}
    };

    setNotes(prev => [newNote, ...prev]);
    setIsCreating(false);
  };

  const updateNote = (noteId: string, updates: Partial<CoachNote>) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
    setEditingNote(null);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const toggleNoteActive = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, isActive: !note.isActive, updatedAt: new Date() }
        : note
    ));
  };

  const createOverride = (noteId: string, originalCue: string, overrideCue: string, reason: string) => {
    const newOverride: CoachingOverride = {
      id: Date.now().toString(),
      noteId,
      originalCue,
      overrideCue,
      reason,
      appliedAt: new Date(),
      isActive: true
    };

    setOverrides(prev => [newOverride, ...prev]);
  };

  const filteredNotes = notes.filter(note => {
    const typeMatch = filterType === 'all' || note.type === filterType;
    const priorityMatch = filterPriority === 'all' || note.priority === filterPriority;
    return typeMatch && priorityMatch;
  });

  const getTypeIcon = (type: string) => {
    const icons = {
      observation: <MessageSquare className="h-4 w-4" />,
      correction: <AlertTriangle className="h-4 w-4" />,
      encouragement: <CheckCircle className="h-4 w-4" />,
      modification: <Edit3 className="h-4 w-4" />,
      goal: <Target className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <MessageSquare className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      observation: 'bg-blue-100 text-blue-800',
      correction: 'bg-red-100 text-red-800',
      encouragement: 'bg-green-100 text-green-800',
      modification: 'bg-yellow-100 text-yellow-800',
      goal: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      critical: 'text-red-500'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const NoteForm = ({ note, onSave, onCancel }: {
    note?: CoachNote;
    onSave: (data: Partial<CoachNote>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      type: note?.type || 'observation',
      priority: note?.priority || 'medium',
      title: note?.title || '',
      content: note?.content || '',
      tags: note?.tags?.join(', ') || '',
      isOverride: note?.isOverride || false,
      exerciseName: note?.metadata?.exerciseName || '',
      bodyPart: note?.metadata?.bodyPart || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        metadata: {
          exerciseName: formData.exerciseName,
          bodyPart: formData.bodyPart
        }
      });
    };

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{note ? 'Edit Note' : 'Create New Note'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="observation">Observation</option>
                  <option value="correction">Correction</option>
                  <option value="encouragement">Encouragement</option>
                  <option value="modification">Modification</option>
                  <option value="goal">Goal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="Brief title for the note"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full p-2 border rounded-md h-24"
                placeholder="Detailed note content"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Exercise (optional)</label>
                <input
                  type="text"
                  value={formData.exerciseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, exerciseName: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Push-ups"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Body Part (optional)</label>
                <input
                  type="text"
                  value={formData.bodyPart}
                  onChange={(e) => setFormData(prev => ({ ...prev, bodyPart: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., shoulders"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="form, safety, motivation"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOverride"
                checked={formData.isOverride}
                onChange={(e) => setFormData(prev => ({ ...prev, isOverride: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="isOverride" className="text-sm">
                Can override automatic coaching cues
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coach Notes & Overrides</h1>
          <p className="text-muted-foreground">Manage personalized coaching notes and cue overrides</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="observation">Observations</option>
                <option value="correction">Corrections</option>
                <option value="encouragement">Encouragement</option>
                <option value="modification">Modifications</option>
                <option value="goal">Goals</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {isCreating && (
        <NoteForm
          onSave={createNote}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingNote && (
        <NoteForm
          note={editingNote}
          onSave={(data) => updateNote(editingNote.id, data)}
          onCancel={() => setEditingNote(null)}
        />
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.map((note) => (
          <Card key={note.id} className={`${!note.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(note.type)}`}>
                    {getTypeIcon(note.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{note.title}</h3>
                      <Badge className={getTypeColor(note.type)}>
                        {note.type}
                      </Badge>
                      <span className={`text-sm font-medium ${getPriorityColor(note.priority)}`}>
                        {note.priority.toUpperCase()}
                      </span>
                      {note.isOverride && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Override
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">{note.content}</p>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {note.metadata.exerciseName && (
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          {note.metadata.exerciseName}
                        </Badge>
                      )}
                      {note.metadata.bodyPart && (
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          {note.metadata.bodyPart}
                        </Badge>
                      )}
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {formatDate(note.createdAt)}
                      </span>
                      {note.expiresAt && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Expires {formatDate(note.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNote(note)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNoteActive(note.id)}
                    className={note.isActive ? 'text-orange-600' : 'text-green-600'}
                  >
                    {note.isActive ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Active Overrides */}
              {note.isOverride && overrides.filter(o => o.noteId === note.id && o.isActive).map((override) => (
                <div key={override.id} className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Active Override</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Original:</span> {override.originalCue}</div>
                    <div><span className="font-medium">Override:</span> {override.overrideCue}</div>
                    <div><span className="font-medium">Reason:</span> {override.reason}</div>
                    <div className="text-orange-600">Applied {formatDate(override.appliedAt)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {filteredNotes.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notes found matching your filters.</p>
              <Button
                onClick={() => setIsCreating(true)}
                className="mt-4"
              >
                Create First Note
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
