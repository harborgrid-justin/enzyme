import { Navigate, Route, Routes } from 'react-router-dom';
import { auth, monitoring, state } from '@missionfabric-js/enzyme';
import { useInventoryStore } from '../store/inventoryStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Dashboard } from './Dashboard';
import { ItemIndex } from './ItemIndex';
import { ItemDetail } from './ItemDetail';
import { Operations } from './Operations';
import { Suppliers } from './Suppliers';
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

export function InventoryShell(): React.ReactElement {
  const { isAuthenticated, isLoading } = auth.useAuth();

  // Sync the workspace + filters + audit stream across browser tabs
  // (open this app twice to see the filters change live).
  state.useBroadcastSync(useInventoryStore, {
    channelName: 'enterprise-inventory-sync',
    syncKeys: ['statusFilter', 'warehouseFilter', 'activeWorkspace', 'auditEvents'],
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
            <Route path="/items" element={<ItemIndex />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </monitoring.ErrorBoundary>
      </main>
    </div>
  );
}
