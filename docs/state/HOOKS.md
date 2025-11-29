# State Hooks Reference

> React hooks for accessing and manipulating state

## Overview

The state module provides a comprehensive set of React hooks for accessing state with optimal performance:

- **Core hooks** - Basic state selection with custom equality
- **Slice hooks** - Typed hooks for each slice (UI, Session, Settings)
- **Convenience hooks** - Combined state + actions for common use cases
- **Advanced hooks** - Subscriptions, debouncing, state tracking
- **Hydration hooks** - Wait for persistence to load

## Core Hooks

### useStoreState

Select state with custom equality function (default: Object.is).

```typescript
import { useStoreState } from '@missionfabric-js/enzyme';

function MyComponent() {
  const locale = useStoreState((state) => state.locale);

  return <div>Locale: {locale}</div>;
}
```

**Type Signature:**

```typescript
function useStoreState<T>(
  selector: (state: StoreState) => T
): T
```

### useShallowState

Select state with shallow equality (recommended for objects/arrays).

```typescript
import { useShallowState } from '@missionfabric-js/enzyme';

function SettingsPanel() {
  // Shallow comparison - stable reference when properties don't change
  const settings = useShallowState((state) => ({
    locale: state.locale,
    timezone: state.timezone,
    theme: state.theme,
  }));

  return (
    <div>
      <p>Locale: {settings.locale}</p>
      <p>Timezone: {settings.timezone}</p>
      <p>Theme: {settings.theme}</p>
    </div>
  );
}
```

**When to use:**

- Selecting multiple primitive values as an object
- Selecting arrays
- Preventing unnecessary re-renders from new object references

### useStoreAction

Select an action (stable reference, never causes rerender).

```typescript
import { useStoreAction } from '@missionfabric-js/enzyme';

function ThemeToggle() {
  const setTheme = useStoreAction((state) => state.setTheme);

  return (
    <button onClick={() => setTheme('dark')}>
      Switch to Dark Mode
    </button>
  );
}
```

**Benefits:**

- Action functions have stable references
- Component won't re-render when other state changes
- Safe to use in `useEffect` dependencies

## Slice Hooks

### UI Slice Hooks

#### useUIState

Get UI state with shallow comparison.

```typescript
import { useUIState } from '@missionfabric-js/enzyme';

function Header() {
  const {
    sidebarOpen,
    sidebarCollapsed,
    activeModal,
    modalData,
    globalLoading,
    loadingMessage,
  } = useUIState();

  return (
    <header>
      {globalLoading && <Spinner message={loadingMessage} />}
      {activeModal && <Modal id={activeModal} data={modalData} />}
    </header>
  );
}
```

**Returns:**

```typescript
{
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  globalLoading: boolean;
  loadingMessage: string | null;
}
```

#### useUIActions

Get UI actions with stable references.

```typescript
import { useUIActions } from '@missionfabric-js/enzyme';

function Navigation() {
  const {
    toggleSidebar,
    setSidebarOpen,
    setSidebarCollapsed,
    openModal,
    closeModal,
    setGlobalLoading,
  } = useUIActions();

  return (
    <nav>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      <button onClick={() => openModal('settings')}>Settings</button>
      <button onClick={() => setGlobalLoading(true, 'Loading...')}>
        Load Data
      </button>
    </nav>
  );
}
```

**Returns:**

```typescript
{
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}
```

### Session Slice Hooks

#### useSessionState

Get session state with shallow comparison.

```typescript
import { useSessionState } from '@missionfabric-js/enzyme';

function SessionInfo() {
  const {
    sessionId,
    isSessionActive,
    lastActivity,
    navigationHistory,
  } = useSessionState();

  return (
    <div>
      <p>Session: {sessionId || 'None'}</p>
      <p>Active: {isSessionActive ? 'Yes' : 'No'}</p>
      <p>History: {navigationHistory.length} pages</p>
    </div>
  );
}
```

**Returns:**

```typescript
{
  sessionId: string | null;
  isSessionActive: boolean;
  lastActivity: number | null;
  navigationHistory: string[];
}
```

#### useSessionActions

Get session actions with stable references.

```typescript
import { useSessionActions } from '@missionfabric-js/enzyme';

function SessionManager() {
  const {
    initSession,
    updateActivity,
    endSession,
    addToHistory,
    clearHistory,
  } = useSessionActions();

  const handleLogin = async () => {
    const sessionId = await api.login();
    initSession(sessionId, { expiresInMs: 3600000 }); // 1 hour
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={endSession}>Logout</button>
    </div>
  );
}
```

