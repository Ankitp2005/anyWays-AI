# anyWays - Technical Design Document

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Marketing  │  │   Dashboard  │  │  Components  │  │
│  │     View     │  │    Layout    │  │   Library    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│              AppContext (State Management)               │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Storage    │  │    Models    │  │   Utilities  │  │
│  │   Service    │  │    (Types)   │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  Browser localStorage                    │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Core Framework**:
- React 19.2.0 (latest with concurrent features)
- TypeScript 5.9.3 (strict type checking)
- Vite 7.2.4 (fast build tool and dev server)

**Styling**:
- Tailwind CSS 4.1.18 (utility-first CSS)
- PostCSS 8.5.6 (CSS processing)
- class-variance-authority (component variants)
- tailwind-merge (class merging utility)

**UI Components**:
- Lucide React (icon library)
- Custom component library

**State Management**:
- React Context API
- Custom hooks (useApp)

**Utilities**:
- uuid (unique ID generation)
- date-fns (date formatting)
- clsx (conditional classes)

**Development Tools**:
- ESLint (code linting)
- Vitest (unit testing)
- Testing Library (component testing)

---

## 2. Application Structure

### 2.1 Directory Organization

```
src/
├── components/          # React components
│   ├── MarketingHome.tsx       # Landing page
│   ├── DashboardLayout.tsx     # Main dashboard container
│   ├── DashboardOverview.tsx   # Overview tab content
│   ├── PlacesTable.tsx         # Places list view
│   ├── PlaceDetails.tsx        # Individual place view
│   ├── ApiKeysManagement.tsx   # API key management
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── SearchBar.tsx           # Search component
│   ├── NoteList.tsx            # Notes list (future feature)
│   ├── NoteEditor.tsx          # Note editor (future feature)
│   └── EmptyState.tsx          # Empty state component
│
├── context/             # State management
│   └── AppContext.tsx          # Global app state
│
├── models/              # TypeScript types
│   └── types.ts                # All type definitions
│
├── services/            # Business logic
│   └── storage.ts              # localStorage abstraction
│
├── utils/               # Utility functions
│   ├── cn.ts                   # Class name utility
│   └── cn.test.ts              # Utility tests
│
├── App.tsx              # Root component
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

### 2.2 Component Hierarchy

```
App
├── MarketingHome (when currentView === 'marketing')
│   ├── Navigation
│   ├── Hero Section
│   ├── Features Section
│   ├── API Preview Section
│   └── Footer
│
└── DashboardLayout (when currentView === 'dashboard')
    ├── Sidebar
    │   └── Navigation Items
    │
    └── Main Content Area
        ├── DashboardOverview (activeTab === 'overview')
        │   ├── Metrics Cards
        │   ├── Recent Activity
        │   └── Charts/Visualizations
        │
        ├── PlacesTable (activeTab === 'places')
        │   ├── SearchBar
        │   ├── Filters
        │   └── Table Rows
        │       └── PlaceDetails (on selection)
        │           ├── Status Badge
        │           ├── Confidence Score
        │           ├── Validation Signals
        │           └── Metadata
        │
        ├── ApiKeysManagement (activeTab === 'api')
        │   ├── Key Generation Form
        │   └── Keys List
        │
        └── Settings (activeTab === 'settings')
            └── Configuration Forms
```

---

## 3. Data Models

### 3.1 Core Types

```typescript
// Place Intelligence
interface Place {
  id: string;
  name: string;
  address: string;
  category: string;
  status: PlaceStatus;
  validationState: ValidationState;
  confidenceScore: number;
  lastVerified: string;
  signals: ValidationSignal[];
  metadata: PlaceMetadata;
}

type PlaceStatus = 'OPEN' | 'CLOSED' | 'MOVED' | 'RENNOVATING';
type ValidationState = 'CONFIRMED' | 'PENDING' | 'FLAGGED';

interface ValidationSignal {
  type: 'OCR_MENU' | 'FOOT_TRAFFIC' | 'DIGITAL_FOOTPRINT' | 
        'USER_REPORT' | 'OPERATIONAL_PATTERN';
  confidence: number;
  timestamp: string;
  source: string;
}

