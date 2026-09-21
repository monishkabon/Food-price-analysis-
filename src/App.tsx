import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Overview } from './pages/Overview';
import { MarketExplorer } from './pages/MarketExplorer';
import { Forecast } from './pages/Forecast';
import { Scenarios } from './pages/Scenarios';
import { ModelInsights } from './pages/ModelInsights';
export function App(){return <Routes><Route element={<AppShell/>}><Route index element={<Navigate to="/overview" replace/>}/><Route path="overview" element={<Overview/>}/><Route path="market-explorer" element={<MarketExplorer/>}/><Route path="forecast" element={<Forecast/>}/><Route path="scenarios" element={<Scenarios/>}/><Route path="model-insights" element={<ModelInsights/>}/><Route path="*" element={<Navigate to="/overview" replace/>}/></Route></Routes>}
