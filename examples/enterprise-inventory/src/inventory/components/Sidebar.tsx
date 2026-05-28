import { NavLink, Link } from 'react-router-dom';
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Settings,
  Truck,
} from 'lucide-react';

const NAV: Array<{ to: string; icon: React.ReactNode; label: string; end?: boolean }> = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/items', icon: <PackageSearch size={18} />, label: 'Items' },
  { to: '/operations', icon: <ClipboardList size={18} />, label: 'Operations' },
  { to: '/suppliers', icon: <Truck size={18} />, label: 'Suppliers' },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
];

export function Sidebar(): React.ReactElement {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/">
        <Boxes size={24} />
        <span>Enzyme WMS</span>
      </Link>
      <nav className="nav-list">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="framework-card">
        <div className="eyebrow">Framework surface</div>
        <p>
          Wired to enzyme's auth/RBAC, api query layer, feature flags, theme, monitoring,
          performance, security (XSS-safe rendering), and broadcast-synced state.
        </p>
      </div>
    </aside>
  );
}
