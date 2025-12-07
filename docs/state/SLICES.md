# State Slices

> UI, Session, and Settings slice documentation

## Overview

The global store is composed of three main slices:

1. **UI Slice** - Sidebar, modals, loading, toasts, layout
2. **Session Slice** - Client-side session tracking, navigation history
3. **Settings Slice** - User preferences, locale, accessibility, feature flags

Each slice is created using `createSlice` for automatic action naming and DevTools integration.

## UI Slice

**File:** `/home/user/enzyme/src/lib/state/slices/uiSlice.ts`

The UI slice manages all UI-related state including sidebar, modals, loading states, and toasts.

### State

```typescript
interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Modal (with stack support for nested modals)
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  modalStack: ModalStackEntry[];

  // Loading
  globalLoading: boolean;
  loadingMessage: string | null;
  loadingProgress: number | null;

  // Toasts
  toasts: Toast[];

  // Layout
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  animationsEnabled: boolean;

  // Command Palette
  commandPaletteOpen: boolean;
}
```

### Types

```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ModalStackEntry {
  id: string;
  data: Record<string, unknown> | null;
}
```

### Sidebar Actions

#### toggleSidebar

Toggle sidebar open/closed state.

```typescript
function Navigation() {
  const toggle = useStore((s) => s.toggleSidebar);
  return <button onClick={toggle}>Toggle Sidebar</button>;
}
```

**DevTools Action:** `ui/toggleSidebar`

#### setSidebarOpen

Set sidebar open state explicitly.

```typescript
function Header() {
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  return (
    <button onClick={() => setSidebarOpen(false)}>
      Close Sidebar
    </button>
  );
}
```

**Parameters:**
- `open: boolean` - Whether sidebar should be open

**DevTools Action:** `ui/setSidebarOpen`

#### setSidebarCollapsed

Set sidebar collapsed state (narrow vs full width).

```typescript
function SidebarToggle() {
  const setCollapsed = useStore((s) => s.setSidebarCollapsed);

  return (
    <button onClick={() => setCollapsed(true)}>
      Collapse Sidebar
    </button>
  );
}
```

**Parameters:**
- `collapsed: boolean` - Whether sidebar should be collapsed

**DevTools Action:** `ui/setSidebarCollapsed`

### Modal Actions

The UI slice supports nested modals through a modal stack.

#### openModal

Open a modal by ID, optionally passing data. Supports nesting.

```typescript
function SettingsButton() {
  const openModal = useStore((s) => s.openModal);

  return (
    <button onClick={() => openModal('settings', { tab: 'general' })}>
      Open Settings
    </button>
  );
}
```

**Parameters:**
- `modalId: string` - Modal identifier
- `data?: Record<string, unknown>` - Data to pass to modal

**DevTools Action:** `ui/openModal`

**Nesting Behavior:**
- If a modal is already open, it's pushed to the stack
- New modal becomes active
- Closing returns to previous modal

#### closeModal

Close current modal, returning to previous in stack if nested.

```typescript
function ModalCloseButton() {
  const closeModal = useStore((s) => s.closeModal);

  return (
    <button onClick={closeModal}>
      Close
    </button>
  );
}
```

**DevTools Action:** `ui/closeModal`

#### closeAllModals

Close all modals and clear the modal stack.

```typescript
function App() {
  const closeAll = useStore((s) => s.closeAllModals);

  // Close all modals on route change
  useEffect(() => {
    closeAll();
  }, [location.pathname, closeAll]);

  return <Routes />;
}
```

**DevTools Action:** `ui/closeAllModals`

#### getModalData

Get data passed to current modal (typed).

```typescript
interface SettingsModalData {
  tab: 'general' | 'privacy' | 'notifications';
}

function SettingsModal() {
  const getModalData = useStore((s) => s.getModalData);
  const data = getModalData<SettingsModalData>();

  return (
    <Tabs initialTab={data?.tab || 'general'}>
      {/* ... */}
    </Tabs>
  );
}
```

**Returns:** `T | null` where T is the generic type parameter

### Loading Actions

#### setGlobalLoading

Set global loading state with optional message.

