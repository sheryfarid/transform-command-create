import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Region, Role } from '../types/domain';
import { REGIONS, ROLES } from '../features/reference';
import { allCandidates } from '../features/inventory';
import { useProgrammeStore } from '../stores/programmeStore';
import { Button } from '../components/ui';

export const NAV = [
  { path: '/dashboard', label: 'Executive dashboard' },
  { path: '/landscapes', label: 'ERP inventory' },
  { path: '/documents', label: 'Evidence library' },
  { path: '/discovery', label: 'Discovery' },
  { path: '/strategy', label: 'AI strategy consultant' },
  { path: '/strategy/scenarios', label: 'Scenarios' },
  { path: '/governance', label: 'Governance' },
  { path: '/flow', label: 'Software flow' },
];

function useBadges(): Record<string, number> {
  const docs = useProgrammeStore((s) => s.docs);
  const questions = useProgrammeStore((s) => s.questions);
  const recs = useProgrammeStore((s) => s.recs);
  const decisions = useProgrammeStore((s) => s.decisions);
  return {
    '/documents': allCandidates({ docs }).filter((c) => c.state === 'pending').length,
    '/discovery': questions.filter((q) => q.status === 'open').length,
    '/strategy': recs.filter((r) => r.status === 'draft').length,
    '/governance': decisions.filter((d) => d.status === 'pending').length,
  };
}

export function AppShell() {
  const { programme, role, region, setRole, setRegion, reset } = useProgrammeStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const badges = useBadges();
  const current = [...NAV].sort((a, b) => b.path.length - a.path.length).find((n) => pathname.startsWith(n.path)) ?? NAV[0];

  const onReset = () => {
    if (!window.confirm('Reset the demonstration programme? All records on this device will be removed.')) return;
    reset();
    navigate('/programmes/new');
  };

  return (
    <div className="app">
      <aside className="nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Transformation<br />Command Centre</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.path} to={n.path} end={n.path === '/strategy'} className={({ isActive }) => (isActive ? 'on' : '')}>
              <span>{n.label}</span>
              {badges[n.path] ? <em>{badges[n.path]}</em> : null}
            </NavLink>
          ))}
        </nav>
        <p className="nav-foot">Fictional demonstration. Values come from records you create here.</p>
      </aside>
      <main>
        <header className="topbar">
          <div className="crumbs">
            <span className="fine">{programme?.name}</span>
            <h1 className="display">{current.label}</h1>
          </div>
          <div className="controls">
            <label>Region
              <select value={region} onChange={(e) => setRegion(e.target.value as Region | 'All')}>
                <option>All</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Acting as
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <Button small onClick={onReset}>Reset demo</Button>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
