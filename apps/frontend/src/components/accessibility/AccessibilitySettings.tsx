'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccessibility } from './AccessibilityProvider';
import { 
  Eye, 
  Volume2, 
  Keyboard, 
  MousePointer, 
  RefreshCw,
  Settings,
  Contrast,
  Type,
  Zap,
  Captions,
  VolumeX,
  Focus,
  Timer
} from 'lucide-react';

interface SettingToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  badge?: string;
}

function SettingToggle({ label, description, icon, enabled, onChange, badge }: SettingToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <div className="flex-shrink-0 mt-1">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium">{label}</h3>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(!enabled)}
          className="min-w-20"
        >
          {enabled ? 'On' : 'Off'}
        </Button>
      </div>
    </div>
  );
}

interface FontSizeSelectProps {
  value: string;
  onChange: (size: 'small' | 'medium' | 'large' | 'xl') => void;
}

function FontSizeSelect({ value, onChange }: FontSizeSelectProps) {
  const sizes = [
    { value: 'small', label: 'Small', description: '14px' },
    { value: 'medium', label: 'Medium', description: '16px' },
    { value: 'large', label: 'Large', description: '18px' },
    { value: 'xl', label: 'Extra Large', description: '20px' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {sizes.map((size) => (
        <Button
          key={size.value}
          variant={value === size.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(size.value as any)}
          className="flex flex-col h-auto py-3"
        >
          <span className="font-medium">{size.label}</span>
          <span className="text-xs opacity-75">{size.description}</span>
        </Button>
      ))}
    </div>
  );
}

export function AccessibilitySettings() {
  const { settings, updateSettings, resetSettings } = useAccessibility();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Accessibility Settings
        </h1>
        <Button
          variant="outline"
          onClick={resetSettings}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset All
        </Button>
      </div>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            label="High Contrast Mode"
            description="Increases contrast between text and background for better readability"
            icon={<Contrast className="h-5 w-5 text-gray-600" />}
            enabled={settings.highContrast}
            onChange={(enabled) => updateSettings({ highContrast: enabled })}
            badge="Recommended"
          />

          <SettingToggle
            label="Large Text Mode"
            description="Increases text size throughout the application"
            icon={<Type className="h-5 w-5 text-gray-600" />}
            enabled={settings.largeText}
            onChange={(enabled) => updateSettings({ largeText: enabled })}
          />

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Type className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium">Font Size</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred text size for better readability
            </p>
            <FontSizeSelect
              value={settings.fontSize}
              onChange={(fontSize) => updateSettings({ fontSize })}
            />
          </div>

          <SettingToggle
            label="Reduced Motion"
            description="Minimizes animations and transitions that may cause discomfort"
            icon={<Zap className="h-5 w-5 text-gray-600" />}
            enabled={settings.reducedMotion}
            onChange={(enabled) => updateSettings({ reducedMotion: enabled })}
          />
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio & Captions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            label="Captions"
            description="Show text captions for all spoken coaching cues and instructions"
            icon={<Captions className="h-5 w-5 text-gray-600" />}
            enabled={settings.captionsEnabled}
            onChange={(enabled) => updateSettings({ captionsEnabled: enabled })}
            badge="Helpful"
          />

          <SettingToggle
            label="Audio Descriptions"
            description="Provides detailed audio descriptions of visual elements and actions"
            icon={<Volume2 className="h-5 w-5 text-gray-600" />}
            enabled={settings.audioDescriptions}
            onChange={(enabled) => updateSettings({ audioDescriptions: enabled })}
          />

          <SettingToggle
            label="Sound Effects"
            description="Play sound effects for rep completion, achievements, and notifications"
            icon={<VolumeX className="h-5 w-5 text-gray-600" />}
            enabled={settings.soundEffects}
            onChange={(enabled) => updateSettings({ soundEffects: enabled })}
          />
        </CardContent>
      </Card>

      {/* Interaction Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Interaction & Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            label="Keyboard Navigation"
            description="Enable full keyboard navigation with shortcuts and focus management"
            icon={<Keyboard className="h-5 w-5 text-gray-600" />}
            enabled={settings.keyboardNavigation}
            onChange={(enabled) => updateSettings({ keyboardNavigation: enabled })}
            badge="Essential"
          />

          <SettingToggle
            label="Enhanced Focus Indicators"
            description="Show clear visual indicators when elements are focused via keyboard"
            icon={<Focus className="h-5 w-5 text-gray-600" />}
            enabled={settings.focusIndicators}
            onChange={(enabled) => updateSettings({ focusIndicators: enabled })}
          />

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium">Click Delay</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Add a delay before click actions are registered (helpful for motor difficulties)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 250, 500, 1000].map((delay) => (
                <Button
                  key={delay}
                  variant={settings.clickDelay === delay ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings({ clickDelay: delay })}
                >
                  {delay === 0 ? 'None' : `${delay}ms`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coaching Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Coaching Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            label="Verbose Instructions"
            description="Receive detailed, step-by-step coaching instructions"
            icon={<Volume2 className="h-5 w-5 text-gray-600" />}
            enabled={settings.verboseInstructions}
            onChange={(enabled) => updateSettings({ verboseInstructions: enabled })}
          />

          <SettingToggle
            label="Slow Speech"
            description="Coaching cues are spoken at a slower pace for better comprehension"
            icon={<Timer className="h-5 w-5 text-gray-600" />}
            enabled={settings.slowSpeech}
            onChange={(enabled) => updateSettings({ slowSpeech: enabled })}
          />

          <SettingToggle
            label="Repeat Instructions"
            description="Important instructions are automatically repeated for clarity"
            icon={<RefreshCw className="h-5 w-5 text-gray-600" />}
            enabled={settings.repeatInstructions}
            onChange={(enabled) => updateSettings({ repeatInstructions: enabled })}
          />
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Play/Pause Workout</span>
                <Badge variant="outline">Space</Badge>
              </div>
              <div className="flex justify-between">
                <span>Next Exercise</span>
                <Badge variant="outline">Ctrl + →</Badge>
              </div>
              <div className="flex justify-between">
                <span>Previous Exercise</span>
                <Badge variant="outline">Ctrl + ←</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Close Modal/Cancel</span>
                <Badge variant="outline">Esc</Badge>
              </div>
              <div className="flex justify-between">
                <span>Navigate Elements</span>
                <Badge variant="outline">Tab</Badge>
              </div>
              <div className="flex justify-between">
                <span>Activate Button</span>
                <Badge variant="outline">Enter</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(settings).filter(Boolean).length}
              </div>
              <div className="text-sm text-green-700">Features Enabled</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {settings.keyboardNavigation ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-blue-700">Keyboard Ready</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {settings.captionsEnabled ? 'On' : 'Off'}
              </div>
              <div className="text-sm text-purple-700">Captions</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {settings.highContrast ? 'High' : 'Normal'}
              </div>
              <div className="text-sm text-orange-700">Contrast</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
