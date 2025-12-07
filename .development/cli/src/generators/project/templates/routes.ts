/**
 * Routes Template Generator
 *
 * Generates route files based on template type
 */

import type { TemplateContext } from '../utils';
import type { TemplateType } from '../index';

/**
 * Generates routes for the specified template
 */
export function generateRoutes(template: TemplateType, context: TemplateContext): Record<string, string> {
  switch (template) {
    case 'minimal':
      return generateMinimalRoutes(context);
    case 'standard':
      return generateStandardRoutes(context);
    case 'enterprise':
      return generateEnterpriseRoutes(context);
    case 'full':
      return generateFullRoutes(context);
    default:
      return generateMinimalRoutes(context);
  }
}

/**
 * Minimal template routes
 */
function generateMinimalRoutes(_context: TemplateContext): Record<string, string> {
  // Minimal template doesn't use routing, routes are handled in App.tsx
  return {};
}

/**
 * Standard template routes
 */
function generateStandardRoutes(context: TemplateContext): Record<string, string> {
  return {
    'src/routes/Home.tsx': `export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to ${context.projectName}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Built with Enzyme - Enterprise React Framework
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <FeatureCard
              title="File-System Routing"
              description="Type-safe routing with automatic code-splitting"
            />
            <FeatureCard
              title="State Management"
              description="Zustand + React Query for optimal performance"
            />
            <FeatureCard
              title="Theme System"
              description="Dark mode support out of the box"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}
`,
    'src/routes/About.tsx': `export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          About ${context.projectName}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This application is built with Enzyme, a modern enterprise React framework.
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Features
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Type-safe routing</li>
            <li>State management with Zustand</li>
            <li>Server state with React Query</li>
            <li>Dark mode support</li>
            <li>Performance monitoring</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
`,
  };
}

/**
 * Enterprise template routes
 */
function generateEnterpriseRoutes(context: TemplateContext): Record<string, string> {
  const routes: Record<string, string> = {
    ...generateStandardRoutes(context),
  };

  // Add auth routes
  if (context.hasAuth) {
    routes['src/routes/Login.tsx'] = `import { useState } from 'react';
import { useAuth } from '@missionfabric-js/enzyme/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;

    routes['src/routes/Dashboard.tsx'] = `import { useAuth, RequireAuth } from '@missionfabric-js/enzyme/auth';
import { useNavigate } from 'react-router-dom';

function DashboardContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <p className="text-gray-600 dark:text-gray-300">
            Welcome, {user?.email || 'User'}!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
`;
  }

  // Add monitoring demo
  if (context.hasMonitoring) {
    routes['src/routes/Monitoring.tsx'] = `import { usePerformanceObservatory } from '@missionfabric-js/enzyme/performance';

export default function Monitoring() {
  const { metrics } = usePerformanceObservatory();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Performance Monitoring
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard title="LCP" value={metrics?.lcp || 0} />
          <MetricCard title="FID" value={metrics?.fid || 0} />
          <MetricCard title="CLS" value={metrics?.cls || 0} />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
}

function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
        {value.toFixed(2)}
      </p>
    </div>
  );
}
`;
  }

  return routes;
}

/**
 * Full template routes
 */
function generateFullRoutes(context: TemplateContext): Record<string, string> {
  const routes = generateEnterpriseRoutes(context);

  // Add comprehensive demo routes
  routes['src/routes/Features.tsx'] = `export default function Features() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Enzyme Features
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureSection
            title="Routing"
            description="File-system based routing with automatic code-splitting and prefetching"
            features={[
              'Type-safe routes',
              'Lazy loading',
              'Prefetch on hover',
              'Query parameters',
            ]}
          />
          <FeatureSection
            title="State Management"
            description="Powerful state management with Zustand and React Query"
            features={[
              'Global state with Zustand',
              'Server state with React Query',
              'Optimistic updates',
              'Cache management',
            ]}
          />
          <FeatureSection
            title="Authentication"
            description="Built-in authentication and authorization"
            features={[
              'RBAC support',
              'Protected routes',
              'JWT tokens',
              'Session management',
            ]}
          />
          <FeatureSection
            title="Performance"
            description="Advanced performance monitoring and optimization"
            features={[
              'Core Web Vitals',
              'Performance budgets',
              'Render tracking',
              'Memory monitoring',
            ]}
          />
        </div>
      </div>
    </div>
  );
}

interface FeatureSectionProps {
  title: string;
  description: string;
  features: string[];
}

function FeatureSection({ title, description, features }: FeatureSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-700 dark:text-gray-200">
            <svg
              className="w-5 h-5 text-green-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

  return routes;
}
