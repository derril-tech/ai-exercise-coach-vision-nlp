AI Exercise Coach (Vision + NLP) — webcam checks posture while giving spoken instructions 

 

1) Product Description & Presentation 

One-liner 

“Turn your webcam into a real-time coach that counts reps, fixes form, and talks you through every set—personalized to your body and goals.” 

What it produces 

Live coaching: frame-by-frame posture feedback, spoken cues, rep counting, tempo tracking, rest timers. 

Form reports: per-exercise scores (depth, alignment, ROM, tempo), heatmaps, error timelines. 

Programs: goal-based workouts (strength, mobility, rehab-light) with progressive overload. 

Leaderboards & streaks: gamified adherence, badges, and PR logs. 

Exports: PDF session summaries, CSV metrics, and JSON bundle (poses, events, scores). 

Scope/Safety 

Fitness guidance, not medical/physio advice. Auto-pauses on risky form flags; suggests regressions instead of pushing through pain. 

Works device-only by default (on-device pose), with optional cloud analytics export. 

 

2) Target User 

Consumers training at home with bodyweight or light equipment. 

Personal trainers/gyms offering remote form feedback. 

Wellness programs (corporate/insurance) tracking adherence & ergonomics. 

Rehab-adjacent users needing gentle ROM cues (non-clinical). 

 

3) Features & Functionalities (Extensive) 

Vision & Sensing 

Pose estimation (33–136 keypoints depending on model): body, hands, feet, head/neck. 

Multi-angle: front/side auto-detection; prompts user to rotate if occluded. 

Depth cues: monocular heuristics + device LiDAR (if available) for knee/hip depth & spine tilt. 

Environment checks: lighting, camera height, frame fit; real-time tips. 

Form Intelligence 

Exercise classifiers: squat, lunge, hinge (RDL), push-up, plank, row, press, sit-up, yoga asanas, desk ergonomics. 

ROM & alignment: joint angle bands (e.g., knee valgus > X°, back flexion > Y°), bar/path proxies (wrist/hip tracks). 

Tempo: eccentric/isometric/concentric timing; speed violations. 

Rep/Set logic: clean start/end states; no “ghost reps”; failure detection. 

Adaptive difficulty: regressions (box squat/elevated push-up) or progressions (tempo, pause, weight). 

Voice & NLP 

TTS coaching: concise cues (“drive knees out”, “neutral spine”, “slow the descent”). 

ASR commands: “pause”, “next set”, “lighter progression”. 

Intent chat: natural-language warmup requests, substitutions, equipment constraints. 

Programming & Personalization 

Goal engine: strength, hypertrophy, mobility; periodization templates. 

Readiness check: RPE and HR (optional smartwatch) to auto-scale load/volume. 

Injury-friendly variants: configurable exclusions with alternatives. 

Progress & Community 

Dashboards: volume, best ROM, tempo consistency, adherence streaks. 

Challenges: weekly ROM improvements, plank time, mobility flows. 

Coach notes: AI summaries + trainer override. 

Privacy & Safety 

On-device inference path; opt-in cloud sync; face blur toggle. 

No sharing video frames without consent; strict PII controls. 

 

4) Backend Architecture (Extremely Detailed & Deployment-Ready) 

4.1 Topology 

Frontend/BFF: Next.js 14 (Vercel). Server Actions for auth, signed exports; SSR for dashboards. 

API Gateway: NestJS (Node 20) — REST /v1, OpenAPI 3.1, Zod validation, RBAC (Casbin), RLS (by user_id), Problem+JSON, Idempotency-Key, Request-ID (ULID). 

Realtime: WebRTC (camera) → on-device WASM/TensorRT by default; optional gRPC to pose microservice for low-end devices. 

Workers (Python 3.11 + FastAPI control) 

pose-worker (cloud fallback): MoveNet/BlazePose/RTMPose; smoothing (1€ filter). 

exercise-worker: classifier + rep/tempo/ROM logic, error events. 

coach-worker: cue selection, TTS script, cue throttle. 

nlp-worker: ASR intent parse, chat goals, substitution planner. 

program-worker: block periodization & progression rules. 

metrics-worker: aggregation, PRs, streaks, leaderboards. 

export-worker: PDF/CSV/JSON reports. 

Event bus: NATS topics (pose.stream, exercise.detect, cue.make, nlp.intent, program.plan, metrics.rollup, export.make) + Redis Streams (progress). 

Data 

Postgres 16 + pgvector (users, sessions, events, cues, programs). 

S3/R2 (optional session clips, exports). 

Redis (session state, throttling, rate limits). 

Observability: OpenTelemetry traces, Prometheus/Grafana metrics, Sentry errors. 

Secrets: Cloud KMS; per-user encryption envelope. 

4.2 Data Model (Postgres + pgvector) 

CREATE TABLE users ( 
  id UUID PRIMARY KEY, email CITEXT UNIQUE, name TEXT, tz TEXT, locale TEXT, 
  goals TEXT[], injuries TEXT[], equipment TEXT[], created_at TIMESTAMPTZ DEFAULT now() 
); 
 
