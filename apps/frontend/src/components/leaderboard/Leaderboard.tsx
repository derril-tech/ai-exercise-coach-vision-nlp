'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  Flame
} from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number;
  change: number; // Position change from last period
  stats: {
    sessions: number;
    reps: number;
    avgForm: number;
    streak: number;
  };
  badges: string[];
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special';
  startDate: Date;
  endDate: Date;
  participants: number;
  reward: string;
  progress?: number;
  isActive: boolean;
}

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
    loadChallenges();
  }, [activeTab]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    
    // Mock leaderboard data - in real app, this would come from API
    const mockData: LeaderboardEntry[] = [
      {
        id: '1',
        username: 'FitnessKing',
        score: 2850,
        rank: 1,
        change: 0,
        stats: { sessions: 28, reps: 1420, avgForm: 94, streak: 14 },
        badges: ['Week Warrior', 'Perfect Form', 'Elite']
      },
      {
        id: '2',
        username: 'SquatQueen',
        score: 2720,
        rank: 2,
        change: 1,
        stats: { sessions: 25, reps: 1350, avgForm: 92, streak: 12 },
        badges: ['Month Master', 'Thousand Club']
      },
      {
        id: '3',
        username: 'PushUpPro',
        score: 2650,
        rank: 3,
        change: -1,
        stats: { sessions: 24, reps: 1280, avgForm: 89, streak: 8 },
        badges: ['Dedicated', 'Century']
      },
      {
        id: '4',
        username: 'FlexMaster',
        score: 2480,
        rank: 4,
        change: 2,
        stats: { sessions: 22, reps: 1150, avgForm: 87, streak: 6 },
        badges: ['3-Day Streak', 'First Workout']
      },
      {
        id: '5',
        username: 'CoreCrusher',
        score: 2350,
        rank: 5,
        change: -1,
        stats: { sessions: 20, reps: 1080, avgForm: 85, streak: 5 },
        badges: ['Committed']
      },
      // Add current user
      {
        id: 'current-user',
        username: 'You',
        score: 1850,
        rank: 12,
        change: 3,
        stats: { sessions: 15, reps: 750, avgForm: 82, streak: 3 },
        badges: ['3-Day Streak', 'First Workout']
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setLeaderboardData(mockData);
    setUserRank(12);
    setLoading(false);
  };

  const loadChallenges = async () => {
    const mockChallenges: Challenge[] = [
      {
        id: '1',
        name: 'Push-Up Challenge',
        description: 'Complete 500 push-ups this week',
        type: 'weekly',
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        participants: 1247,
        reward: 'Push-Up Master Badge',
        progress: 65,
        isActive: true
      },
      {
        id: '2',
        name: 'Perfect Form Month',
        description: 'Maintain 90%+ form score for 30 days',
        type: 'monthly',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        participants: 892,
        reward: 'Form Perfectionist Badge',
        progress: 50,
        isActive: true
      },
      {
        id: '3',
        name: 'New Year Resolution',
        description: 'Complete 100 workout sessions',
        type: 'special',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        participants: 3456,
        reward: 'Resolution Keeper Badge',
        progress: 15,
        isActive: true
      }
    ];

    setChallenges(mockChallenges);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    }
    return <div className="w-4 h-4" />; // Placeholder for no change
  };

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Leaderboard
        </h1>
        <div className="flex gap-2">
          {(['weekly', 'monthly', 'allTime'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === 'allTime' ? 'All Time' : tab}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Leaderboard */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {activeTab === 'weekly' ? 'This Week' : activeTab === 'monthly' ? 'This Month' : 'All Time'} Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboardData.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      entry.id === 'current-user' 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {entry.username[0].toUpperCase()}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{entry.username}</span>
                        {entry.id === 'current-user' && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.stats.sessions} sessions • {entry.stats.reps} reps • {entry.stats.avgForm}% form
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="hidden md:flex gap-1">
                      {entry.badges.slice(0, 2).map((badge) => (
                        <Badge key={badge} variant="outline" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                      {entry.badges.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{entry.badges.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Score and Change */}
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {getChangeIcon(entry.change)}
                        {entry.change !== 0 && Math.abs(entry.change)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* User's rank if not in top 10 */}
                {userRank && userRank > 10 && (
                  <>
                    <div className="text-center py-2 text-muted-foreground">
                      <span className="text-sm">...</span>
                    </div>
                    {leaderboardData
                      .filter(entry => entry.id === 'current-user')
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 p-3 rounded-lg border bg-blue-50 border-blue-200"
                        >
                          <div className="flex items-center justify-center w-8">
                            <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {entry.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{entry.username}</span>
                              <Badge variant="secondary">You</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.stats.sessions} sessions • {entry.stats.reps} reps • {entry.stats.avgForm}% form
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {getChangeIcon(entry.change)}
                              {entry.change !== 0 && Math.abs(entry.change)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenges Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Active Challenges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{challenge.name}</h3>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    <Badge 
                      variant={challenge.type === 'special' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {challenge.type}
                    </Badge>
                  </div>

                  {challenge.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{challenge.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${challenge.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {challenge.participants.toLocaleString()} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimeRemaining(challenge.endDate)} left
                    </span>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Reward:</span>
                      <span className="text-muted-foreground">{challenge.reward}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Rank</span>
                <span className="font-bold">#{userRank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Points This Week</span>
                <span className="font-bold">1,850</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Challenges</span>
                <span className="font-bold">{challenges.filter(c => c.isActive).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Badges Earned</span>
                <span className="font-bold">2</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
