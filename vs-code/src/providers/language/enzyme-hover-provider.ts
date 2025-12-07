/**
 * Enzyme Hover Provider
 * Provides rich hover documentation for Enzyme APIs, hooks, and components
 */

import * as vscode from 'vscode';
import { logger } from '../../core/logger';

/**
 * Enzyme API documentation database
 */
const ENZYME_API_DOCS: Record<string, { description: string; signature?: string; example?: string; link?: string }> = {
  // Authentication Hooks
  'useAuth': {
    description: 'Hook to access authentication state and methods',
    signature: 'function useAuth(): AuthContextValue',
    example: `const { user, isAuthenticated, login, logout } = useAuth();

if (!isAuthenticated) {
  return <LoginForm onLogin={login} />;
}`,
    link: 'https://enzyme-framework.dev/docs/auth/use-auth'
  },
  'useHasRole': {
    description: 'Check if the current user has a specific role',
    signature: 'function useHasRole(role: string | string[]): boolean',
    example: `const isAdmin = useHasRole('admin');
const hasAccess = useHasRole(['admin', 'moderator']);`,
    link: 'https://enzyme-framework.dev/docs/auth/use-has-role'
  },
  'useHasPermission': {
    description: 'Check if the current user has specific permissions',
    signature: 'function useHasPermission(permission: string | string[]): boolean',
    example: `const canEdit = useHasPermission('user.edit');
const canManage = useHasPermission(['user.create', 'user.delete']);`,
    link: 'https://enzyme-framework.dev/docs/auth/use-has-permission'
  },

  // Feature Management
  'useFeatureVisibility': {
    description: 'Check if a feature is visible/enabled for the current user',
    signature: 'function useFeatureVisibility(featureId: string): boolean',
    example: `const showBetaFeature = useFeatureVisibility('beta-dashboard');

if (showBetaFeature) {
  return <BetaDashboard />;
}`,
    link: 'https://enzyme-framework.dev/docs/features/use-feature-visibility'
  },
  'useFeatureFlag': {
    description: 'Access feature flag values with type safety',
    signature: 'function useFeatureFlag<T>(flagKey: string, defaultValue: T): T',
    example: `const maxUploadSize = useFeatureFlag('max_upload_mb', 10);
const enableNewUI = useFeatureFlag('new_ui_enabled', false);`,
    link: 'https://enzyme-framework.dev/docs/features/use-feature-flag'
  },

  // API Hooks
  'useApiRequest': {
    description: 'Make API requests with automatic loading, error handling, and caching',
    signature: 'function useApiRequest<T>(request: ApiRequest): ApiRequestResult<T>',
    example: `const { data, loading, error, refetch } = useApiRequest<User>({
  endpoint: '/api/users/me',
  method: 'GET'
});

if (loading) return <Spinner />;
if (error) return <Error message={error.message} />;`,
    link: 'https://enzyme-framework.dev/docs/api/use-api-request'
  },
  'useApiMutation': {
    description: 'Perform API mutations (POST, PUT, PATCH, DELETE) with optimistic updates',
    signature: 'function useApiMutation<T, V>(config: MutationConfig<T, V>): MutationResult<T, V>',
    example: `const { mutate, loading, error } = useApiMutation({
  endpoint: '/api/users',
  method: 'POST',
  onSuccess: () => {
    showToast('User created successfully');
  }
});

const handleSubmit = (data) => {
  mutate(data);
};`,
    link: 'https://enzyme-framework.dev/docs/api/use-api-mutation'
  },

  // State Management
  'create': {
    description: 'Create a Zustand store with TypeScript support',
    signature: 'function create<T>(initializer: StateCreator<T>): UseBoundStore<T>',
    example: `interface StoreState {
  count: number;
  increment: () => void;
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));`,
    link: 'https://enzyme-framework.dev/docs/state/zustand'
  },

  // API Client
  'apiClient': {
    description: 'Global API client with interceptors and error handling',
    signature: 'const apiClient: ApiClient',
    example: `// GET request
const response = await apiClient.get<User[]>('/api/users');

// POST request
const newUser = await apiClient.post<User>('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With custom headers
const data = await apiClient.get('/api/protected', {
  headers: { 'Authorization': 'Bearer token' }
});`,
    link: 'https://enzyme-framework.dev/docs/api/api-client'
  },

  // Routing
  'useNavigate': {
    description: 'Navigate programmatically between routes',
    signature: 'function useNavigate(): NavigateFunction',
    example: `const navigate = useNavigate();

const handleClick = () => {
  navigate('/dashboard');
  // or with state
  navigate('/users/123', { state: { from: 'search' } });
};`,
    link: 'https://enzyme-framework.dev/docs/routing/use-navigate'
  },
  'useParams': {
    description: 'Access URL parameters from the current route',
    signature: 'function useParams<T = Record<string, string>>(): T',
    example: `const { userId } = useParams<{ userId: string }>();

// Use in data fetching
const { data } = useApiRequest<User>({
  endpoint: \`/api/users/\${userId}\`
});`,
    link: 'https://enzyme-framework.dev/docs/routing/use-params'
  },
  'useSearchParams': {
    description: 'Read and manipulate URL search parameters',
    signature: 'function useSearchParams(): [URLSearchParams, SetURLSearchParams]',
    example: `const [searchParams, setSearchParams] = useSearchParams();

const query = searchParams.get('q');
const page = Number(searchParams.get('page')) || 1;

// Update params
setSearchParams({ q: 'new search', page: '2' });`,
    link: 'https://enzyme-framework.dev/docs/routing/use-search-params'
  },

  // Performance
  'usePerformanceMonitor': {
    description: 'Monitor component performance and report metrics',
    signature: 'function usePerformanceMonitor(componentName: string, options?: MonitorOptions): void',
    example: `usePerformanceMonitor('UserDashboard', {
  threshold: 16, // warn if render > 16ms
  reportToAnalytics: true
});`,
    link: 'https://enzyme-framework.dev/docs/performance/use-performance-monitor'
  },

  // Theme
  'useTheme': {
    description: 'Access and toggle the current theme',
    signature: 'function useTheme(): ThemeContextValue',
    example: `const { theme, setTheme, toggleTheme } = useTheme();

return (
  <button onClick={toggleTheme}>
    {theme === 'dark' ? '🌙' : '☀️'}
  </button>
);`,
    link: 'https://enzyme-framework.dev/docs/theme/use-theme'
  }
};

