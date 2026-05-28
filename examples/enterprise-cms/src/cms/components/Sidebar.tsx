import { NavLink, Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

const NAV: Array<{ to: string; icon: React.ReactNode; label: string; end?: boolean }> = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/content', icon: <FileText size={18} />, label: 'Content' },
  { to: '/workflow', icon: <CheckCircle2 size={18} />, label: 'Workflow' },
  { to: '/audience', icon: <Users size={18} />, label: 'Audience' },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
];

export function Sidebar(): React.ReactElement {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/">
        <Sparkles size={24} />
        <span>Enzyme CMS</span>
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