**Returns:**

```typescript
{
  initSession: (sessionId: string, options?: { expiresInMs?: number; deviceId?: string }) => void;
  updateActivity: () => void;
  endSession: () => void;
  addToHistory: (path: string) => void;
  clearHistory: () => void;
}
```

### Settings Slice Hooks

#### useSettingsState

Get settings state with shallow comparison.

```typescript
import { useSettingsState } from '@missionfabric-js/enzyme';

function SettingsDisplay() {
  const {
    locale,
    timezone,
    dateFormat,
    timeFormat,
    numberFormat,
    notificationsEnabled,
    soundEnabled,
    desktopNotifications,
    reducedMotion,
    highContrast,
    fontSize,
  } = useSettingsState();

  return (
    <dl>
      <dt>Locale</dt>
      <dd>{locale}</dd>
      <dt>Timezone</dt>
      <dd>{timezone}</dd>
      <dt>Theme</dt>
      <dd>{theme}</dd>
    </dl>
  );
}
```

#### useSettingsActions

Get settings actions with stable references.

```typescript
import { useSettingsActions } from '@missionfabric-js/enzyme';

function SettingsForm() {
  const {
    setLocale,
    setTimezone,
    setDateFormat,
    setTimeFormat,
    setNotificationsEnabled,
    setSoundEnabled,
    setDesktopNotifications,
    setReducedMotion,
    setHighContrast,
    setFontSize,
    resetSettings,
  } = useSettingsActions();

  return (
    <form>
      <select onChange={(e) => setLocale(e.target.value)}>
        <option value="en-US">English (US)</option>
        <option value="fr-FR">Français</option>
        <option value="es-ES">Español</option>
      </select>

      <button type="button" onClick={resetSettings}>
        Reset to Defaults
      </button>
    </form>
  );
}
```

## Convenience Hooks

### useSidebar

Combined sidebar state and actions in a single hook.

```typescript
import { useSidebar } from '@missionfabric-js/enzyme';

function SidebarToggle() {
  const { isOpen, isCollapsed, toggle, setOpen, setCollapsed } = useSidebar();

  return (
    <div>
      <button onClick={toggle}>
        {isOpen ? 'Close' : 'Open'} Sidebar
      </button>
      {isOpen && (
        <button onClick={() => setCollapsed(!isCollapsed)}>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      )}
    </div>
  );
}
```

**Returns:**

```typescript
{
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}
```

### useModal

Combined modal state and actions.

```typescript
import { useModal } from '@missionfabric-js/enzyme';

function App() {
  const { activeModal, data, isOpen, open, close } = useModal();

  return (
    <div>
      <button onClick={() => open('settings', { tab: 'general' })}>
        Open Settings
      </button>

      {isOpen && (
        <Modal id={activeModal} data={data} onClose={close} />
      )}
    </div>
  );
}
```

**With TypeScript:**

```typescript
interface SettingsModalData {
  tab: 'general' | 'privacy' | 'notifications';
}

function SettingsButton() {
  const { open } = useModal<SettingsModalData>();

  return (
    <button onClick={() => open('settings', { tab: 'general' })}>
      Settings
    </button>
  );
}
```

**Returns:**

```typescript
{
  activeModal: string | null;
  data: T | null; // T = generic type
  isOpen: boolean;
  open: (id: string, data?: Record<string, unknown>) => void;
  close: () => void;
}
```

### useIsModalOpen

Check if a specific modal is open.

```typescript
import { useIsModalOpen } from '@missionfabric-js/enzyme';

function SettingsModal() {
  const isOpen = useIsModalOpen('settings');

  if (!isOpen) return null;

  return <div>Settings Modal Content</div>;
}
```

**Type Signature:**

```typescript
function useIsModalOpen(modalId: string): boolean
```

### useLoading

Combined loading state and actions.

```typescript
import { useLoading } from '@missionfabric-js/enzyme';

function DataLoader() {
  const { isLoading, message, start, stop } = useLoading();

  const fetchData = async () => {
    start('Loading data...');
    try {
      await api.fetchData();
    } finally {
      stop();
    }
  };

  return (
    <div>
      {isLoading && <Spinner message={message} />}
      <button onClick={fetchData} disabled={isLoading}>
        Load Data
      </button>
    </div>
  );
}
```

**Returns:**

```typescript
{
  isLoading: boolean;
  message: string | null;
  start: (message?: string) => void;
  stop: () => void;
}
```

### useDisplaySettings

Get display settings in a memoized object.

