import type { RiskLevel } from '../types';
export function RiskBadge({level}:{level:RiskLevel}){ return <span className={`risk risk-${level.toLowerCase()}`}><span aria-hidden="true" />{level} risk</span>; }
