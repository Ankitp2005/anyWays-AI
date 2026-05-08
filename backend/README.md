# anyWays Backend

This is the backend service for the anyWays Place Intelligence platform.

## Technologies
- Node.js
- Express
- TypeScript

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Running the Server

**Development Mode** (with hot-reload):
```bash
npm run dev
```

**Production Build**:
```bash
npm run build
npm start
```

## API Endpoints

### Database Setup

1. **Configure Environment**:
   Ensure `.env` has the correct `DATABASE_URL` for your PostgreSQL instance.
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/anyways_db?schema=public"
   ```

2. **Run Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Database**:
   ```bash
   npx prisma db seed
   ```

4. **Studio (GUI)**:
   ```bash
   npx prisma studio
   ```