```typescript
import { useDisplaySettings } from '@missionfabric-js/enzyme';

function DateFormatter({ date }: { date: Date }) {
  const { locale, timezone, dateFormat, timeFormat, numberFormat } = useDisplaySettings();

  const formattedDate = formatDate(date, {
    locale,
    timezone,
    pattern: dateFormat,
  });

  return <time>{formattedDate}</time>;
}
```

**Returns:**

```typescript
{
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
}
```

### useAccessibilitySettings

Get accessibility settings in a memoized object.

```typescript
import { useAccessibilitySettings } from '@missionfabric-js/enzyme';

function AnimatedComponent() {
  const { reducedMotion, highContrast, fontSize } = useAccessibilitySettings();

  return (
    <div
      className={cn({
        'reduce-motion': reducedMotion,
        'high-contrast': highContrast,
        [`font-${fontSize}`]: true,
      })}
    >
      Content
    </div>
  );
}
```

**Returns:**

```typescript
{
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: string;
}
```

### useNotificationSettings

Get notification settings in a memoized object.

```typescript
import { useNotificationSettings } from '@missionfabric-js/enzyme';

function NotificationManager() {
  const {
    notificationsEnabled,
    soundEnabled,
    desktopNotifications,
  } = useNotificationSettings();

  const showNotification = (message: string) => {
    if (!notificationsEnabled) return;

    if (soundEnabled) playSound();

    if (desktopNotifications) {
      new Notification(message);
    }
  };

  return <button onClick={() => showNotification('Hello!')}>Notify</button>;
}
```

**Returns:**

```typescript
{
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}
```

## Advanced Hooks

### useStoreSubscription

Subscribe to store changes with callback (for side effects).

```typescript
import { useStoreSubscription } from '@missionfabric-js/enzyme';

function LocaleSyncComponent() {
  useStoreSubscription(
    (state) => state.locale,
    (newLocale, oldLocale) => {
      console.log(`Locale changed: ${oldLocale} -> ${newLocale}`);

      // Sync to backend
      api.updateUserLocale(newLocale);
    },
    { fireImmediately: true }
  );

  return null;
}
```

**Type Signature:**

```typescript
function useStoreSubscription<T>(
  selector: (state: StoreState) => T,
  callback: (value: T, prevValue: T) => void,
  options?: { fireImmediately?: boolean }
): void
```

**Options:**

- `fireImmediately` - Call callback immediately with current value (default: false)

### useDebouncedState

Get debounced version of a state value.

```typescript
import { useDebouncedState } from '@missionfabric-js/enzyme';

function SearchComponent() {
  const searchQuery = useStore((s) => s.searchQuery);
  const debouncedQuery = useDebouncedState(
    (s) => s.searchQuery,
    300
  );

  // searchQuery updates immediately
  // debouncedQuery updates after 300ms of no changes

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={searchQuery} onChange={handleChange} />;
}
```

**Type Signature:**

```typescript
function useDebouncedState<T>(
  selector: (state: StoreState) => T,
  delay?: number
): T
```

**Use Cases:**

- Search inputs
- Auto-save
- API calls triggered by state changes

### usePreviousState

Get the previous value of a state selector.

```typescript
import { usePreviousState } from '@missionfabric-js/enzyme';

function CounterDiff() {
  const count = useStore((s) => s.count);
  const prevCount = usePreviousState((s) => s.count);

  const diff = prevCount !== undefined ? count - prevCount : 0;

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount ?? 'N/A'}</p>
      <p>Diff: {diff}</p>
    </div>
  );
}
```

**Type Signature:**

```typescript
function usePreviousState<T>(
  selector: (state: StoreState) => T
): T | undefined
```

### useStateChange

Track if value has changed since component mounted.

```typescript
import { useStateChange } from '@missionfabric-js/enzyme';

function ChangeTracker() {
  const { value, initialValue, hasChanged, changeCount } = useStateChange(
    (s) => s.count
  );

  return (
    <div>
      <p>Current: {value}</p>
      <p>Initial: {initialValue}</p>
      <p>Changed: {hasChanged ? 'Yes' : 'No'}</p>
      <p>Change Count: {changeCount}</p>
    </div>
  );
}
```

**Returns:**

```typescript
{
  value: T; // Current value
  initialValue: T; // Value when component mounted
  hasChanged: boolean; // Has value changed from initial
  changeCount: number; // Number of times value has changed
}
```

## Hydration Hook

### useHydration

Wait for store hydration before rendering.

