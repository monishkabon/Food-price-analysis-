// src/App.jsx
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import ModelPerformance from './pages/ModelPerformance';

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',      icon: '📊' },
  { id: 'forecast',    label: 'Forecast',       icon: '⚡' },
  { id: 'performance', label: 'Model Quality',  icon: '🎯' },
];

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <Dashboard />;
      case 'forecast':    return <Forecast />;
      case 'performance': return <ModelPerformance />;
      default:            return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      {/* ─── Header ─────────────────────────────────── */}
      <header className="header">
        <div className="header__logo">
          <div className="header__logo-mark">🌾</div>
          <span className="header__brand">FoodPrice Analytics</span>
        </div>
        <span className="text-xs text-muted" style={{ marginLeft: 24 }}>
          Sri Lanka · IT3081 · 2026-DS-12
        </span>
        <div className="header__cutoff-badge">
          ⚠ Data cutoff: Sep 2025 — Historical prototype
        </div>
      </header>

      {/* ─── Sidebar ─────────────────────────────────── */}
      <nav className="sidebar">
        {PAGES.map(page => (
          <button
            key={page.id}
            id={`nav-${page.id}`}
            className={`nav-item ${activePage === page.id ? 'active' : ''}`}
            onClick={() => setActivePage(page.id)}
          >
            <span className="nav-item__icon">{page.icon}</span>
            {page.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 'var(--sp-6)' }}>
          <div className="text-xs text-muted" style={{ padding: '0 var(--sp-4)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--clr-text-secondary)' }}>
              Data source
            </div>
            WFP Food Prices<br />Sri Lanka (HDX)<br />2004–Sep 2025
          </div>
        </div>
      </nav>

      {/* ─── Main content ────────────────────────────── */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
