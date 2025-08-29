# AI Exercise Coach

> Your intelligent fitness companion powered by computer vision, natural language processing, and real-time coaching AI.

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](https://github.com/your-repo/ai-exercise-coach)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)

## 🎯 What is AI Exercise Coach?

**AI Exercise Coach** is a revolutionary fitness platform that transforms any device with a camera into an intelligent personal trainer. Using cutting-edge computer vision and natural language processing, it provides real-time form analysis, personalized coaching, and adaptive workout programs - all while maintaining complete privacy through on-device processing.

Think of it as having a professional personal trainer available 24/7, but powered by AI that never gets tired, always stays positive, and continuously learns to provide better guidance tailored specifically to your fitness journey.

## 🚀 What Does AI Exercise Coach Do?

### 🎥 **Real-Time Pose Analysis & Form Correction**
- **30+ FPS pose detection** using MediaPipe and computer vision
- **Live form analysis** with instant feedback on exercise technique
- **Safety monitoring** that detects dangerous positions and prevents injury
- **WebGL pose overlays** showing proper form and movement patterns

### 🗣️ **Intelligent Voice Coaching**
- **Text-to-Speech coaching** with personalized cues and encouragement
- **Voice command recognition** for hands-free workout control ("pause", "next exercise", "make it easier")
- **Multi-language support** with coaching in 15+ languages
- **Smart cue prioritization** (Safety > Form > Tempo > Motivation)

### 🏋️ **Adaptive Workout Programs**
- **AI-powered program generation** based on fitness level, goals, and available equipment
- **Dynamic difficulty adjustment** that adapts to your performance in real-time
- **Exercise progression/regression** with automatic modifications
- **Drag-and-drop program builder** for custom workout creation

### 📊 **Comprehensive Progress Tracking**
- **Detailed analytics dashboards** with ROM/tempo timelines and form scores
- **Achievement system** with badges, streaks, and milestone tracking
- **Community leaderboards** with challenges and competitive features
- **Professional export reports** in PDF, CSV, and JSON formats

### 🔒 **Privacy-First Design**
- **On-device processing** keeps your workout data private
- **Automatic face blurring** before any data transmission
- **Encryption envelopes** for sensitive data protection
- **GDPR compliance** with full data control and export capabilities

### ♿ **Universal Accessibility**
- **WCAG AA compliance** with full keyboard navigation
- **Multi-language support** for global accessibility
- **Visual accessibility** with high contrast modes and large text options
- **Audio descriptions** and captions for hearing-impaired users

## 🌟 Benefits of AI Exercise Coach

### 💪 **For Individual Users**

**🎯 Personalized Fitness Journey**
- Get a workout experience tailored to your exact fitness level, goals, and physical limitations
- Receive real-time form corrections that prevent injury and maximize effectiveness
- Progress at your own pace with adaptive difficulty that challenges you appropriately

**🏠 Convenience & Accessibility**
- Work out anywhere with just a camera - no gym membership or expensive equipment required
- 24/7 availability means you can exercise whenever fits your schedule
- Multi-language support makes fitness accessible regardless of your native language

**📈 Measurable Progress**
- Track detailed metrics including form scores, rep counts, and improvement over time
- Visual progress reports help you stay motivated and see tangible results
- Achievement system gamifies fitness to make workouts more engaging and fun

**🔒 Complete Privacy**
- Your workout data stays on your device - no cloud storage of personal fitness information
- Automatic face blurring protects your identity in any shared or exported content
- Full control over your data with GDPR-compliant export and deletion options

### 🏢 **For Fitness Professionals & Gyms**

**👨‍🏫 Enhanced Coaching Capabilities**
- Scale your expertise to help more clients simultaneously
- Provide consistent, high-quality form feedback even when you're not physically present
- Use coach notes and override features to customize the AI's guidance for each client

**📊 Data-Driven Insights**
- Access detailed analytics on client performance, progress, and areas needing improvement
- Generate professional reports for client consultations and progress reviews
- Track client engagement and workout consistency across your entire roster

**🌐 Global Reach**
- Serve clients remotely with the same quality as in-person training
- Multi-language support allows you to work with international clients
- Export and share workout programs easily with clients anywhere in the world

### 🏥 **For Healthcare & Rehabilitation**

**🩺 Safe Exercise Monitoring**
- Real-time safety monitoring prevents dangerous movements and reduces injury risk
- Adaptive difficulty ensures exercises remain within safe parameters for recovering patients
- Detailed form analysis helps identify movement compensations and imbalances

**📋 Progress Documentation**
- Comprehensive tracking provides objective data for medical professionals
- Export capabilities allow easy sharing of progress reports with healthcare teams
- Accessibility features ensure the platform works for users with various physical limitations

### 🏢 **For Corporate Wellness Programs**

**👥 Scalable Employee Fitness**
- Deploy to unlimited employees without per-user licensing costs
- Leaderboards and challenges create engaging team fitness competitions
- Privacy-first design addresses corporate data security concerns

**📊 Wellness Analytics**
- Aggregate (anonymized) data provides insights into employee wellness trends
- ROI tracking through engagement metrics and health outcome improvements
- Integration capabilities allow connection with existing HR and wellness platforms

### 🎓 **For Educational Institutions**

**🏫 Physical Education Enhancement**
- Provide consistent, expert-level instruction to all students regardless of class size
- Objective form assessment removes subjectivity from PE grading
- Multi-language support serves diverse student populations

**📚 Exercise Science Research**
- Detailed movement data collection for biomechanics research
- Large-scale data gathering capabilities for population health studies
- Open API allows integration with research tools and custom analysis

## 🎯 Overview

AI Exercise Coach transforms your webcam into an intelligent fitness companion that provides:

- **Real-time pose analysis** with computer vision
- **Personalized coaching cues** via TTS/ASR
- **Rep counting & form feedback** 
- **Adaptive workout programs**
- **Progress tracking & gamification**
- **Privacy-first on-device processing**

## 🏗️ Architecture

```
Frontend (Next.js 14)     Backend (NestJS)        Workers (Python)
├── WebRTC Camera        ├── REST API /v1        ├── Pose Detection
├── WebGL Overlays       ├── WebSocket Events    ├── Exercise Classification  
├── TTS/ASR             ├── Authentication      ├── Coaching Engine
├── Zustand State       ├── User Management     ├── NLP Processing
└── shadcn/ui           └── Session Tracking    └── Program Generation

Database Layer                Message Bus              Storage
├── Postgres + pgvector      ├── NATS JetStream      ├── S3/R2 (exports)
├── Redis (cache/state)      ├── Real-time events    └── Local (dev)
└── Row-level security       └── Worker coordination
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose
- Python 3.11+ (for workers)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-exercise-coach-vision-nlp
   make install
   ```

2. **Start development services:**
   ```bash
   make dev-up  # Starts Postgres, Redis, NATS
   ```

3. **Run the applications:**
   ```bash
   # Terminal 1: Frontend
   cd apps/frontend && npm run dev
   
   # Terminal 2: Backend  
   cd apps/backend && npm run dev
   
   # Terminal 3: Workers (optional)
   cd apps/workers && python -m workers.pose.main
   ```

4. **Access the applications:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/api/docs

### Using Make Commands

```bash
make help          # Show all available commands
make dev-up        # Start development services
make dev-down      # Stop development services  
make build         # Build all applications
make test          # Run all tests
make lint          # Run linting
make clean         # Clean build artifacts
```

## 📁 Project Structure

```
ai-exercise-coach-vision-nlp/
├── apps/
│   ├── frontend/          # Next.js 14 + React 18
│   │   ├── src/
│   │   │   ├── app/       # App Router pages
│   │   │   ├── components/# UI components
│   │   │   └── lib/       # Utilities
│   │   └── package.json
│   ├── backend/           # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── auth/      # Authentication
│   │   │   ├── users/     # User management
│   │   │   ├── sessions/  # Workout sessions
│   │   │   └── common/    # Shared utilities
│   │   └── package.json
│   └── workers/           # Python microservices
│       ├── workers/
│       │   ├── pose/      # Pose detection
│       │   ├── exercise/  # Exercise classification
│       │   ├── coach/     # Coaching engine
│       │   └── shared/    # Common utilities
│       └── requirements.txt
├── packages/
│   └── shared/            # Shared TypeScript packages
├── scripts/               # Database & deployment scripts
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.dev.yml # Development services
└── Makefile              # Development commands
```

## 🔧 Development

### Frontend (Next.js 14)

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Zustand for client state management
- **Camera:** WebRTC for video capture
- **Visualization:** WebGL for pose overlays
- **Voice:** Web Speech API for TTS/ASR

Key components:
- `CameraStage` - Video capture and pose overlay
- `CueDock` - Real-time coaching feedback
- `RepCounter` - Exercise rep tracking
- `ProgramBuilder` - Workout program creation

### Backend (NestJS)

- **Framework:** NestJS with TypeScript
- **Database:** Postgres 16 + pgvector for embeddings
- **Cache:** Redis for session state
- **Validation:** Zod schemas with nestjs-zod
- **Documentation:** OpenAPI 3.1 with Swagger UI
- **Authentication:** JWT with refresh tokens

API endpoints:
- `GET /` - Health check
- `POST /auth/login` - User authentication  
- `GET /users/:id` - User profile
- `POST /sessions` - Start workout session
- `POST /programs/generate` - Generate workout program

### Workers (Python)

- **Framework:** FastAPI for HTTP endpoints
- **ML/CV:** MediaPipe, OpenCV, PyTorch
- **NLP:** OpenAI GPT, Transformers, spaCy
- **Messaging:** NATS for inter-service communication
- **Database:** AsyncPG for Postgres connectivity

Worker services:
- **pose-worker** - Real-time pose detection and analysis
- **exercise-worker** - Exercise classification and rep counting
- **coach-worker** - Coaching cue generation and prioritization
- **nlp-worker** - Voice command processing and intent parsing

## 🧪 Testing

```bash
# Run all tests
make test

# Frontend tests
cd apps/frontend && npm test

# Backend tests  
cd apps/backend && npm run test:cov

# Python worker tests
cd apps/workers && pytest
```

## 📦 Deployment

### Production Build

```bash
make build
docker-compose up -d
```

### Platform Deployment

- **Frontend:** Vercel (automatic via GitHub)
- **Backend:** Render, Fly.io, or Google Cloud Run
- **Workers:** Google Cloud Run, AWS Lambda, or Kubernetes
- **Database:** Managed Postgres (Supabase, Neon, etc.)

## 🔒 Security & Privacy

- **On-device processing:** Pose detection runs locally when possible
- **Face blur:** Automatic face detection and blurring before any upload
- **Row-level security:** Database-level user isolation
- **Encryption:** Per-user encryption envelopes via KMS
- **GDPR compliance:** Data export and deletion workflows

## 📊 Monitoring

- **Metrics:** Prometheus + Grafana dashboards
- **Tracing:** OpenTelemetry distributed tracing  
- **Errors:** Sentry error tracking
- **Logs:** Structured logging with correlation IDs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MediaPipe team for pose detection models
- OpenAI for GPT-based coaching intelligence
- Next.js and NestJS communities for excellent frameworks
