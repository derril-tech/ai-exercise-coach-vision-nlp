'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
  // Visual settings
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  
  // Audio settings
  captionsEnabled: boolean;
  audioDescriptions: boolean;
  soundEffects: boolean;
  
  // Interaction settings
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  clickDelay: number; // ms
  
  // Coaching settings
  verboseInstructions: boolean;
  slowSpeech: boolean;
  repeatInstructions: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  isHighContrast: boolean;
  isLargeText: boolean;
  isReducedMotion: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  fontSize: 'medium',
  captionsEnabled: false,
  audioDescriptions: false,
  soundEffects: true,
  keyboardNavigation: true,
  focusIndicators: true,
  clickDelay: 0,
  verboseInstructions: false,
  slowSpeech: false,
  repeatInstructions: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }
  }, []);

  // Detect system preferences
  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }

    // Check for prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (contrastQuery.matches) {
      setSettings(prev => ({ ...prev, highContrast: true }));
    }

    // Listen for changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }));
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Apply CSS classes based on settings
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-xl');
    root.classList.add(`font-${settings.fontSize}`);

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('focus-indicators');
    } else {
      root.classList.remove('focus-indicators');
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
    isHighContrast: settings.highContrast,
    isLargeText: settings.largeText,
    isReducedMotion: settings.reducedMotion,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Hook for keyboard navigation
export function useKeyboardNavigation() {
  const { settings } = useAccessibility();

  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip navigation
      if (event.key === 'Tab' && event.shiftKey) {
        // Shift+Tab for reverse navigation
        return;
      }

      // Quick access keys
      switch (event.key) {
        case 'Escape':
          // Close modals, cancel actions
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
          break;

        case ' ':
          // Space bar for play/pause in workout
          if (event.target === document.body) {
            event.preventDefault();
            const playPauseButton = document.querySelector('[data-testid="play-pause-button"]') as HTMLButtonElement;
            if (playPauseButton) {
              playPauseButton.click();
            }
          }
          break;

        case 'ArrowRight':
          // Next exercise
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const nextButton = document.querySelector('[data-testid="next-exercise"]') as HTMLButtonElement;
            if (nextButton) {
              nextButton.click();
            }
          }
          break;

        case 'ArrowLeft':
          // Previous exercise
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const prevButton = document.querySelector('[data-testid="prev-exercise"]') as HTMLButtonElement;
            if (prevButton) {
              prevButton.click();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);
}

// Hook for focus management
export function useFocusManagement() {
  const { settings } = useAccessibility();

  const focusElement = (selector: string) => {
    if (!settings.keyboardNavigation) return;
    
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.focus) {
      element.focus();
    }
  };

  const announceLiveRegion = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  return {
    focusElement,
    announceLiveRegion,
  };
}

// Component for live region announcements
export function LiveRegion() {
  return (
    <div
      id="live-region"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Component for skip links
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#workout-controls" className="skip-link">
        Skip to workout controls
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>
    </div>
  );
}
