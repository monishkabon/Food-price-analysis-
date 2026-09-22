import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, BrainCircuit, ChevronLeft, Compass, Menu, Scale, Sparkles, X } from 'lucide-react';
import { backend, isLiveMode } from '../api/plumber';

const nav = [
  ['/overview', 'Overview', BarChart3],
  ['/market-explorer', 'Market Explorer', Compass],
  ['/forecast', isLiveMode ? 'Movement Forecast' : 'Price Forecast', Sparkles],
  ['/scenarios', 'Scenario Analysis', Scale],
  ['/model-insights', 'Model Insights', BrainCircuit],
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const health = useQuery({
    queryKey: ['backend', 'health'], queryFn: backend.health,
    refetchInterval: 60_000, enabled: isLiveMode,
  });
  const ready = health.data?.api_ready && health.data.status === 'ok';
  const serviceLabel = !isLiveMode ? 'Demo service' : health.isError ? 'Backend unavailable'
    : health.isPending ? 'Connecting to backend...' : ready ? 'Backend connected' : 'Backend not ready';
  const version = isLiveMode ? health.data?.model_version ?? 'Unavailable' : 'FPI-R 2.4.1';
  return <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
    <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity /></div><div><strong>MarketLens</strong><span>Food Intelligence</span></div><button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Primary navigation">{nav.filter(([to]) => !isLiveMode || to !== '/scenarios').map(([to, label, Icon]) =>
        <NavLink key={to} to={to} onClick={() => setOpen(false)} title={collapsed ? label : undefined}><Icon /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><button className="collapse" onClick={() => setCollapsed(value => !value)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><ChevronLeft /><span>Collapse</span></button><div className="model-chip"><span>Model</span><strong>{version}</strong></div></div>
    </aside>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <div className="main">
      <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="context"><span>Sri Lanka</span><strong>Food Price Intelligence</strong></div><div className="top-actions"><span className={`service ${isLiveMode && (!ready || health.isError) ? 'offline' : ''}`}><i />{serviceLabel}</span><span className="demo-badge">{isLiveMode ? 'Backend data' : 'Demo data'}</span><div className="avatar" aria-label="Procurement analyst">PA</div></div></header>
      <main><Outlet /></main>
      <footer>{isLiveMode ? 'Historical statistical estimates. Check model performance and observed dates when interpreting results.' : 'Decision-support forecasts based on statistical estimates. Verify market conditions before procurement decisions.'}<span>{isLiveMode ? `WFP data${health.data?.data_cutoff ? ` · cutoff ${health.data.data_cutoff}` : ''}` : 'Mock data mode'}</span></footer>
    </div>
  </div>;
}
