import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, BrainCircuit, ChevronLeft, Compass, Menu, Scale, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
const nav=[['/overview','Overview',BarChart3],['/market-explorer','Market Explorer',Compass],['/forecast','Price Forecast',Sparkles],['/scenarios','Scenario Analysis',Scale],['/model-insights','Model Insights',BrainCircuit]] as const;
export function AppShell(){const [open,setOpen]=useState(false);const [collapsed,setCollapsed]=useState(false);const health=useQuery({queryKey:['health'],queryFn:api.health,refetchInterval:60_000});return <div className={`app ${collapsed?'is-collapsed':''}`}>
  <aside className={`sidebar ${open?'mobile-open':''}`}><div className="brand"><div className="brand-mark"><Activity/></div><div><strong>MarketLens</strong><span>Food Intelligence</span></div><button className="close-mobile" onClick={()=>setOpen(false)} aria-label="Close navigation"><X/></button></div>
    <nav aria-label="Primary navigation">{nav.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} title={collapsed?label:undefined}><Icon/><span>{label}</span></NavLink>)}</nav>
    <div className="sidebar-foot"><button className="collapse" onClick={()=>setCollapsed(v=>!v)} title={collapsed?'Expand sidebar':'Collapse sidebar'}><ChevronLeft/><span>Collapse</span></button><div className="model-chip"><span>Model</span><strong>FPI-R 2.4.1</strong></div></div>
  </aside>{open&&<button className="backdrop" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
  <div className="main"><header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu/></button><div className="context"><span>Sri Lanka</span><strong>Food Price Intelligence</strong></div><div className="top-actions"><span className={`service ${health.isError?'offline':''}`}><i/>{health.isError?'Service unavailable':'Data service online'}</span><span className="demo-badge">Demo data</span><div className="avatar" aria-label="Procurement analyst">PA</div></div></header>
    <main><Outlet/></main><footer>Decision-support forecasts based on statistical estimates. Verify market conditions before procurement decisions. <span>Mock data mode</span></footer></div>
  </div>}