/**
 * Enzyme Hover Provider
 * Provides documentation on hover for Enzyme APIs
 */
export class EnzymeHoverProvider implements vscode.HoverProvider {
  /**
   * Provide hover information
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    try {
      // Get the word at the current position
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return null;
      }

      const word = document.getText(wordRange);

      // Check if this is an Enzyme API
      const apiDoc = ENZYME_API_DOCS[word];
      if (!apiDoc) {
        return null;
      }

      // Build markdown documentation
      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;
      markdown.supportHtml = true;

      // Add signature
      if (apiDoc.signature) {
        markdown.appendCodeblock(apiDoc.signature, 'typescript');
      }

      // Add description
      markdown.appendMarkdown(`\n${apiDoc.description}\n`);

      // Add example
      if (apiDoc.example) {
        markdown.appendMarkdown('\n**Example:**\n');
        markdown.appendCodeblock(apiDoc.example, 'typescript');
      }

      // Add documentation link
      if (apiDoc.link) {
        markdown.appendMarkdown(`\n[📖 View Documentation](${apiDoc.link})\n`);
      }

      // Add Enzyme badge
      markdown.appendMarkdown('\n---\n*Enzyme Framework*');

      logger.debug(`Providing hover for: ${word}`);

      return new vscode.Hover(markdown, wordRange);
    } catch (error) {
      logger.error('Error providing hover information', error);
      return null;
    }
  }
}

/**
 * Register the Enzyme Hover Provider
 */
export function registerEnzymeHoverProvider(): vscode.Disposable {
  const selector: vscode.DocumentSelector = [
    { language: 'typescript', scheme: 'file' },
    { language: 'typescriptreact', scheme: 'file' }
  ];

  const provider = new EnzymeHoverProvider();
  return vscode.languages.registerHoverProvider(selector, provider);
}