CREATE TABLE profiles ( 
  user_id UUID PRIMARY KEY REFERENCES users(id), 
  height_cm INT, weight_kg INT, preferred_cues TEXT[], blur_face BOOLEAN DEFAULT true 
); 
 
CREATE TABLE sessions ( 
  id UUID PRIMARY KEY, user_id UUID, program_id UUID, started_at TIMESTAMPTZ, 
  ended_at TIMESTAMPTZ, device TEXT, angle TEXT, notes TEXT 
); 
 
CREATE TABLE events ( 
  id UUID PRIMARY KEY, session_id UUID, ts_ms BIGINT, 
  kind TEXT, -- pose|rep|error|cue|asr|set 
  payload JSONB 
); 
 
CREATE TABLE sets ( 
  id UUID PRIMARY KEY, session_id UUID, exercise TEXT, target_reps INT, 
  actual_reps INT, tempo JSONB, rom JSONB, rpe NUMERIC, score NUMERIC 
); 
 
CREATE TABLE programs ( 
  id UUID PRIMARY KEY, user_id UUID, title TEXT, phase TEXT, 
  microcycle JSONB, -- weeks→days→exercises 
  created_at TIMESTAMPTZ DEFAULT now() 
); 
 
CREATE TABLE cues ( 
  id UUID PRIMARY KEY, event_id UUID, text TEXT, type TEXT, -- form|tempo|motivation 
  tts_url TEXT, acknowledged BOOLEAN DEFAULT false 
); 
 
CREATE TABLE leaderboards ( 
  id UUID PRIMARY KEY, metric TEXT, window TEXT, entries JSONB, updated_at TIMESTAMPTZ DEFAULT now() 
); 
 
CREATE TABLE exports ( 
  id UUID PRIMARY KEY, session_id UUID, kind TEXT, s3_key TEXT, created_at TIMESTAMPTZ DEFAULT now() 
); 
  

Invariants 

RLS on user_id. 

A rep event requires valid start/end posture states. 

Cues rate-limited (e.g., ≥4 s between same-type cues). 

Face blur flag applied before any remote frame transfer. 

4.3 API Surface (REST /v1) 

Auth & Profile 

POST /auth/signup, POST /auth/login, GET /me 

PUT /profile {height_cm, equipment, injuries, preferred_cues, blur_face} 

Sessions & Streaming 

POST /sessions/start {program_id?} 

POST /sessions/:id/end 

POST /sessions/:id/pose (cloud fallback; batched keypoints @ 30–60 FPS) 

GET /sessions/:id/summary 

Coaching & NLP 

POST /coach/cue {session_id, exercise, state} → next best cue 

POST /nlp/intent {session_id, transcript} → {intent:"pause|next|scale_down", params:{...}} 

Programs 

POST /programs/generate {goal:"strength|mobility|recomp", days_per_week:3} 

GET /programs/:id 

Exports 

POST /exports/session {session_id, format:"pdf|csv|json"} 

Conventions: Idempotency-Key on mutations; Problem+JSON errors; SSE for live coaching events (if not using WebRTC data channel). 

4.4 Algorithms & Logic (Core) 

Pose smoothing: Savitzky–Golay/1€ filter for jitter. 

Rep FSMs: exercise-specific finite-state machines using joint angle thresholds (auto-calibrated from user warmup). 

ROM scoring: normalized per-user anthropometrics; penalties for valgus, lumbar flexion, shoulder impingement angles. 

Cue selection: priority queue (safety > form > tempo > motivational); cooldowns; diversity (no repeated phrase thrice). 

Progression: double progression (reps then load) or ROM-first for mobility blocks. 

4.5 Security & Compliance 

SSO (Apple/Google), TLS/HSTS, signed URLs; face blur & on-device default. 

GDPR delete/export; audit log of data exports. 

 

5) Frontend Architecture (React 18 + Next.js 14 — Looks Matter) 

5.1 Design Language 

shadcn/ui + Tailwind with glass cards, neon accents, soft shadows; dark theme default. 

Framer Motion micro-interactions: rep-counter pops, cue chips slide-in, rest-timer sweep. 

WebGL overlay: pose skeleton & joint-angle arcs with smooth easing. 

5.2 App Structure 

/app 
  /(marketing)/page.tsx 
  /(auth)/sign-in/page.tsx 
  /(app)/dashboard/page.tsx 
  /(app)/workout/page.tsx 
  /(app)/programs/page.tsx 
  /(app)/sessions/[id]/page.tsx 
  /(app)/leaderboard/page.tsx 