interface PlaceMetadata {
  hasEntrances: boolean;
  hasMenu: boolean;
  paymentMethods: string[];
}

// API Keys
interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastUsed?: string;
}

// Dashboard Metrics
interface Metric {
  label: string;
  value: string | number;
  change?: number;
  trend: 'up' | 'down' | 'neutral';
}

// Application State
interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
}

interface FilterState {
  searchQuery: string;
  selectedTags: string[];
  notebookId: string | null;
  favoritesOnly: boolean;
}
```

### 3.2 State Management Design

**AppContext Structure**:
```typescript
interface AppContextType {
  // View State
  currentView: 'marketing' | 'dashboard';
  setView: (view: AppView) => void;
  
  // Data
  notes: Note[];
  tags: Tag[];
  notebooks: Notebook[];
  currentNoteId: string | null;
  filters: FilterState;
  preferences: AppPreferences;
  
  // Actions
  addNote: (notebookId?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setCurrentNoteId: (id: string | null) => void;
  
  addTag: (name: string, color?: string) => void;
  deleteTag: (id: string) => void;
  
  addNotebook: (name: string) => void;
  deleteNotebook: (id: string) => void;
  
  setSearchQuery: (query: string) => void;
  toggleTagFilter: (tagId: string) => void;
  setNotebookFilter: (notebookId: string | null) => void;
  
  toggleTheme: () => void;
  toggleSidebar: () => void;
}
```

**State Persistence**:
- All state changes automatically sync to localStorage
- State is hydrated on application load
- Separate storage keys for different data types

---

## 4. Service Layer

### 4.1 Storage Service

**Purpose**: Abstract localStorage operations and provide type-safe data access

**API Design**:
```typescript
class StorageService {
  // Places
  static getPlaces(): Place[]
  static savePlaces(places: Place[]): void
  
  // API Keys
  static getApiKeys(): ApiKey[]
  static saveApiKeys(keys: ApiKey[]): void
  
  // Notes (future feature)
  static getNotes(): Note[]
  static saveNotes(notes: Note[]): void
  
  // Tags
  static getTags(): Tag[]
  static saveTags(tags: Tag[]): void
  
  // Notebooks
  static getNotebooks(): Notebook[]
  static saveNotebooks(notebooks: Notebook[]): void
  
  // Preferences
  static getPreferences(): AppPreferences
  static savePreferences(prefs: AppPreferences): void
  
