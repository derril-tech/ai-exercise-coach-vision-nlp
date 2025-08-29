'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Zap,
  Moon,
  Droplets
} from 'lucide-react';

interface ReadinessMetrics {
  rpe: number; // Rate of Perceived Exertion (1-10)
  heartRate?: number; // Current heart rate
  restingHeartRate?: number; // Baseline resting HR
  hrv?: number; // Heart Rate Variability
  sleepQuality: number; // 1-10 scale
  stressLevel: number; // 1-10 scale
  energyLevel: number; // 1-10 scale
  musclesSoreness: number; // 1-10 scale
  motivation: number; // 1-10 scale
}

interface ReadinessScore {
  overall: number; // 0-100
  category: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations: string[];
  adjustments: {
    intensity: 'decrease' | 'maintain' | 'increase';
    duration: 'decrease' | 'maintain' | 'increase';
    type: 'recovery' | 'light' | 'moderate' | 'intense';
  };
}

export function ReadinessCheck() {
  const [metrics, setMetrics] = useState<ReadinessMetrics>({
    rpe: 5,
    sleepQuality: 7,
    stressLevel: 4,
    energyLevel: 6,
    musclesSoreness: 3,
    motivation: 7
  });

  const [readinessScore, setReadinessScore] = useState<ReadinessScore | null>(null);
  const [isConnectingHR, setIsConnectingHR] = useState(false);
  const [hrConnected, setHrConnected] = useState(false);

  // Calculate readiness score based on metrics
  useEffect(() => {
    const score = calculateReadinessScore(metrics);
    setReadinessScore(score);
  }, [metrics]);

  const calculateReadinessScore = (metrics: ReadinessMetrics): ReadinessScore => {
    // Weighted scoring algorithm
    const weights = {
      sleepQuality: 0.25,
      energyLevel: 0.20,
      stressLevel: 0.15, // Inverted (lower stress = better)
      musclesSoreness: 0.15, // Inverted (lower soreness = better)
      motivation: 0.15,
      rpe: 0.10 // Inverted (lower RPE = better recovery)
    };

    // Calculate weighted score (0-100)
    const sleepScore = (metrics.sleepQuality / 10) * 100 * weights.sleepQuality;
    const energyScore = (metrics.energyLevel / 10) * 100 * weights.energyLevel;
    const stressScore = ((10 - metrics.stressLevel) / 10) * 100 * weights.stressLevel;
    const sorenessScore = ((10 - metrics.musclesSoreness) / 10) * 100 * weights.musclesSoreness;
    const motivationScore = (metrics.motivation / 10) * 100 * weights.motivation;
    const rpeScore = ((10 - metrics.rpe) / 10) * 100 * weights.rpe;

    const overall = Math.round(
      sleepScore + energyScore + stressScore + sorenessScore + motivationScore + rpeScore
    );

    // Determine category
    let category: ReadinessScore['category'];
    if (overall >= 80) category = 'excellent';
    else if (overall >= 65) category = 'good';
    else if (overall >= 50) category = 'fair';
    else category = 'poor';

    // Generate recommendations
    const recommendations: string[] = [];
    const adjustments: ReadinessScore['adjustments'] = {
      intensity: 'maintain',
      duration: 'maintain',
      type: 'moderate'
    };

    if (metrics.sleepQuality <= 5) {
      recommendations.push('Prioritize getting 7-9 hours of quality sleep');
    }
    if (metrics.stressLevel >= 7) {
      recommendations.push('Consider stress management techniques like meditation');
      adjustments.intensity = 'decrease';
      adjustments.type = 'light';
    }
    if (metrics.musclesSoreness >= 7) {
      recommendations.push('Focus on recovery with light stretching or rest');
      adjustments.type = 'recovery';
    }
    if (metrics.energyLevel <= 4) {
      recommendations.push('Consider a lighter workout or active recovery');
      adjustments.intensity = 'decrease';
    }
    if (overall >= 80) {
      recommendations.push('You\'re ready for an intense workout!');
      adjustments.intensity = 'increase';
      adjustments.type = 'intense';
    }

    return { overall, category, recommendations, adjustments };
  };

  const connectHeartRateMonitor = async () => {
    setIsConnectingHR(true);
    
    try {
      // Mock heart rate connection (in real app, would use Web Bluetooth API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate heart rate data
      setMetrics(prev => ({
        ...prev,
        heartRate: 72,
        restingHeartRate: 65,
        hrv: 45
      }));
      
      setHrConnected(true);
    } catch (error) {
      console.error('Failed to connect heart rate monitor:', error);
    } finally {
      setIsConnectingHR(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    };
    return variants[category as keyof typeof variants] || variants.fair;
  };

  const MetricSlider = ({ 
    label, 
    value, 
    onChange, 
    icon, 
    min = 1, 
    max = 10,
    inverted = false 
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: React.ReactNode;
    min?: number;
    max?: number;
    inverted?: boolean;
  }) => {
    const getSliderColor = (val: number) => {
      const normalizedValue = inverted ? max - val + min : val;
      if (normalizedValue <= 3) return 'bg-red-500';
      if (normalizedValue <= 6) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </div>
          <span className="text-sm font-bold">{value}/{max}</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${getSliderColor(value)} 0%, ${getSliderColor(value)} ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Readiness Check</h1>
          <p className="text-muted-foreground">Assess your readiness for today's workout</p>
        </div>
        <Button
          onClick={connectHeartRateMonitor}
          disabled={isConnectingHR || hrConnected}
          className="flex items-center gap-2"
        >
          <Heart className="h-4 w-4" />
          {isConnectingHR ? 'Connecting...' : hrConnected ? 'HR Connected' : 'Connect HR Monitor'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Score */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Readiness Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {readinessScore && (
              <>
                <div className={`text-6xl font-bold mb-4 ${getScoreColor(readinessScore.overall)}`}>
                  {readinessScore.overall}
                </div>
                <Badge className={`mb-4 ${getCategoryBadge(readinessScore.category)}`}>
                  {readinessScore.category.toUpperCase()}
                </Badge>
                
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      Intensity: <span className="font-medium capitalize">{readinessScore.adjustments.intensity}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      Duration: <span className="font-medium capitalize">{readinessScore.adjustments.duration}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">
                      Type: <span className="font-medium capitalize">{readinessScore.adjustments.type}</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Metrics Input */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How are you feeling today?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Rate each factor to get your personalized readiness score
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricSlider
                label="Sleep Quality"
                value={metrics.sleepQuality}
                onChange={(value) => setMetrics(prev => ({ ...prev, sleepQuality: value }))}
                icon={<Moon className="h-4 w-4 text-indigo-500" />}
              />
              
              <MetricSlider
                label="Energy Level"
                value={metrics.energyLevel}
                onChange={(value) => setMetrics(prev => ({ ...prev, energyLevel: value }))}
                icon={<Zap className="h-4 w-4 text-yellow-500" />}
              />
              
              <MetricSlider
                label="Stress Level"
                value={metrics.stressLevel}
                onChange={(value) => setMetrics(prev => ({ ...prev, stressLevel: value }))}
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                inverted
              />
              
              <MetricSlider
                label="Muscle Soreness"
                value={metrics.musclesSoreness}
                onChange={(value) => setMetrics(prev => ({ ...prev, musclesSoreness: value }))}
                icon={<Activity className="h-4 w-4 text-orange-500" />}
                inverted
              />
              
              <MetricSlider
                label="Motivation"
                value={metrics.motivation}
                onChange={(value) => setMetrics(prev => ({ ...prev, motivation: value }))}
                icon={<TrendingUp className="h-4 w-4 text-green-500" />}
              />
              
              <MetricSlider
                label="Perceived Exertion (RPE)"
                value={metrics.rpe}
                onChange={(value) => setMetrics(prev => ({ ...prev, rpe: value }))}
                icon={<Droplets className="h-4 w-4 text-blue-500" />}
                inverted
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heart Rate Data */}
      {hrConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Heart Rate Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{metrics.heartRate}</div>
                <div className="text-sm text-red-700">Current HR</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{metrics.restingHeartRate}</div>
                <div className="text-sm text-blue-700">Resting HR</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{metrics.hrv}</div>
                <div className="text-sm text-green-700">HRV Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {readinessScore && readinessScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {readinessScore.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
