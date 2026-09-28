import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, BrainCircuit, ChevronLeft, Compass, Menu, Scale, ShieldAlert, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';

const nav = [
  ['/overview', 'Executive EWDSS', BarChart3],
  ['/market-explorer', 'Market Explorer', Compass],
  ['/forecast', 'Price Forecast', Sparkles],
  ['/scenarios', 'Scenario Analysis', Scale],
  ['/model-insights', 'Model Insights', BrainCircuit],
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 60_000 });

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldAlert size={20} />
          </div>
          <div>
            <strong>LankaFood EWDSS</strong>
            <span>Procurement Intelligence</span>
          </div>
          <button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X />
          </button>
        </div>

        <nav aria-label="Primary navigation">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button
            type="button"
            className="collapse"
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft />
            <span>Collapse sidebar</span>
          </button>
          <div className="model-chip">
            <span>Active Model</span>
            <strong>v1.0.0 (Sept 2025)</strong>
          </div>
        </div>
      </aside>

      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <div className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </button>
          <div className="context">
            <span>SRI LANKA RETAIL PROCUREMENT INTELLIGENCE</span>
            <strong>Commodity Early-Warning &amp; Decision Support System (EWDSS)</strong>
          </div>
          <div className="top-actions">
            <span className={`service ${health.isError ? 'offline' : ''}`}>
              <i />
              {health.isError ? 'API Offline' : 'API Status: Healthy'}
            </span>
            <span className="demo-badge">Data Cutoff: Sept 2025</span>
            <div className="avatar" aria-label="Procurement Director" title="Chief Procurement Officer">
              CPO
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        <footer>
          Executive Agricultural Commodity Procurement Early-Warning &amp; Decision Support System (EWDSS) · Validated against WFP / HDX series (Jan 2004 – Sept 2025) · Asymmetric Loss Matrix Optimized (C_FN = 4.0, C_FP = 1.0)
        </footer>
      </div>
    </div>
  );
}

