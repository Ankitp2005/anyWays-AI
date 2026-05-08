# anyWays - Comprehensive Project Documentation

## 1. Project Overview & Objective

**Project Name**: anyWays

**Objective and Aim**: 
To build a highly reliable "Place Intelligence" platform that bridges the gap between static map data and dynamic real-world reality. anyWays aims to provide ground truth data about real-world locations for AI agents, copilots, robotics systems, and logistics applications. By continually validating places using dynamic signals (like foot traffic patterns or OCR scanning of menus), the platform ensures AI systems understand, validate, and act on location data with absolute confidence.

**Problem Statement**: 
Traditional map APIs provide static "pins" on a map, which frequently go out of date. Restaurants close, businesses relocate, or operating hours change, but these static maps lag behind reality. For autonomous AI agents, robotics, or delivery logistics relying on precise drop-offs and interactions, this stale data leads to operational failures. anyWays solves this by dynamically tracking and validating the "live status" of locations through multi-modal signal validation and offering an action-ready API.

---

## 2. Core Features & Capabilities

Our development so far encompasses an MVP platform serving both as a public-facing developer onboarding tool and an internal dashboard.

### 2.1 Marketing & Onboarding 
- **Landing Page**: A comprehensive, high-conversion landing page outlining the platform's utility with active API code previews and a breakdown of "Live Signal Monitoring" and "Confidence & Validation."

### 2.2 Developer Dashboard
- **Dashboard Overview**: Essential metrics reflecting total places tracked, validation statistics, recent activities, and chronological confidence score trends.
- **Places Intelligence**: A searchable, filterable table managing real-world location tracking. Users can view status indicators (e.g., `OPEN`, `CLOSED`, `RENNOVATING`) and dig into detailed place views to check granular validation signals.
- **API Management**: Full lifecycle management of API keys, allowing users to generate new keys, track their exact usage endpoints, monitor API usage, and securely revoke access.
- **Settings & User Management**: Basic user environment setups mapped to authentication. 

---

## 3. System Architecture

The project has evolved from a pure-frontend prototype into a robust Full-Stack application.

### 3.1 Technology Stack summary

*   **Frontend**: React 19.2, TypeScript 5.9, Vite 7.2
*   **Styling**: Tailwind CSS 4.1.18, PostCSS, Lucide React icons
*   **State Management (Client)**: React Context API (`AppContext`)
*   **Backend Server**: Node.js, Express.js 5.2.1, TypeScript
*   **Database & ORM**: PostgreSQL, Prisma ORM 7.3.0
*   **Security & Auth**: JWT (JSON Web Tokens), bcrypt for password hashing, Helmet for secure HTTP headers, Zod for data validation.

---

## 4. Frontend Implementation

The frontend architecture defines the Developer Console and User workflows. 

### Component Breakdown
- **Authentication**: `Login.tsx` and `Register.tsx` provide secure entry points, fully linked to the newly built backend API.
- **Marketing View**: Introduces external users to the API platform gracefully.
- **Dashboard Layout**: Serves as the container for logged-in operations. 
  - *PlacesTable*: Renders a list of the tracked locations with data filtering capacities.
  - *PlaceDetails*: Extracts deep validation insights on a single Place entity.
  - *ApiKeysManagement*: Handles the creation, copying (via clipboard), and revocation of developer tokens.
  - *EmptyState*: Graceful fallbacks for missing data.

### Styling & Design System
Uses a custom Tailwind CSS 4 setup with dark mode capabilities mapped to system preferences. UI/UX is built with modular principles relying on modern React concurrent rendering, resulting in a fast, SPA-driven experience without full-page reloads.

---

## 5. Backend Implementation

The backend constitutes the "Real Platform" engine, pivoting away from early client-storage stubs. 

### API layer
Built atop Express, the structure is modularized into endpoints with corresponding controllers:
- **Authentication Routes (`/auth`)**: Register, login, and refresh tokens generation.
- **Places Routes (`/places`)**: Read/write endpoints to manage the real-world locations. Protected entirely by JWT authentication logic.
- **Middleware**: Built around an `auth.middleware.ts` to block unauthenticated requests and an `errorHandler.ts` to gracefully manage exceptions. Zod manages request validation before hitting controllers.

### Database Design (Prisma)
The database schema (`schema.prisma`) represents our business logic perfectly:

1.  **User**: Standard auth model tracking user credentials, linking to API Keys and Places.
2.  **ApiKey & ApiKeyUsage**: Dedicated models handling API permissions, hashes, revocation states, and usage telemetry (endpoint tracking).
3.  **Place**: The core entity storing coordinates, real-world addresses, status Enums (`OPEN`, `PERMANENTLY_CLOSED`), and aggregate `confidenceScore`.
4.  **ValidationSignal**: Associates with Places, storing dynamic signals (`FOOT_TRAFFIC`, `OCR_MENU`, `SOCIAL_SENTIMENT`) with dedicated confidence impact scoring in JSON formats.
5.  **RefreshToken**: To ensure long-lived but secure sessions across the dashboard without constantly asking the user to login.

---

## 6. Current Progress & Working Environment

- **Frontend-Backend Integration**: The connection from the frontend Dashboard and Authentication screens to the backend Prisma-backed Express instance is complete.
- **API Key Enhancements**: We migrated from basic `crypto` generation to full `uuid` generation and securely store keys inside PostgreSQL via Prisma.
- **Data Persistence**: Removed standard `localStorage` structures moving fully to the SQL environment.
- **Rate Limiting Engine**: Implemented a modular **Token Bucket Rate Limiter** for Supabase Edge Functions. It utilizes PostgreSQL for distributed state management, ensuring fair usage across the Growth and Enterprise tiers.

## 7. Future Roadmap Planning

1. **Live Signal Ingestion API**: Open a backend endpoint for edge devices (mobiles/robots) to push asynchronous real-world signals (`ValidationSignal`) directly into the database.
2. **Confidence Algorithm Optimization**: Develop an aggregate algorithmic process that automatically adjusts the `confidenceScore` in the `Place` model whenever new signals are registered.
3. **Enterprise Scalability & Usage Limits**: Integrate the implemented Rate Limiter middleware into all public-facing Edge Functions to enforce subscription-based limits (Starter: 25k, Growth: 100k signals).
