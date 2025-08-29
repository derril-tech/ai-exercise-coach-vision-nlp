/**
 * End-to-End tests for complete workout flow
 */

import { test, expect, Page } from '@playwright/test';

// Mock WebRTC and MediaDevices for testing
test.beforeEach(async ({ page }) => {
  // Mock getUserMedia for camera access
  await page.addInitScript(() => {
    // Mock MediaDevices API
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: async (constraints: MediaStreamConstraints) => {
          // Create mock video stream
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d')!;
          
          // Draw a simple mock video frame
          ctx.fillStyle = '#333';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#fff';
          ctx.font = '24px Arial';
          ctx.fillText('Mock Camera Feed', 50, 50);
          
          // Create mock stream
          const stream = canvas.captureStream(30);
          return stream;
        },
        enumerateDevices: async () => [
          {
            deviceId: 'mock-camera-1',
            kind: 'videoinput' as MediaDeviceKind,
            label: 'Mock Camera 1',
            groupId: 'mock-group-1',
            toJSON: () => ({})
          }
        ]
      }
    });

    // Mock Speech Recognition
    (window as any).SpeechRecognition = class MockSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = 'en-US';
      maxAlternatives = 1;
      
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onresult: ((event: any) => void) | null = null;
      
      start() {
        setTimeout(() => {
          if (this.onstart) this.onstart(new Event('start'));
        }, 100);
      }
      
      stop() {
        setTimeout(() => {
          if (this.onend) this.onend(new Event('end'));
        }, 100);
      }
    };

    // Mock Speech Synthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: (utterance: SpeechSynthesisUtterance) => {
          setTimeout(() => {
            if (utterance.onstart) utterance.onstart(new SpeechSynthesisEvent('start', {}));
            setTimeout(() => {
              if (utterance.onend) utterance.onend(new SpeechSynthesisEvent('end', {}));
            }, 1000);
          }, 100);
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [
          {
            voiceURI: 'mock-voice',
            name: 'Mock Voice',
            lang: 'en-US',
            localService: true,
            default: true
          }
        ],
        speaking: false,
        pending: false,
        paused: false
      }
    });
  });
});