  // Utility
  static clearAll(): void
}
```

**Storage Keys**:
- `anyways_places` - Place data
- `anyways_api_keys` - API keys
- `anyways_notes` - Notes data
- `anyways_tags` - Tags
- `anyways_notebooks` - Notebooks
- `anyways_preferences` - User preferences

**Error Handling**:
- Graceful fallback to empty arrays/default values
- Try-catch blocks for JSON parsing
- Console warnings for storage errors

---

## 5. UI/UX Design Patterns

### 5.1 Design System

**Color Palette** (Tailwind CSS variables):
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --secondary: 217.2 32.6% 17.5%;
  --muted: 217.2 32.6% 17.5%;
  --accent: 217.2 32.6% 17.5%;
  --border: 217.2 32.6% 17.5%;
}
```

**Typography**:
- Font Family: System font stack (sans-serif)
- Headings: Bold, tight tracking
- Body: Regular weight, relaxed line height
- Code: Monospace font for API examples

**Spacing**:
- Base unit: 4px (Tailwind default)
- Component padding: 16px - 32px
- Section spacing: 64px - 96px

### 5.2 Component Patterns

**Card Component**:
```tsx
<div className="bg-card p-8 rounded-xl border border-border shadow-sm">
  {/* Content */}
</div>
```

**Button Variants**:
- Primary: `bg-primary text-primary-foreground`
- Secondary: `border border-input bg-background/50`
- Ghost: `hover:bg-accent`

**Status Badges**:
```tsx
// OPEN - Green
<span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
  OPEN
</span>

// CLOSED - Red
<span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
  CLOSED
</span>

// PENDING - Yellow
<span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
  PENDING
</span>
```

**Confidence Score Display**:
```tsx
<div className="flex items-center gap-2">
  <div className="flex-1 bg-secondary rounded-full h-2">
    <div 
      className="bg-primary h-2 rounded-full"
      style={{ width: `${confidenceScore}%` }}
    />
  </div>
  <span className="text-sm font-medium">{confidenceScore}%</span>
</div>
```

### 5.3 Animation Strategy

**Page Transitions**:
```tsx
className="animate-in fade-in slide-in-from-bottom-4 duration-500"
```

**Hover Effects**:
- Buttons: Scale slightly, change opacity
- Cards: Lift with shadow
- Links: Underline on hover

**Loading States**:
- Skeleton screens for data loading
- Spinner for async operations
- Progress bars for multi-step processes

---

## 6. Routing and Navigation

### 6.1 View Management

**Current Implementation**:
- Single-page application with view state
- `currentView` state: 'marketing' | 'dashboard'
- No URL routing (future enhancement)

**Navigation Flow**:
```
Marketing Home → Dashboard Layout
                 ├── Overview Tab
                 ├── Places Tab
                 ├── API Keys Tab
                 └── Settings Tab
```

### 6.2 Future Routing Strategy

**Recommended**: React Router v6

**Proposed Routes**:
```
/                    → Marketing Home
/dashboard           → Dashboard Overview
/dashboard/places    → Places Table
/dashboard/places/:id → Place Details
/dashboard/api-keys  → API Keys Management
/dashboard/settings  → Settings
```

---

## 7. Performance Optimization

### 7.1 React Optimization

**Memoization**:
```typescript
// Context value memoization
const value = useMemo(() => ({
  currentView, setView,
  notes, tags, notebooks,
  // ... all context values
}), [currentView, notes, tags, notebooks, ...]);
```

**Component Optimization**:
- Use `React.memo()` for expensive components
- Avoid inline function definitions in render
- Use `useCallback` for event handlers passed as props

### 7.2 Data Optimization

**Filtering Strategy**:
```typescript
// Compute filtered data in useMemo
const filteredPlaces = useMemo(() => {
  return places.filter(place => {
    // Apply search query
    if (searchQuery && !place.name.toLowerCase().includes(searchQuery)) {
      return false;
    }
    // Apply status filter
    if (statusFilter && place.status !== statusFilter) {
      return false;
    }
    return true;
  });
}, [places, searchQuery, statusFilter]);
```

**Lazy Loading**:
- Implement virtual scrolling for large lists
- Load place details on demand
- Paginate API keys list

### 7.3 Bundle Optimization

**Code Splitting**:
```typescript
// Lazy load dashboard
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));

// Lazy load marketing
const MarketingHome = lazy(() => import('./components/MarketingHome'));
```

**Tree Shaking**:
- Import only needed Lucide icons
- Use ES modules for all imports
- Avoid default exports where possible

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Utility Functions**:
```typescript
// src/utils/cn.test.ts
describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
```

**Service Layer**:
```typescript
describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('saves and retrieves places', () => {
    const places = [/* mock data */];
    StorageService.savePlaces(places);
    expect(StorageService.getPlaces()).toEqual(places);
  });
});
```

### 8.2 Component Tests

**Example Test**:
```typescript
import { render, screen } from '@testing-library/react';
import { PlacesTable } from './PlacesTable';

describe('PlacesTable', () => {
  it('renders places correctly', () => {
    const places = [/* mock data */];
    render(<PlacesTable places={places} onSelectPlace={jest.fn()} />);
    
    expect(screen.getByText(places[0].name)).toBeInTheDocument();
  });
});
```

### 8.3 Integration Tests

**Context Integration**:
```typescript
describe('AppContext', () => {
  it('updates note and persists to storage', () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider
    });
    
    act(() => {
      const noteId = result.current.addNote();
      result.current.updateNote(noteId, { title: 'Test' });
    });
    
    expect(result.current.notes[0].title).toBe('Test');
    expect(StorageService.getNotes()[0].title).toBe('Test');
  });
});
```

---

## 9. Security Considerations

### 9.1 Client-Side Security

**XSS Prevention**:
- React automatically escapes content
- Avoid `dangerouslySetInnerHTML`
- Sanitize user input before storage

**API Key Security**:
- Display keys with copy-to-clipboard
- Mask keys in UI (show first/last chars)
- Warn users about key security

**localStorage Security**:
- No sensitive data in localStorage
- Clear storage on logout (future feature)
- Implement data encryption (future enhancement)

### 9.2 Future Backend Security

**Authentication**:
- JWT tokens for API authentication
- Secure token storage (httpOnly cookies)
- Token refresh mechanism

**Authorization**:
- Role-based access control
- API key permissions and scopes
- Rate limiting per key

---

## 10. Deployment Strategy

### 10.1 Build Configuration

**Vite Build**:
```bash
npm run build
# Outputs to dist/
```

**Environment Variables**:
```env
VITE_API_BASE_URL=https://api.anyways.com
VITE_APP_VERSION=1.0.0
```

### 10.2 Hosting Options

**Recommended Platforms**:
- Vercel (optimized for Vite)
- Netlify (easy deployment)
- Cloudflare Pages (global CDN)

**Build Settings**:
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+

### 10.3 CI/CD Pipeline

**GitHub Actions Example**:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - uses: vercel/action@v1
```

---

## 11. Future Architecture Enhancements

### 11.1 Backend Integration

**API Layer**:
```typescript
// src/services/api.ts
class ApiService {
  static async getPlaces(): Promise<Place[]>
  static async getPlace(id: string): Promise<Place>
  static async updatePlace(id: string, data: Partial<Place>): Promise<Place>
  static async validatePlace(id: string): Promise<ValidationResult>
}
```

**WebSocket Integration**:
- Real-time place status updates
- Live validation signal streaming
- Collaborative features

### 11.2 State Management Evolution

**Consider Redux Toolkit** when:
- State becomes too complex for Context
- Need time-travel debugging
- Require middleware (logging, analytics)

**Consider React Query** for:
- Server state management
- Caching and synchronization
- Optimistic updates

### 11.3 Monitoring and Analytics

**Error Tracking**:
- Sentry integration
- Error boundaries
- User feedback collection

**Analytics**:
- Google Analytics / Mixpanel
- Feature usage tracking
- Performance monitoring

---

## 12. Development Workflow

### 12.1 Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

### 12.2 Code Style

**ESLint Configuration**:
- React hooks rules
- TypeScript strict mode
- Import order enforcement

**Naming Conventions**:
- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

### 12.3 Git Workflow

**Branch Strategy**:
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes

**Commit Messages**:
```
feat: add place validation signals
fix: correct confidence score calculation
docs: update API documentation
style: format code with prettier
refactor: extract storage service
test: add unit tests for cn utility
```

---

## 13. Accessibility

### 13.1 WCAG Compliance

**Target Level**: AA

**Key Requirements**:
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators
- ARIA labels where needed

### 13.2 Implementation

**Semantic HTML**:
```tsx
<nav aria-label="Main navigation">
  <button aria-label="Toggle sidebar">
    <Menu />
  </button>
</nav>
```

**Keyboard Support**:
- Tab navigation through interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for lists

**Screen Reader Support**:
- Alt text for images
- ARIA labels for icon buttons
- Live regions for dynamic content
- Skip links for navigation

---

## 14. Conclusion

This design document provides a comprehensive technical blueprint for the anyWays Place Intelligence platform. The architecture prioritizes:

- **Modularity**: Clear separation of concerns
- **Scalability**: Ready for backend integration
- **Maintainability**: Type-safe, well-tested code
- **Performance**: Optimized rendering and data handling
- **User Experience**: Responsive, accessible, intuitive interface

The current implementation serves as a solid foundation for future enhancements while delivering immediate value to developers building location-aware AI systems.