```typescript
function DataLoader() {
  const setLoading = useStore((s) => s.setGlobalLoading);

  const loadData = async () => {
    setLoading(true, 'Loading data...');
    try {
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={loadData}>Load</button>;
}
```

**Parameters:**
- `loading: boolean` - Loading state
- `message?: string` - Optional loading message

**DevTools Action:** `ui/setGlobalLoading`

**Behavior:**
- Sets `globalLoading` to the provided value
- Sets `loadingMessage` to the message (or null)
- Resets `loadingProgress` when loading ends

#### setLoadingProgress

Set loading progress (0-100) or null to hide progress.

```typescript
function FileUploader() {
  const setProgress = useStore((s) => s.setLoadingProgress);

  const upload = async (file: File) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        setProgress(progress);
      }
    };

    xhr.upload.onload = () => {
      setProgress(null);
    };
  };

  return <input type="file" onChange={(e) => upload(e.target.files[0])} />;
}
```

**Parameters:**
- `progress: number | null` - Progress percentage (0-100) or null

**DevTools Action:** `ui/setLoadingProgress`

### Toast Actions

#### addToast

Add a toast notification, returns the toast ID.

```typescript
function NotificationButton() {
  const addToast = useStore((s) => s.addToast);

  const notify = () => {
    const id = addToast({
      type: 'success',
      message: 'Operation completed successfully!',
      title: 'Success',
      duration: 5000,
      dismissible: true,
    });

    // Can use ID to remove toast later
    setTimeout(() => removeToast(id), 5000);
  };

  return <button onClick={notify}>Show Toast</button>;
}
```

**Parameters:**
- `toast: Omit<Toast, 'id'>` - Toast configuration (ID is auto-generated)

**Returns:** `string` - The generated toast ID

**DevTools Action:** `ui/addToast`

**Default Values:**
- `dismissible: true` (can be closed by user)

#### removeToast

Remove a specific toast by ID.

```typescript
function Toast({ id }: { id: string }) {
  const removeToast = useStore((s) => s.removeToast);

  return (
    <div className="toast">
      <button onClick={() => removeToast(id)}>×</button>
    </div>
  );
}
```

**Parameters:**
- `id: string` - Toast ID to remove

**DevTools Action:** `ui/removeToast`

#### clearToasts

Clear all toasts.

```typescript
function ClearButton() {
  const clearToasts = useStore((s) => s.clearToasts);

  return (
    <button onClick={clearToasts}>
      Clear All Notifications
    </button>
  );
}
```

**DevTools Action:** `ui/clearToasts`

### Layout Actions

#### setLayoutDensity

Set UI density (compact, comfortable, spacious).

```typescript
function DensitySelector() {
  const setDensity = useStore((s) => s.setLayoutDensity);

  return (
    <select onChange={(e) => setDensity(e.target.value as UIState['layoutDensity'])}>
      <option value="compact">Compact</option>
      <option value="comfortable">Comfortable</option>
      <option value="spacious">Spacious</option>
    </select>
  );
}
```

**Parameters:**
- `density: 'compact' | 'comfortable' | 'spacious'`

**DevTools Action:** `ui/setLayoutDensity`

#### setAnimationsEnabled

Enable or disable UI animations.

```typescript
function AnimationToggle() {
  const animationsEnabled = useStore((s) => s.animationsEnabled);
  const setAnimations = useStore((s) => s.setAnimationsEnabled);

  return (
    <label>
      <input
        type="checkbox"
        checked={animationsEnabled}
        onChange={(e) => setAnimations(e.target.checked)}
      />
      Enable Animations
    </label>
  );
}
```

**Parameters:**
- `enabled: boolean`

**DevTools Action:** `ui/setAnimationsEnabled`

### Command Palette Actions

#### toggleCommandPalette

Toggle command palette visibility.

```typescript
function App() {
  const toggle = useStore((s) => s.toggleCommandPalette);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return <div>{/* ... */}</div>;
}
```

**DevTools Action:** `ui/toggleCommandPalette`

#### setCommandPaletteOpen

Set command palette open state explicitly.

```typescript
function CommandPalette() {
  const isOpen = useStore((s) => s.commandPaletteOpen);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);

  if (!isOpen) return null;

  return (
    <Dialog onClose={() => setOpen(false)}>
      {/* Command palette content */}
    </Dialog>
  );
}
```

