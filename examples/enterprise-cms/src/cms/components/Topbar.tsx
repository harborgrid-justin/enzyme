import { Search } from 'lucide-react';
import { flags } from '@missionfabric-js/enzyme';
import { useCmsStore } from '../store/cmsStore';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Topbar(): React.ReactElement {
  const activeWorkspace = useCmsStore((s) => s.activeWorkspace);
  const advancedSearch = flags.useFeatureFlag(flags.flagKeys.ADVANCED_SEARCH);

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{activeWorkspace}</div>
        <h1>Composable publishing operations</h1>
      </div>
      <div className="topbar-actions">
        <div className={`search-box ${advancedSearch ? 'advanced' : ''}`} aria-hidden="true">
          <Search size={16} />
          <span>{advancedSearch ? 'Search content, tags, authors…' : 'Search'}</span>
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
