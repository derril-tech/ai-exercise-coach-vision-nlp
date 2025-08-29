import { WorkoutSession } from '@/components/workout/WorkoutSession';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Exercise Coach</h1>
                <p className="text-sm text-muted-foreground">Vision + NLP Powered Fitness</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Real-time Pose Detection
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Smart Coaching
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Voice Commands
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workout Interface */}
      <div className="container mx-auto px-4 py-8">
        <WorkoutSession />
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Real-time Pose Analysis</li>
                <li>Form Correction</li>
                <li>Rep Counting</li>
                <li>Voice Coaching</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Technology</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>WebRTC Camera</li>
                <li>MediaPipe Pose</li>
                <li>Web Speech API</li>
                <li>WebGL Overlays</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Privacy</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>On-device Processing</li>
                <li>No Video Storage</li>
                <li>Local Analysis</li>
                <li>GDPR Compliant</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Exercise Library</li>
                <li>Form Guidelines</li>
                <li>Troubleshooting</li>
                <li>Feedback</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 AI Exercise Coach. Built with Next.js, NestJS, and Python.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