/components 
  CameraStage/*          // WebRTC + WebGL pose overlay + angle HUD 
  CueDock/*              // live cue chips + TTS status 
  RepCounter/*           // big numerals + tempo rings 
  FormMeter/*            // ROM/valgus/back-angle gauges 
  RestTimer/*            // radial timer + HR (optional) 
  ExercisePicker/*       // search + equipment filter 
  ProgramBuilder/*       // days x blocks drag-n-drop 
  SessionSummary/*       // heatmaps, timelines, PR badges 
  StreakCard/*           // gamification widgets 
/lib 
  pose-wasm.ts           // WASM model loader (WASM/ WebGPU fallback) 
  audio-tts.ts           // Web Speech API/Edge TTS client 
  asr-client.ts          // VAD + streaming ASR (on-device/cloud) 
  api-client.ts 
  sse-client.ts 
  zod-schemas.ts 
  rbac.ts 
/store 
  useWorkoutStore.ts 
  useSessionStore.ts 
  useProgramStore.ts 
  useLeaderboardStore.ts 
  

5.3 Key UX Flows 

Quick Start: pick workout → camera calibration (height/angle guide) → 10 s warmup to auto-calibrate angles → start. 

Live Workout: 

Pose overlay with angle arcs & RepCounter. 

CueDock speaks/writes concise guidance; color pulse on safety warnings. 

RestTimer with suggested next load/rep target. 

ASR Commands: “pause”, “next exercise”, “easier option” → instant state change. 

Summary: timeline of reps & errors; ROM heatmap; export/share; add coach notes. 

Programs: drag-n-drop blocks; swap exercises based on equipment availability. 

5.4 Validation & Errors 

Zod validation on forms; Problem+JSON banners. 

“Low light / camera too high / occluded joints” inline tips. 

Guardrails: auto-pause & speak warning if critical angles exceeded repeatedly. 

5.5 Accessibility & i18n 

Large-text and high-contrast modes; captions for all voice cues; keyboard controls. 

Multilingual TTS/ASR; metric/imperial units. 

 

6) SDKs & Integration Contracts 

Start a session 

POST /v1/sessions/start 
{ "program_id":"UUID" } -> { "session_id":"UUID" } 
  

(Cloud fallback) Send batched keypoints 

POST /v1/sessions/{id}/pose 
{ 
  "fps":30, 
  "frames":[ 
    {"ts_ms":1724841000000,"kp":[[x,y,conf],...]}  // normalized 0..1 
  ] 
} 
  

Get coaching cue 

POST /v1/coach/cue 
{ "session_id":"UUID","exercise":"squat","state":{"angles":{"knee_l":164,"hip_l":92},"tempo":{"ecc":2.1}} } 
  

Generate a program 

POST /v1/programs/generate 
{ "goal":"strength","days_per_week":3,"equipment":["dumbbells","bench"] } 
  

Export summary 

POST /v1/exports/session 
{ "session_id":"UUID","format":"pdf" } 
  

JSON bundle keys: sessions[], sets[], events[], cues[], programs[], exports[]. 

 

7) DevOps & Deployment 

FE: Vercel (Next.js). 

APIs/Workers: Render/Fly/GKE; GPU nodes optional (cloud pose). 

DB: Managed Postgres + pgvector; PITR; read replicas. 

Cache/Bus: Redis + NATS; DLQ with jitter. 

Storage/CDN: S3/R2 for exports/clips; CDN for model assets (WASM/WebGPU). 

CI/CD: GitHub Actions (lint/typecheck/unit/integration, model checksum, image scan, sign, deploy). 

SLOs 

On-device pose inference ≥ 30 FPS (WebGL/WebGPU), cloud fallback p95 < 120 ms RTT per batch. 

Cue latency (event → TTS start) < 250 ms p95. 

Session export < 5 s p95. 

 

8) Testing 

Unit: angle calculators, FSM rep detection, cue throttling, ASR intents. 

Vision: keypoint accuracy vs ground truth; smoothing jitter metrics. 

Latency: end-to-end cue latency under constrained networks. 

Integration: on-device → cues → ASR commands → exports. 

E2E (Playwright + WebRTC emu): start workout → complete sets → pause via voice → export PDF. 

Load/Chaos: low light, occlusion, multi-person in frame; network jitter; packet loss. 

Security: RLS coverage; opt-out local-only mode honored; face-blur enforcement. 

 

9) Success Criteria 

Product KPIs 

Time to first coached set < 60 s from signup. 

Adherence: ≥ 3 sessions/week median after week 2. 

Form improvement: ROM or alignment score +20% by week 4 for new users. 

User rating ≥ 4.6/5 on coaching helpfulness. 

Engineering SLOs 

Frame drop rate < 3% at 30 FPS on target devices. 

Rep detection precision/recall ≥ 95% (benchmarked sets). 

TTS/ASR availability ≥ 99.5%. 

 

10) Visual/Logical Flows 

A) Calibrate & Start 

 Camera checks → posture landmarks stable → warmup reps calibrate thresholds → start coaching. 

B) Detect & Coach 

 Pose → classifier → FSM detects phase → generate cue (safety > form > tempo) → speak & display → update counters/tempo rings. 

C) Set Complete 

 Auto rest timer → load/rep recommendation → ASR “next” continues. 

D) Session Summary 

 ROM/tempo timeline, error hotspots, PRs → export PDF/CSV/JSON → update program progression. 

E) Ongoing Program 

 Weekly block auto-updates based on adherence & RPE → reminders & streaks → community challenges. 

 

 