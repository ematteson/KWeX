# KWeX Frontend

React TypeScript frontend for the KWeX (Knowledge Worker Experience) survey tool.

## Overview

The frontend provides:
- **Survey Collection**: Anonymous survey interface for respondents
- **Survey Management**: Create, generate questions, activate, clone surveys
- **Team Dashboard**: Core 4 metrics visualization for team leads
- **Executive Dashboard**: Cross-team metrics comparison
- **Opportunities View**: RICE-scored improvement recommendations
- **System Status**: Admin panel for data management and sample data generation
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
src/frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts         # Axios HTTP client
│   │   ├── hooks.ts          # React Query hooks
│   │   └── types.ts          # TypeScript interfaces
│   ├── components/
│   │   ├── FrictionHeatmap.tsx   # Dimension breakdown
│   │   ├── Layout.tsx            # App shell with navigation
│   │   ├── LikertScale.tsx       # Survey response input
│   │   ├── MetricCard.tsx        # Individual metric display
│   │   ├── MetricsTrendChart.tsx # Historical trend lines
│   │   ├── OpportunityCard.tsx   # RICE opportunity display
│   │   ├── ProgressBar.tsx       # Completion indicator
│   │   ├── StatusModal.tsx       # System status & data management
│   │   ├── SurveyManagement.tsx  # Survey CRUD with clone support
│   │   ├── SurveyPreviewModal.tsx # Survey question preview
│   │   └── QuestionMappingModal.tsx # Question-to-metric mapping
│   ├── pages/
│   │   ├── ExecutiveDashboard.tsx  # Cross-team overview
│   │   ├── TeamDashboard.tsx       # Team metrics view
│   │   ├── TeamsPage.tsx           # Team list
│   │   ├── SurveyPage.tsx          # Survey response UI
│   │   ├── SurveyComplete.tsx      # Thank you page
│   │   └── OpportunitiesPage.tsx   # Opportunities list
│   ├── App.tsx               # Router configuration
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles (Tailwind)
├── index.html                # HTML entry point
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite build config
├── tailwind.config.js        # Tailwind CSS config
└── README.md                 # This file
```

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Navigate to frontend directory
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access

Open http://localhost:5173 in your browser.

**Note:** The backend server must be running at http://localhost:8000 for API calls to work.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run vitest tests |
| `npm run test:ui` | Run tests with UI |

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Layout | App shell (redirects to /teams) |
| `/executive` | ExecutiveDashboard | Cross-team metrics overview |
| `/teams` | TeamsPage | Team list and management |
| `/teams/:teamId` | TeamDashboard | Individual team Core 4 metrics |
| `/teams/:teamId/opportunities` | OpportunitiesPage | RICE-scored opportunities |
| `/survey/:token` | SurveyPage | Anonymous survey (no layout) |
| `/survey/complete` | SurveyComplete | Post-submission thank you |

## Components

### LikertScale

5-point scale input for survey questions.

```tsx
<LikertScale
  value={3}
  onChange={(value) => handleAnswer(questionId, value)}
  labels={['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']}
/>
```

### MetricCard

Displays a single Core 4 metric with trend indicator.

```tsx
<MetricCard
  title="Flow Score"
  value={72}
  trend="up"
  description="Value delivery throughput"
/>
```

### FrictionHeatmap

Visualizes friction scores across dimensions.

```tsx
<FrictionHeatmap
  data={{
    clarity: 65,
    tooling: 45,
    process: 58,
    rework: 72,
    delay: 51,
    safety: 78
  }}
/>
```

### MetricsTrendChart

Line chart showing metric history over survey cycles.

```tsx
<MetricsTrendChart
  data={metricsHistory}
  metrics={['flow', 'friction', 'safety', 'portfolio']}
/>
```

### OpportunityCard

Displays a RICE-scored improvement opportunity.

```tsx
<OpportunityCard
  opportunity={{
    title: "Reduce dependency wait times",
    friction_type: "DELAY",
    rice_score: 142,
    status: "IDENTIFIED"
  }}
/>
```

### ProgressBar

Shows survey completion progress.

```tsx
<ProgressBar current={5} total={15} />
```

## API Integration

### Client Configuration

The API client is configured in `src/api/client.ts`:

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### React Query Hooks

Data fetching is managed through React Query hooks in `src/api/hooks.ts`:

```typescript
// Example usage
const { data: metrics, isLoading } = useTeamMetrics(teamId);
const { data: opportunities } = useTeamOpportunities(teamId);
const { mutate: submitResponse } = useSubmitSurveyResponse();

// Survey management
const { mutate: cloneSurvey } = useCloneSurvey();
const { mutate: generateQuestions } = useGenerateQuestions();

// Admin/status
const { data: status } = useSystemStatus();
const { mutate: generateSampleData } = useGenerateSampleData();
const { mutate: resetAll } = useResetAll();
```

### Type Definitions

TypeScript interfaces in `src/api/types.ts` match backend schemas:

```typescript
interface MetricResult {
  flow_score: number;
  friction_score: number;
  safety_score: number;
  portfolio_balance_score: number;
  trend_direction: 'UP' | 'DOWN' | 'STABLE';
  meets_privacy_threshold: boolean;
}

interface Opportunity {
  id: number;
  title: string;
  description: string;
  friction_type: FrictionType;
  rice_score: number;
  status: OpportunityStatus;
}
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS for styling. Configure in `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
};
```

### Component Styling

Use Tailwind classes directly in components:

```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-semibold text-gray-900">
    {title}
  </h2>
</div>
```

## State Management

### React Query

Server state is managed with TanStack React Query:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
```

### Local State

Component state uses React hooks:

```typescript
const [currentQuestion, setCurrentQuestion] = useState(0);
const [answers, setAnswers] = useState<Record<number, number>>({});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# With UI
npm run test:ui
```

### Test Setup

Tests use Vitest with React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('MetricCard', () => {
  it('renders the metric value', () => {
    render(<MetricCard title="Flow" value={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
  });
});
```

## Building for Production

```bash
# Build
npm run build

# Output is in dist/

# Preview locally
npm run preview
```

### Environment Configuration

For production, configure the API URL via environment variables:

```bash
# .env.production
VITE_API_URL=https://api.kwex.example.com
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## Development Tips

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

### Adding a New Component

1. Create component in `src/components/`
2. Export from component file
3. Import and use in pages

### Adding API Hooks

1. Add types to `src/api/types.ts`
2. Create hook in `src/api/hooks.ts`
3. Use in components

## Troubleshooting

**CORS errors:**
Ensure the backend is running and CORS is configured. The backend allows all origins for MVP.

**Build errors:**
Clear the cache and reinstall:
```bash
rm -rf node_modules dist
npm install
npm run build
```

**TypeScript errors:**
Ensure types match backend schemas. Check `src/api/types.ts`.

## Related Documentation

- [Main Project README](../../README.md)
- [Backend README](../backend/README.md)
- [API Documentation](../../docs/API.md)
