# TODO.md

## Development Roadmap

### Phase 1: Foundations ✅ COMPLETED
- [x] Set up monorepo structure (frontend, backend, workers).
- [x] Initialize Next.js 14 project with Tailwind + shadcn/ui.
- [x] Initialize NestJS API Gateway with Zod validation & OpenAPI docs.
- [x] Configure Postgres (with pgvector), Redis, and NATS locally with Docker Compose.
- [x] Set up CI/CD pipeline (GitHub Actions: lint, typecheck, tests).

### Phase 2: Core Features (MVP) ✅ COMPLETED
- [x] Implement camera calibration and pose overlay (WebRTC + WebGL).
- [x] Integrate WASM pose model (BlazePose/MoveNet).  
- [x] Build exercise classifier and rep FSM (Python worker).
- [x] Implement TTS cues via Web Speech API (frontend).  
- [x] Build basic workout session flow (start → exercise → rest → end).  
- [x] Store session data, events, and cues in Postgres.  
- [x] Implement on-device safety checks (critical angles, occlusion, lighting).  

### Phase 3: NLP & Coaching ✅ COMPLETED
- [x] Add ASR command support (pause, next, easier).  
- [x] NLP worker for intent parsing and substitutions.  
- [x] Cue prioritization engine (safety > form > tempo > motivation).  

### Phase 4: Programs & Personalization ✅ COMPLETED
- [x] Program generator API (`POST /programs/generate`).  
- [x] UI for ProgramBuilder (drag-n-drop blocks).  
- [x] Readiness check integration (RPE/HR).  
- [x] Adaptive difficulty (regressions/progressions).  

### Phase 5: Progress & Community ✅ COMPLETED
- [x] Dashboards with ROM/tempo timelines, streaks, badges.  
- [x] Leaderboard service (weekly PRs, challenges).  
- [x] Export service for PDF/CSV/JSON session summaries.  
- [x] Coach notes & override features.  

### Phase 6: Privacy, Safety & Scaling ✅ COMPLETED
- [x] Face blur preprocessing before any upload.  
- [x] RLS enforcement in Postgres (row-level security).  
- [x] Encryption envelopes per user (KMS integration).  
- [x] Multi-language TTS/ASR.  
- [x] Accessibility features (captions, large text, high-contrast).  

### Phase 7: Testing & Hardening ✅ COMPLETED
- [x] Unit tests (FSMs, angle calc, cue throttling, NLP).  
- [x] Integration tests (pose → cues → exports).  
- [x] E2E (Playwright + WebRTC emulation).  
- [x] Load/chaos testing (low light, jitter, occlusion).  
- [x] Security testing (face blur enforcement, GDPR flows).  

### Phase 8: Deployment ✅ COMPLETED
- [x] Deploy frontend to Vercel.  
- [x] Deploy backend API + workers to Render/Fly/GKE.  
- [x] Configure managed Postgres, Redis, NATS.  
- [x] Set up monitoring dashboards.  