**Parameters:**
- `open: boolean`

**DevTools Action:** `ui/setCommandPaletteOpen`

## Session Slice

**File:** `/home/user/enzyme/src/lib/state/slices/sessionSlice.ts`

The session slice manages client-side session state, activity tracking, and navigation history.

**IMPORTANT:** This slice manages client-side session state only. Authentication tokens and sensitive credentials should NEVER be stored here. Use secure HTTP-only cookies or dedicated auth solutions for authentication.

### State

```typescript
interface SessionState {
  // Session identification
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionExpiresAt: number | null;

  // Activity tracking
  lastActivity: number | null;
  isSessionActive: boolean;
  activityTimeoutMs: number; // Default: 30 minutes

  // Navigation history
  navigationHistory: string[];
  maxHistoryLength: number; // Default: 50

  // Session metadata
  deviceId: string | null;
  browserTabId: string | null;
}
```

### Session Lifecycle Actions

#### initSession

Initialize a new session with ID and optional configuration.

```typescript
function LoginHandler() {
  const initSession = useStore((s) => s.initSession);

  const handleLogin = async (credentials) => {
    const { sessionId, expiresIn } = await api.login(credentials);

    initSession(sessionId, {
      expiresInMs: expiresIn * 1000,
      deviceId: getDeviceId(),
    });
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

**Parameters:**
- `sessionId: string` - Session identifier
- `options?: { expiresInMs?: number; deviceId?: string }` - Optional configuration

**DevTools Action:** `session/initSession`

**Behavior:**
- Sets `sessionId`, `sessionStartedAt`, `lastActivity`
- Sets `isSessionActive` to true
- Optionally sets `sessionExpiresAt` and `deviceId`

#### updateActivity

Update last activity timestamp (call on user interaction).

```typescript
function App() {
  const updateActivity = useStore((s) => s.updateActivity);

  useEffect(() => {
    // Update activity on any user interaction
    const handler = () => updateActivity();

    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('scroll', handler);

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [updateActivity]);

  return <div>{/* ... */}</div>;
}
```

**DevTools Action:** `session/updateActivity`

#### endSession

End the current session and clear session data.

```typescript
function LogoutButton() {
  const endSession = useStore((s) => s.endSession);

  const handleLogout = async () => {
    await api.logout();
    endSession();
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

**DevTools Action:** `session/endSession`

**Behavior:**
- Clears session ID, timestamps, and activity
- Sets `isSessionActive` to false
- Clears navigation history
- Preserves `deviceId` and `browserTabId` for continuity

#### checkSessionExpiry

Check if session has expired (returns true if expired).

```typescript
function SessionGuard({ children }) {
  const checkExpiry = useStore((s) => s.checkSessionExpiry);

  useEffect(() => {
    const interval = setInterval(() => {
      if (checkExpiry()) {
        // Session expired, redirect to login
        navigate('/login');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkExpiry]);

  return children;
}
```

**Returns:** `boolean` - true if expired

**DevTools Action:** None (getter)

**Checks:**
- Hard expiry time (`sessionExpiresAt`)
- Inactivity timeout (`lastActivity + activityTimeoutMs`)

#### extendSession

Extend session expiry by additional milliseconds.

```typescript
function SessionExtender() {
  const extendSession = useStore((s) => s.extendSession);

  const extend = () => {
    // Extend by 30 minutes
    extendSession(30 * 60 * 1000);
  };

  return <button onClick={extend}>Extend Session</button>;
}
```

**Parameters:**
- `additionalMs: number` - Milliseconds to add to expiry

**DevTools Action:** `session/extendSession`

### Navigation History Actions

#### addToHistory

Add a path to navigation history (deduplicates consecutive entries).

```typescript
function Router() {
  const addToHistory = useStore((s) => s.addToHistory);
  const location = useLocation();

  useEffect(() => {
    addToHistory(location.pathname);
  }, [location.pathname, addToHistory]);

  return <Routes />;
}
```

**Parameters:**
- `path: string` - Path to add to history

**DevTools Action:** `session/addToHistory`

**Behavior:**
- Avoids duplicate consecutive entries
- Trims history if over `maxHistoryLength`

#### removeFromHistory

Remove last occurrence of a path from history.

```typescript
function HistoryManager() {
  const removeFromHistory = useStore((s) => s.removeFromHistory);

  const removePath = (path: string) => {
    removeFromHistory(path);
  };

  return <button onClick={() => removePath('/temp')}>Remove Temp</button>;
}
```

**Parameters:**
- `path: string` - Path to remove

**DevTools Action:** `session/removeFromHistory`

#### clearHistory

Clear all navigation history.

```typescript
function ClearHistoryButton() {
  const clearHistory = useStore((s) => s.clearHistory);

  return (
    <button onClick={clearHistory}>
      Clear History
    </button>
  );
}
```

**DevTools Action:** `session/clearHistory`

#### getLastVisitedPath

Get the last visited path or null if history is empty.

```typescript
function BackButton() {
  const getLastPath = useStore((s) => s.getLastVisitedPath);
  const lastPath = getLastPath();

  if (!lastPath) return null;

  return (
    <button onClick={() => navigate(lastPath)}>
      Back to {lastPath}
    </button>
  );
}
```

**Returns:** `string | null`

**DevTools Action:** None (getter)

#### goBack

Go back in history, returns the previous path or null.

```typescript
function BackNavigation() {
  const goBack = useStore((s) => s.goBack);
  const navigate = useNavigate();

  const handleBack = () => {
    const prevPath = goBack();
    if (prevPath) {
      navigate(prevPath);
    }
  };

  return <button onClick={handleBack}>Back</button>;
}
```

**Returns:** `string | null` - Previous path or null

**DevTools Action:** `session/goBack`

**Behavior:**
- Removes current page from history
- Returns previous page

### Configuration Actions

#### setActivityTimeout

Set activity timeout duration in milliseconds.

```typescript
function SessionSettings() {
  const setTimeout = useStore((s) => s.setActivityTimeout);

  return (
    <select onChange={(e) => setTimeout(Number(e.target.value))}>
      <option value={15 * 60 * 1000}>15 minutes</option>
      <option value={30 * 60 * 1000}>30 minutes</option>
      <option value={60 * 60 * 1000}>60 minutes</option>
    </select>
  );
}
```

**Parameters:**
- `timeoutMs: number` - Timeout in milliseconds

**DevTools Action:** `session/setActivityTimeout`

#### setMaxHistoryLength

Set maximum navigation history length.

```typescript
function HistorySettings() {
  const setMaxLength = useStore((s) => s.setMaxHistoryLength);

  return (
    <input
      type="number"
      onChange={(e) => setMaxLength(Number(e.target.value))}
    />
  );
}
```

**Parameters:**
- `length: number` - Maximum history entries

**DevTools Action:** `session/setMaxHistoryLength`

**Behavior:**
- Trims existing history if over new limit

#### setBrowserTabId

Set the browser tab identifier for cross-tab awareness.

```typescript
function App() {
  const setTabId = useStore((s) => s.setBrowserTabId);

  useEffect(() => {
    const tabId = generateTabId();
    setTabId(tabId);
  }, [setTabId]);

  return <div>{/* ... */}</div>;
}
```

**Parameters:**
- `tabId: string` - Tab identifier

**DevTools Action:** `session/setBrowserTabId`

## Settings Slice

**File:** `/home/user/enzyme/src/lib/state/slices/settingsSlice.ts`

The settings slice manages user preferences, locale, accessibility options, and feature flags.

### State

```typescript
interface SettingsState {
  // Locale & Timezone
  locale: string; // e.g., 'en-US'
  timezone: string; // IANA timezone

  // Display
  dateFormat: string; // e.g., 'MM/DD/YYYY'
  timeFormat: '12h' | '24h';
  numberFormat: string;
  theme: 'light' | 'dark' | 'system';

  // Notifications
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  keyboardShortcutsEnabled: boolean;

  // Feature Flags
  features: Record<string, boolean>;

  // Privacy
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
}
```

### Individual Setters

All settings have individual setter actions:

```typescript
setLocale(locale: string)
setTimezone(timezone: string)
setDateFormat(format: string)
setTimeFormat(format: '12h' | '24h')
setNumberFormat(format: string)
setTheme(theme: 'light' | 'dark' | 'system')
setNotificationsEnabled(enabled: boolean)
setSoundEnabled(enabled: boolean)
setDesktopNotifications(enabled: boolean)
setEmailNotifications(enabled: boolean)
setReducedMotion(enabled: boolean)
setHighContrast(enabled: boolean)
setFontSize(size: 'small' | 'medium' | 'large')
setKeyboardShortcutsEnabled(enabled: boolean)
setAnalyticsEnabled(enabled: boolean)
setCrashReportingEnabled(enabled: boolean)
```

**Example:**

```typescript
function LocaleSelector() {
  const setLocale = useStore((s) => s.setLocale);

  return (
    <select onChange={(e) => setLocale(e.target.value)}>
      <option value="en-US">English (US)</option>
      <option value="fr-FR">Français</option>
      <option value="es-ES">Español</option>
    </select>
  );
}
```

### Batch Update Actions

Update multiple settings in a single action:

#### updateSettings

Update multiple settings at once.

```typescript
function ImportSettings({ settings }) {
  const updateSettings = useStore((s) => s.updateSettings);

  const importSettings = () => {
    updateSettings({
      locale: settings.locale,
      timezone: settings.timezone,
      theme: settings.theme,
    });
  };

  return <button onClick={importSettings}>Import</button>;
}
```

**Parameters:**
- `settings: Partial<SettingsState>` - Settings to update

**DevTools Action:** `settings/updateSettings`

#### updateDisplaySettings

Update display-related settings as a batch.

```typescript
function DisplayPresets() {
  const updateDisplay = useStore((s) => s.updateDisplaySettings);

  const applyUSAPreset = () => {
    updateDisplay({
      locale: 'en-US',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: 'en-US',
    });
  };

  return <button onClick={applyUSAPreset}>USA Preset</button>;
}
```

**DevTools Action:** `settings/updateDisplaySettings`

#### updateAccessibilitySettings

Update accessibility settings as a batch.

```typescript
function AccessibilityPresets() {
  const updateA11y = useStore((s) => s.updateAccessibilitySettings);

  const applyHighVisibility = () => {
    updateA11y({
      reducedMotion: true,
      highContrast: true,
      fontSize: 'large',
    });
  };

  return <button onClick={applyHighVisibility}>High Visibility</button>;
}
```

**DevTools Action:** `settings/updateAccessibilitySettings`

#### updateNotificationSettings

Update notification settings as a batch.

```typescript
function NotificationPresets() {
  const updateNotifs = useStore((s) => s.updateNotificationSettings);

  const enableAll = () => {
    updateNotifs({
      notificationsEnabled: true,
      soundEnabled: true,
      desktopNotifications: true,
      emailNotifications: true,
    });
  };

  return <button onClick={enableAll}>Enable All</button>;
}
```

**DevTools Action:** `settings/updateNotificationSettings`

#### updatePrivacySettings

Update privacy settings as a batch.

```typescript
function PrivacyToggle() {
  const updatePrivacy = useStore((s) => s.updatePrivacySettings);

  const disableTracking = () => {
    updatePrivacy({
      analyticsEnabled: false,
      crashReportingEnabled: false,
    });
  };

  return <button onClick={disableTracking}>Disable Tracking</button>;
}
```

**DevTools Action:** `settings/updatePrivacySettings`

### Feature Flag Actions

#### setFeatureFlag

Set a single feature flag.

```typescript
function FeatureToggle({ flag }: { flag: string }) {
  const setFlag = useStore((s) => s.setFeatureFlag);

  return (
    <label>
      <input
        type="checkbox"
        onChange={(e) => setFlag(flag, e.target.checked)}
      />
      Enable {flag}
    </label>
  );
}
```

**Parameters:**
- `flag: string` - Feature flag name
- `enabled: boolean` - Whether feature is enabled

**DevTools Action:** `settings/setFeatureFlag`

#### setFeatureFlags

Set multiple feature flags (merges with existing).

```typescript
function FeatureFlagsImport({ flags }) {
  const setFlags = useStore((s) => s.setFeatureFlags);

  return (
    <button onClick={() => setFlags(flags)}>
      Import Flags
    </button>
  );
}
```

**Parameters:**
- `flags: Record<string, boolean>` - Feature flags to set

**DevTools Action:** `settings/setFeatureFlags`

#### syncFeatureFlags

Replace all feature flags from server sync.

```typescript
function FeatureFlagsSync() {
  const syncFlags = useStore((s) => s.syncFeatureFlags);

  const sync = async () => {
    const flags = await api.getFeatureFlags();
    syncFlags(flags);
  };

  return <button onClick={sync}>Sync Flags</button>;
}
```

**Parameters:**
- `flags: Record<string, boolean>` - New feature flags (replaces all)

**DevTools Action:** `settings/syncFeatureFlags`

#### isFeatureEnabled

Check if a feature flag is enabled.

```typescript
function FeatureGate({ flag, children }) {
  const isEnabled = useStore((s) => s.isFeatureEnabled(flag));

  if (!isEnabled) return null;

  return <>{children}</>;
}
```

**Parameters:**
- `flag: string` - Feature flag name

**Returns:** `boolean` - Whether feature is enabled (default: false)

**DevTools Action:** None (getter)

### Reset Actions

#### resetSettings

Reset all settings to defaults.

```typescript
function ResetAllButton() {
  const resetAll = useStore((s) => s.resetSettings);

  return (
    <button onClick={resetAll}>
      Reset All Settings
    </button>
  );
}
```

**DevTools Action:** `settings/resetSettings`

#### resetDisplaySettings

Reset display settings to defaults.

```typescript
function ResetDisplayButton() {
  const resetDisplay = useStore((s) => s.resetDisplaySettings);

  return (
    <button onClick={resetDisplay}>
      Reset Display Settings
    </button>
  );
}
```

**DevTools Action:** `settings/resetDisplaySettings`

#### resetAccessibilitySettings

Reset accessibility settings to defaults.

```typescript
function ResetA11yButton() {
  const resetA11y = useStore((s) => s.resetAccessibilitySettings);

  return (
    <button onClick={resetA11y}>
      Reset Accessibility
    </button>
  );
}
```

**DevTools Action:** `settings/resetAccessibilitySettings`

#### resetNotificationSettings

Reset notification settings to defaults.

```typescript
function ResetNotifsButton() {
  const resetNotifs = useStore((s) => s.resetNotificationSettings);

  return (
    <button onClick={resetNotifs}>
      Reset Notifications
    </button>
  );
}
```

**DevTools Action:** `settings/resetNotificationSettings`

### Default Values

The settings slice auto-detects system defaults:

- **Locale:** From `navigator.language` (default: 'en-US')
- **Timezone:** From `Intl.DateTimeFormat()` (default: 'UTC')
- **Reduced Motion:** From `prefers-reduced-motion` media query
- **Theme:** From `prefers-color-scheme` media query (default: 'system')

All defaults are SSR-safe (fallback to safe defaults if APIs unavailable).

## Related Documentation

### State Management
- [README.md](./README.md) - State management overview
- [CORE.md](./CORE.md) - Store and slice factories
- [STORES.md](./STORES.md) - Store patterns
- [SELECTORS.md](./SELECTORS.md) - Selector patterns
- [HOOKS.md](./HOOKS.md) - React hooks
- [SYNC.md](./SYNC.md) - Multi-tab synchronization
- [TYPES.md](./TYPES.md) - Type definitions

### Configuration & Features
- [Config System](../config/README.md) - Configuration architecture similar to slices
- [Config Hooks](../config/HOOKS.md) - Using config with state slices
- [Feature Flags](../flags/README.md) - Feature-gated slice functionality

### Routing & API
- [Routing Core](../routing/CORE.md) - Route-based slice patterns
- [Route Loaders](../routing/LOADERS.md) - Loading data into slices
- [API Client](../api/README.md) - API integration with slices

### Performance & Integration
- [Performance Guide](../PERFORMANCE.md) - Slice optimization
- [Architecture](../ARCHITECTURE.md) - System design patterns
- [Testing Guide](../TESTING.md) - Testing slices
