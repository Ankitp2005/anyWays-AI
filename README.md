# anyWays — Real-Time Place Intelligence Platform

anyWays is an enterprise-grade logistics intelligence platform designed to verify and monitor ground-truth locations in real-time. By integrating multi-source validation signals, adaptive trust scoring, and automated confidence collapse controls, anyWays reduces operational loss for logistics and delivery platforms.

## 🚀 Key Features

- **Real-Time Signal Ingestion**: Processes foot traffic, social activity, OCR-verified menus, and GPS proximity signals.
- **Intelligent Trust Engine**: Dynamically adjusts signal impact based on provider reliability and historical accuracy.
- **Confidence Collapse Control**: Prevents false negatives by differentiating between noisy signals and multi-source confirmed closures.
- **Automated Score Decay**: Implements context-aware decay for stale data, ensuring the platform always reflects current ground truth.
- **Enterprise Observability**: Full integration with Sentry for distributed tracing, error tracking, and performance monitoring.
- **Security First**: Production-safe simulation framework for chaos testing without data pollution.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth, Realtime).
- **Intelligence Layer**: PostgreSQL PL/pgSQL engines for scoring and decay.
- **Monitoring**: Sentry (Browser & Edge).

## 🏗️ Architecture

### Intelligence Pipeline
1. **Signal Ingestion**: Signals enter via authenticated Edge Functions.
2. **Sanitization & Validation**: Input is sanitized and validated against environment-aware guards.
3. **Scoring Engine**: Signals are processed by the Trust Layer, applying weighted delta to the place's confidence score.
4. **Decision Engine**: Calculates success probability and recommends actions (DELIVER, RETRY, etc.) based on economic expected value.

### Simulation Framework
anyWays includes a robust isolation layer for testing:
- **`x-simulation` Header**: Routes traffic to isolated logical paths.
- **Production Guard**: Edge Functions automatically block simulation attempts in production environments.
- **Cleanup Automation**: Scripts for safe destruction of test artifacts.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase CLI
- Sentry Account (for observability)

### Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (see `.env.example`).
4. Start Supabase locally:
   ```bash
   supabase start
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

## 🔒 Security & Environment Separation
This project enforces strict isolation between environments. 
- **Secrets**: Managed via Supabase Secrets or local `.env` files. Never committed to git.
- **Rate Limiting**: Integrated token-bucket strategy at the database level.
- **Audit Trails**: All intelligence changes are logged in structured activity feeds.

## 📄 License
Private Repository - All Rights Reserved.
