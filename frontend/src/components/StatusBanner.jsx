// src/components/StatusBanner.jsx
// Renders appropriate state: loading, empty, error, mock warning

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="loading-state animate-fade-in">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon = '📊', title, description }) {
  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state__icon">{icon}</div>
      {title && <div className="empty-state__title">{title}</div>}
      {description && <div className="empty-state__desc">{description}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state animate-fade-in">
      <div className="error-state__icon">⚠️</div>
      <div>
        <div className="error-state__title">Something went wrong</div>
        <div className="error-state__msg">{message}</div>
        {onRetry && (
          <div className="error-state__actions">
            <button className="btn btn-secondary" onClick={onRetry}
                    style={{ marginTop: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-4)' }}>
              ↩ Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MockBanner() {
  return (
    <div className="mock-banner" role="alert">
      <span>⚠</span>
      <span>
        <strong>MOCK DATA</strong> — These values are not real predictions.
        Connect the R Plumber API and set <code>VITE_USE_MOCK=false</code> to use live data.
      </span>
    </div>
  );
}
