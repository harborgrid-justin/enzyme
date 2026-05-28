import { Navigate, Route, Routes } from 'react-router-dom';
import { auth, monitoring, state } from '@missionfabric-js/enzyme';
import { useCmsStore } from '../store/cmsStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Dashboard } from './Dashboard';
import { ContentIndex } from './ContentIndex';
import { ContentDetail } from './ContentDetail';
import { Workflow } from './Workflow';
import { Audience } from './Audience';
import { Settings } from './Settings';
import { LoginScreen } from './LoginScreen';

function shellErrorFallback(
  error: { message: string },
  reset: () => void
): React.ReactElement {
  return (
    <div className="error-fallback">
      <p>
        <strong>Page crashed:</strong> {error.message}
      </p>
      <button type="button" onClick={reset} className="primary-button">
        Recover
      </button>
    </div>
  );
}

export function CmsShell(): React.ReactElement {
  const { isAuthenticated, isLoading } = auth.useAuth();

  // Sync the workspace + status filter + audit stream across browser tabs
  // (open this app twice to see the filter change live).
  state.useBroadcastSync(useCmsStore, {
    channelName: 'enterprise-cms-sync',
    syncKeys: ['statusFilter', 'activeWorkspace', 'auditEvents'],
    conflictStrategy: 'last-write-wins',
  });

  if (isLoading) {
    return (
      <div className="boot-screen">
        <p>Loading workspace…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <Topbar />
        <monitoring.ErrorBoundary fallback={shellErrorFallback}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/content" element={<ContentIndex />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/audience" element={<Audience />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </monitoring.ErrorBoundary>
      </main>
    </div>
  );
}
