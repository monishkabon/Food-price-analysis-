import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Overview } from './pages/Overview';
import { MarketExplorer } from './pages/MarketExplorer';
import { Forecast } from './pages/Forecast.tsx';
import { Scenarios } from './pages/Scenarios';
import { ModelInsights } from './pages/ModelInsights';
import { isLiveMode } from './api/plumber';
import { LiveOverview, LiveMarketExplorer } from './live/HistoryPages';
import { LiveForecast } from './live/Forecast';
import { LiveModelInsights } from './live/ModelInsights';
import { LiveScenarios } from './live/Scenarios';

export function App() {
  return <Routes><Route element={<AppShell />}>
    <Route index element={<Navigate to="/overview" replace />} />
    <Route path="overview" element={isLiveMode ? <LiveOverview /> : <Overview />} />
    <Route path="market-explorer" element={isLiveMode ? <LiveMarketExplorer /> : <MarketExplorer />} />
    <Route path="forecast" element={isLiveMode ? <LiveForecast /> : <Forecast />} />
    <Route path="scenarios" element={isLiveMode ? <LiveScenarios /> : <Scenarios />} />
    <Route path="model-insights" element={isLiveMode ? <LiveModelInsights /> : <ModelInsights />} />
    <Route path="*" element={<Navigate to="/overview" replace />} />
  </Route></Routes>;
}
