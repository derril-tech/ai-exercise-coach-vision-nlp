# ARCH.md

## System Architecture — AI Exercise Coach

### High-Level Diagram
```
Frontend (Next.js 14 + React 18) 
   | WebRTC / SSE / REST
   v
API Gateway (NestJS)
   | gRPC / NATS
   v
Python Workers (pose, exercise, coach, NLP, program, metrics, export)
   |
   +-- Postgres (pgvector)
   +-- Redis (cache/state)
   +-- NATS (event bus)
   +-- S3/R2 (exports/clips)
```

### Frontend (Next.js + React)
- **WebRTC**: webcam stream capture, pose overlay (WebGL).  
- **UI Components**: CameraStage, CueDock, RepCounter, FormMeter, RestTimer, ProgramBuilder, SessionSummary, Leaderboards.  
- **Stores**: Zustand hooks (`useWorkoutStore`, `useSessionStore`, etc.).  
- **TTS/ASR**: Web Speech API (Edge TTS fallback), ASR client with VAD.  
- **Validation**: Zod schemas, Problem+JSON error banners.  
- **Accessibility**: high-contrast mode, captions, keyboard navigation.  

### Backend (NestJS)
- REST /v1 with OpenAPI 3.1.  
- Zod validation, Problem+JSON error format.  
- RBAC with Casbin.  
- RLS by `user_id`.  
- Idempotency-Key & Request-ID headers.  
- SSE for real-time coaching events (or WebRTC data channel).  

### Workers (Python + FastAPI)
- **pose-worker**: MoveNet/BlazePose/RTMPose, smoothing filters.  
- **exercise-worker**: FSM-based rep/tempo/ROM detection.  
- **coach-worker**: cue selection & TTS script generation.  
- **nlp-worker**: ASR intent parse, natural-language substitutions.  
- **program-worker**: goal-based progression logic.  
- **metrics-worker**: aggregations, streaks, leaderboards.  
- **export-worker**: generate PDF/CSV/JSON reports.  

### Eventing
- **NATS Topics**: `pose.stream`, `exercise.detect`, `cue.make`, `nlp.intent`, `program.plan`, `metrics.rollup`, `export.make`.  
- **Redis Streams**: session progress, rate limiting.  

### Data Layer
- **Postgres 16 + pgvector**: users, profiles, sessions, sets, events, cues, leaderboards, programs, exports.  
- **Redis**: session state, throttling, rate limits.  
- **S3/R2**: session clips, export files.  
- **Encryption**: KMS with per-user envelopes.  

### Observability & Security
- **Tracing**: OpenTelemetry.  
- **Metrics**: Prometheus + Grafana.  
- **Errors**: Sentry.  
- **Security**: TLS/HSTS, SSO (Apple/Google), GDPR compliance, audit logs for exports.  

### DevOps & Deployment
- **Frontend**: Vercel.  
- **Backend**: Render/Fly/GKE with autoscaling GPU nodes (for pose fallback).  
- **CI/CD**: GitHub Actions (lint, typecheck, test, build, deploy).  
- **Storage/CDN**: S3/R2 with CDN for WASM/WebGPU model assets.  