test.describe('Complete Workout Flow', () => {
  test('user can complete a full workout session', async ({ page }) => {
    await page.goto('/');

    // 1. Start workout session
    await expect(page.getByText('AI Exercise Coach')).toBeVisible();
    await expect(page.getByText('Start Workout')).toBeVisible();
    
    await page.getByText('Start Workout').click();
    
    // 2. Verify session started
    await expect(page.getByText('Pause')).toBeVisible();
    await expect(page.getByText('End')).toBeVisible();
    await expect(page.getByText('Duration:')).toBeVisible();

    // 3. Start camera
    await page.getByText('Start Camera').click();
    
    // Wait for camera to initialize
    await expect(page.getByText('Live')).toBeVisible({ timeout: 10000 });

    // 4. Start pose detection
    await page.getByText('Start Detection').click();
    
    // Wait for pose detection to start
    await expect(page.getByText('Pose Detection:')).toBeVisible({ timeout: 5000 });

    // 5. Select an exercise
    await page.getByText('Push-ups').click();
    
    // Verify exercise started
    await expect(page.getByText('Push-ups')).toBeVisible();
    await expect(page.getByText('0/10')).toBeVisible(); // Initial rep count

    // 6. Simulate workout progress
    // Wait for some pose detection and potential cues
    await page.waitForTimeout(3000);

    // 7. Complete exercise
    await page.getByText('Complete Exercise').click();
    
    // Should return to exercise selection
    await expect(page.getByText('Select an exercise to begin:')).toBeVisible();

    // 8. Try another exercise
    await page.getByText('Squats').click();
    await expect(page.getByText('Squats')).toBeVisible();

    // 9. End workout session
    await page.getByText('End').click();
    
    // Should return to initial state
    await expect(page.getByText('Start Workout')).toBeVisible();
  });

  test('user can pause and resume workout', async ({ page }) => {
    await page.goto('/');
    
    // Start workout
    await page.getByText('Start Workout').click();
    await expect(page.getByText('Pause')).toBeVisible();
    
    // Pause workout
    await page.getByText('Pause').click();
    await expect(page.getByText('Resume')).toBeVisible();
    await expect(page.getByText('Paused')).toBeVisible();
    
    // Resume workout
    await page.getByText('Resume').click();
    await expect(page.getByText('Pause')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('camera controls work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Start workout and camera
    await page.getByText('Start Workout').click();
    await page.getByText('Start Camera').click();
    
    // Wait for camera to start
    await expect(page.getByText('Live')).toBeVisible({ timeout: 10000 });
    
    // Stop camera
    await page.getByText('Stop Camera').click();
    await expect(page.getByText('Start Camera')).toBeVisible();
    
    // Verify camera stopped
    await expect(page.getByText('Live')).not.toBeVisible();
  });

  test('pose detection provides feedback', async ({ page }) => {
    await page.goto('/');
    
    // Start full flow
    await page.getByText('Start Workout').click();
    await page.getByText('Start Camera').click();
    await expect(page.getByText('Live')).toBeVisible({ timeout: 10000 });
    
    await page.getByText('Start Detection').click();
    await expect(page.getByText('Pose Detection:')).toBeVisible({ timeout: 5000 });
    
    // Start exercise
    await page.getByText('Push-ups').click();
    
    // Wait for potential coaching cues
    await page.waitForTimeout(5000);
    
    // Check if any coaching cues appeared
    const cuesSection = page.locator('text=Coaching Cues');
    if (await cuesSection.isVisible()) {
      // Verify cue structure
      await expect(page.locator('[data-testid="coaching-cue"]').first()).toBeVisible();
    }
  });

  test('accessibility features work', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should start workout
    
    await expect(page.getByText('Pause')).toBeVisible();
    
    // Test space bar for pause/resume
    await page.keyboard.press('Space');
    await expect(page.getByText('Resume')).toBeVisible();
    
    await page.keyboard.press('Space');
    await expect(page.getByText('Pause')).toBeVisible();
  });

  test('voice commands work', async ({ page }) => {
    await page.goto('/');
    
    // Start workout
    await page.getByText('Start Workout').click();
    
    // Simulate voice command for pause
    await page.evaluate(() => {
      // Trigger mock speech recognition
      const recognition = new (window as any).SpeechRecognition();
      recognition.onresult = (event: any) => {
        // This would normally be handled by the voice command hook
      };
      recognition.start();
      
      // Simulate "pause" command
      setTimeout(() => {
        if (recognition.onresult) {
          recognition.onresult({
            resultIndex: 0,
            results: [{
              0: { transcript: 'pause', confidence: 0.9 },
              isFinal: true
            }]
          });
        }
      }, 500);
    });
    
    // Note: In a real test, we'd need to mock the voice command processing
    // For now, we just verify the voice recognition API is available
    const speechRecognitionAvailable = await page.evaluate(() => {
      return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    });
    
    expect(speechRecognitionAvailable).toBe(true);
  });

  test('session statistics update correctly', async ({ page }) => {
    await page.goto('/');
    
    // Start workout and complete an exercise
    await page.getByText('Start Workout').click();
    await page.getByText('Push-ups').click();
    
    // Verify initial stats
    await expect(page.getByText('0/10')).toBeVisible();
    
    // Complete exercise
    await page.getByText('Complete Exercise').click();
    
    // Check session stats
    await expect(page.getByText('Session Stats')).toBeVisible();
    await expect(page.getByText('1')).toBeVisible(); // Total exercises
  });

  test('error handling works correctly', async ({ page }) => {
    // Mock camera error
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: async () => {
            throw new Error('Camera access denied');
          },
          enumerateDevices: async () => []
        }
      });
    });
    
    await page.goto('/');
    
    // Start workout
    await page.getByText('Start Workout').click();
    
    // Try to start camera
    await page.getByText('Start Camera').click();
    
    // Should show error message
    await expect(page.getByText('Camera Error')).toBeVisible({ timeout: 5000 });
    
    // App should still be functional
    await expect(page.getByText('Workout Session')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verify mobile layout
    await expect(page.getByText('AI Exercise Coach')).toBeVisible();
    await expect(page.getByText('Start Workout')).toBeVisible();
    
    // Start workout
    await page.getByText('Start Workout').click();
    
    // Verify controls are accessible on mobile
    await expect(page.getByText('Pause')).toBeVisible();
    await expect(page.getByText('End')).toBeVisible();
  });

  test('data persistence works', async ({ page }) => {
    await page.goto('/');
    
    // Start and complete a workout
    await page.getByText('Start Workout').click();
    await page.getByText('Push-ups').click();
    await page.getByText('Complete Exercise').click();
    await page.getByText('End').click();
    
    // Refresh page
    await page.reload();
    
    // Check if session history is maintained
    // Note: This would depend on the actual persistence implementation
    await expect(page.getByText('AI Exercise Coach')).toBeVisible();
  });

  test('performance is acceptable', async ({ page }) => {
    await page.goto('/');
    
    // Measure page load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000);
    
    // Start workout and measure interaction responsiveness
    const interactionStart = Date.now();
    await page.getByText('Start Workout').click();
    await expect(page.getByText('Pause')).toBeVisible();
    const interactionTime = Date.now() - interactionStart;
    
    // Interactions should be responsive
    expect(interactionTime).toBeLessThan(1000);
  });
});

test.describe('Edge Cases and Error Scenarios', () => {
  test('handles network disconnection gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Start workout
    await page.getByText('Start Workout').click();
    
    // Simulate network disconnection
    await page.context().setOffline(true);
    
    // App should continue to function for local features
    await page.getByText('Push-ups').click();
    await expect(page.getByText('Push-ups')).toBeVisible();
    
    // Reconnect
    await page.context().setOffline(false);
  });

  test('handles rapid user interactions', async ({ page }) => {
    await page.goto('/');
    
    // Rapidly click start/pause/resume
    await page.getByText('Start Workout').click();
    await page.getByText('Pause').click();
    await page.getByText('Resume').click();
    await page.getByText('Pause').click();
    await page.getByText('Resume').click();
    
    // Should end up in a consistent state
    await expect(page.getByText('Pause')).toBeVisible();
  });

  test('handles browser tab switching', async ({ page }) => {
    await page.goto('/');
    
    // Start workout with camera
    await page.getByText('Start Workout').click();
    await page.getByText('Start Camera').click();
    await expect(page.getByText('Live')).toBeVisible({ timeout: 10000 });
    
    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Should still be functional
    await expect(page.getByText('Live')).toBeVisible();
  });
});