```typescript
import { useHydration } from '@missionfabric-js/enzyme';

function App() {
  const { hasHydrated, isHydrating } = useHydration();

  if (isHydrating) {
    return (
      <div className="loading-screen">
        <Spinner />
        <p>Loading preferences...</p>
      </div>
    );
  }

  return <MainApp />;
}
```

**Returns:**

```typescript
{
  hasHydrated: boolean; // Has persistence loaded
  isHydrating: boolean; // Currently loading from persistence
}
```

**SSR Compatible:**

The hook checks if hydration has already occurred, making it safe for server-side rendering.

## Session Time Hooks

These hooks properly handle time-based calculations that update over time.

### useSessionDuration

Get the current session duration (updates every second).

```typescript
import { useSessionDuration } from '@missionfabric-js/enzyme';

function SessionTimer() {
  const duration = useSessionDuration();

  if (duration === null) {
    return <p>No active session</p>;
  }

  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return <p>Session: {minutes}m {seconds}s</p>;
}
```

**Options:**

```typescript
interface SessionTimeOptions {
  updateInterval?: number; // Update interval in ms (default: 1000)
  enableUpdates?: boolean; // Enable automatic updates (default: true)
}

const duration = useSessionDuration({ updateInterval: 500 });
```

### useTimeUntilExpiry

Get time until session expires (updates every second).

```typescript
import { useTimeUntilExpiry } from '@missionfabric-js/enzyme';

function ExpiryWarning() {
  const timeUntilExpiry = useTimeUntilExpiry();

  if (timeUntilExpiry === null) {
    return null; // No expiry set
  }

  if (timeUntilExpiry < 60000) {
    return (
      <Alert severity="warning">
        Session expires in less than a minute!
      </Alert>
    );
  }

  const minutes = Math.floor(timeUntilExpiry / 60000);
  return <p>Session expires in {minutes} minutes</p>;
}
```

### useIsSessionExpired

Check if session is expired (updates every second).

```typescript
import { useIsSessionExpired } from '@missionfabric-js/enzyme';
import { Navigate } from 'react-router-dom';

function SessionGuard({ children }) {
  const isExpired = useIsSessionExpired();

  if (isExpired) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

### useSessionTimeInfo

Get all session time information in a single hook.

```typescript
import { useSessionTimeInfo } from '@missionfabric-js/enzyme';

function SessionStatus() {
  const {
    duration,
    timeUntilExpiry,
    isExpired,
    formattedDuration,
    formattedTimeUntilExpiry,
  } = useSessionTimeInfo();

  if (isExpired) {
    return <p>Session expired</p>;
  }

  return (
    <div>
      <p>Active: {formattedDuration}</p>
      {formattedTimeUntilExpiry && (
        <p>Expires in: {formattedTimeUntilExpiry}</p>
      )}
    </div>
  );
}
```

**Returns:**

```typescript
{
  duration: number | null; // Duration in ms
  timeUntilExpiry: number | null; // Time until expiry in ms
  isExpired: boolean; // Is session expired
  formattedDuration: string | null; // Formatted string (e.g., "5m 30s")
  formattedTimeUntilExpiry: string | null; // Formatted string
}
```

## Performance Tips

### 1. Select Only What You Need

```typescript
// ❌ Bad - Subscribes to entire state
const state = useStore((s) => s);

// ✅ Good - Subscribes to single value
const locale = useStore((s) => s.locale);
```

### 2. Use Convenience Hooks

```typescript
// ❌ Bad - Multiple subscriptions
const isOpen = useStore((s) => s.sidebarOpen);
const toggle = useStore((s) => s.toggleSidebar);

// ✅ Good - Single subscription
const { isOpen, toggle } = useSidebar();
```

### 3. Use Memoized Selectors

```typescript
// ❌ Bad - Creates new object on every render
const settings = useStore((s) => ({
  locale: s.locale,
  timezone: s.timezone,
}));

// ✅ Good - Uses memoized selector
import { selectDisplaySettings } from '@missionfabric-js/enzyme';
const settings = useStore(selectDisplaySettings);
```

### 4. Avoid Inline Functions in Selectors

```typescript
// ❌ Bad - Creates new function on every render
const users = useStore((s) => s.users.filter(u => u.active));

// ✅ Good - Use parameterized selector
import { selectActiveUsers } from './selectors';
const users = useStore(selectActiveUsers);
```

## Related Documentation

- [Selectors](./SELECTORS.md) - Memoized selector patterns
- [Slices](./SLICES.md) - Slice structure and actions
- [Stores](./STORES.md) - Store architecture
- [Types](./TYPES.md) - TypeScript type definitions
