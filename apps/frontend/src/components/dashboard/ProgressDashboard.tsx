'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/stores/workoutStore';
import { WorkoutSession, ExerciseSet } from '@/types';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award, 
  Activity,
  BarChart3,
  Clock,
  Flame
} from 'lucide-react';

interface ProgressStats {
  totalSessions: number;
  totalReps: number;
  totalDuration: number;
  averageFormScore: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalProgress: number;
  favoriteExercise: string;
}

interface WeeklyData {
  week: string;
  sessions: number;
  reps: number;
  avgForm: number;
}

export function ProgressDashboard() {
  const { sessionHistory } = useWorkoutStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    calculateStats();
    generateWeeklyData();
    checkBadges();
  }, [sessionHistory, timeRange]);

  const calculateStats = () => {
    if (sessionHistory.length === 0) {
      setStats({
        totalSessions: 0,
        totalReps: 0,
        totalDuration: 0,
        averageFormScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        weeklyGoalProgress: 0,
        favoriteExercise: 'None',
      });
      return;
    }

    // Filter sessions by time range
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredSessions = sessionHistory.filter(
      session => new Date(session.startedAt) >= cutoffDate
    );

    // Calculate basic stats
    const totalSessions = filteredSessions.length;
    const totalReps = filteredSessions.reduce(
      (sum, session) => sum + session.exercises.reduce((exerciseSum, ex) => exerciseSum + ex.actualReps, 0),
      0
    );
    const totalDuration = filteredSessions.reduce((sum, session) => sum + session.totalDuration, 0);
    
    // Calculate average form score
    const allSets = filteredSessions.flatMap(session => session.exercises);
    const averageFormScore = allSets.length > 0 
      ? allSets.reduce((sum, set) => sum + set.formScore, 0) / allSets.length
      : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks();

    // Find favorite exercise
    const exerciseCounts: Record<string, number> = {};
    allSets.forEach(set => {
      exerciseCounts[set.exerciseName] = (exerciseCounts[set.exerciseName] || 0) + 1;
    });
    const favoriteExercise = Object.entries(exerciseCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    // Weekly goal progress (mock - 3 sessions per week)
    const weeklyGoalProgress = Math.min(100, (totalSessions / 3) * 100);

    setStats({
      totalSessions,
      totalReps,
      totalDuration,
      averageFormScore,
      currentStreak,
      longestStreak,
      weeklyGoalProgress,
      favoriteExercise,
    });
  };

  const calculateStreaks = () => {
    if (sessionHistory.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort sessions by date
    const sortedSessions = [...sessionHistory].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startedAt);
      sessionDate.setHours(0, 0, 0, 0); // Normalize to day

      if (lastDate) {
        const daysDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          tempStreak++;
        } else if (daysDiff > 1) {
          // Streak broken
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        // Same day doesn't break or extend streak
      } else {
        tempStreak = 1;
      }

      lastDate = sessionDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Calculate current streak from today backwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = sortedSessions.length - 1; i >= 0; i--) {
      const sessionDate = new Date(sortedSessions[i].startedAt);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= currentStreak + 1) {
        currentStreak = Math.max(currentStreak, daysDiff === 0 ? 1 : currentStreak);
      } else {
        break;
      }
    }

    return { currentStreak, longestStreak };
  };

  const generateWeeklyData = () => {
    const weeks: WeeklyData[] = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekSessions = sessionHistory.filter(session => {
        const sessionDate = new Date(session.startedAt);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      const weekReps = weekSessions.reduce(
        (sum, session) => sum + session.exercises.reduce((exerciseSum, ex) => exerciseSum + ex.actualReps, 0),
        0
      );

      const allSets = weekSessions.flatMap(session => session.exercises);
      const avgForm = allSets.length > 0 
        ? allSets.reduce((sum, set) => sum + set.formScore, 0) / allSets.length
        : 0;

      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        sessions: weekSessions.length,
        reps: weekReps,
        avgForm,
      });
    }

    setWeeklyData(weeks);
  };

  const checkBadges = () => {
    const earnedBadges: string[] = [];
    
    if (!stats) return;

    // Achievement badges
    if (stats.totalSessions >= 1) earnedBadges.push('First Workout');
    if (stats.totalSessions >= 10) earnedBadges.push('Dedicated');
    if (stats.totalSessions >= 50) earnedBadges.push('Committed');
    if (stats.totalSessions >= 100) earnedBadges.push('Elite');

    // Streak badges
    if (stats.currentStreak >= 3) earnedBadges.push('3-Day Streak');
    if (stats.currentStreak >= 7) earnedBadges.push('Week Warrior');
    if (stats.currentStreak >= 30) earnedBadges.push('Month Master');

    // Form badges
    if (stats.averageFormScore >= 85) earnedBadges.push('Perfect Form');
    if (stats.averageFormScore >= 95) earnedBadges.push('Form Master');

    // Rep badges
    if (stats.totalReps >= 100) earnedBadges.push('Century');
    if (stats.totalReps >= 1000) earnedBadges.push('Thousand Club');

    setBadges(earnedBadges);
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Progress Dashboard</h1>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="capitalize"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'This year'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reps</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReps.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg {Math.round(stats.totalReps / Math.max(stats.totalSessions, 1))} per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatDuration(stats.totalDuration / Math.max(stats.totalSessions, 1))} per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Form Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageFormScore)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.averageFormScore >= 85 ? 'Excellent' : stats.averageFormScore >= 70 ? 'Good' : 'Needs work'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Streaks and Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Workout Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <span className="text-2xl font-bold text-orange-500">{stats.currentStreak} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Longest Streak</span>
              <span className="text-lg font-semibold">{stats.longestStreak} days</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (stats.currentStreak / 7) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {7 - (stats.currentStreak % 7)} days to next milestone
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Weekly Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-2xl font-bold text-blue-500">{Math.round(stats.weeklyGoalProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.weeklyGoalProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Goal: 3 sessions per week
            </p>
            <p className="text-sm">
              Favorite Exercise: <span className="font-semibold">{stats.favoriteExercise}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyData.map((week, index) => (
              <div key={week.week} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Week of {week.week}</span>
                  <span>{week.sessions} sessions, {week.reps} reps</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (week.sessions / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-xs text-muted-foreground text-right">
                    {Math.round(week.avgForm)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <Award className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{badge}</span>
              </div>
            ))}
            {badges.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                Complete your first workout to start earning badges!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
