import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RadialGauge } from './RadialGauge';
import { ExecutiveRibbon } from './ExecutiveRibbon';
import { SourcingFilterBar } from './SourcingFilterBar';
import { EarlyWarningActionPanel } from './EarlyWarningActionPanel';
import { ModelGovernanceModal } from './ModelGovernanceModal';
import { ewdssCommodities, ewdssMarkets, modelGovernanceData, predictEwdss } from '../mocks/data';

describe('Executive EWDSS Components', () => {
  it('RadialGauge renders probability and risk tier labels accurately', () => {
    const { rerender } = render(<RadialGauge probability={74.2} />);
    expect(screen.getByText('74.2%')).toBeInTheDocument();
    expect(screen.getByText('High Risk Alert')).toBeInTheDocument();

    rerender(<RadialGauge probability={38.5} />);
    expect(screen.getByText('38.5%')).toBeInTheDocument();
    expect(screen.getByText('Moderate Risk')).toBeInTheDocument();

    rerender(<RadialGauge probability={11.4} />);
    expect(screen.getByText('11.4%')).toBeInTheDocument();
    expect(screen.getByText('Low Risk Regime')).toBeInTheDocument();
  });

  it('ExecutiveRibbon renders system title, 4 KPI cards, and diagnostics CTA', () => {
    const onOpenDiagnostics = vi.fn();
    render(
      <ExecutiveRibbon
        onOpenDiagnostics={onOpenDiagnostics}
        highRiskCount={3}
        marketVolatility="14.2%"
        modelPrecision="83.2%"
        recommendedAction="Lock Q4 Forward Contracts"
      />
    );

    expect(screen.getByText('Sri Lanka Food Price Intelligence & Early Warning System')).toBeInTheDocument();
    expect(screen.getByText('3 Commodities at Elevated Risk')).toBeInTheDocument();
    expect(screen.getByText('14.2%')).toBeInTheDocument();
    expect(screen.getByText('83.2% Precision')).toBeInTheDocument();
    expect(screen.getByText('Lock Q4 Forward Contracts')).toBeInTheDocument();

    const diagBtn = screen.getByRole('button', { name: /open model diagnostics modal/i });
    fireEvent.click(diagBtn);
    expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('SourcingFilterBar renders commodity and market selectors and triggers callbacks', () => {
    const onCommodityChange = vi.fn();
    const onMarketChange = vi.fn();
    const onEvaluate = vi.fn();

    render(
      <SourcingFilterBar
        commodities={ewdssCommodities}
        markets={ewdssMarkets}
        selectedCommodityId="tomatoes"
        selectedMarketId="pettah"
        onCommodityChange={onCommodityChange}
        onMarketChange={onMarketChange}
        onEvaluate={onEvaluate}
      />
    );

    // Commodity dropdown has Tomatoes option
    expect(screen.getByLabelText(/Commodity Basket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Market \/ District Corridor/i)).toBeInTheDocument();

    // Trigger evaluate
    const evalBtn = screen.getByRole('button', { name: /evaluate sourcing risk/i });
    fireEvent.click(evalBtn);
    expect(onEvaluate).toHaveBeenCalledTimes(1);
  });

  it('EarlyWarningActionPanel displays risk probability, price magnitude, warning flags, and prescriptive directives', () => {
    // High risk test (Tomatoes)
    const tomatoPrediction = predictEwdss({ commodity_id: 'tomatoes', market_id: 'pettah' });
    const { rerender } = render(<EarlyWarningActionPanel prediction={tomatoPrediction} />);

    expect(screen.getByText('HIGH RISK ALERT — Do not purchase on spot. Lock 3-6 month forward supplier contracts immediately or draw down central warehouse safety stock.')).toBeInTheDocument();
    expect(screen.getByText('Expected Movement Magnitude')).toBeInTheDocument();
    expect(screen.getByText('Preceding Month Volatility Spike Detected')).toBeInTheDocument();
    expect(screen.getByText('Hedging Policy')).toBeInTheDocument();
    expect(screen.getByText('3 - 6 Months Locked Bilateral')).toBeInTheDocument();

    // Low risk test (Rice White)
    const ricePrediction = predictEwdss({ commodity_id: 'rice_white', market_id: 'anuradhapura' });
    rerender(<EarlyWarningActionPanel prediction={ricePrediction} />);
    expect(screen.getByText('LOW RISK — Maintain standard spot-market replenishment.')).toBeInTheDocument();
    expect(screen.getByText('Standard Seasonal Fluctuation')).toBeInTheDocument();
    expect(screen.getByText('Standard Spot Replenishment')).toBeInTheDocument();
  });

  it('ModelGovernanceModal renders benchmarks, asymmetric loss matrix, and Gauss-Markov diagnostics', () => {
    const onClose = vi.fn();
    render(<ModelGovernanceModal isOpen={true} onClose={onClose} data={modelGovernanceData} />);

    expect(screen.getByText('Econometric Model Diagnostics & Rigor Audit')).toBeInTheDocument();
    expect(screen.getByText('83.2%')).toBeInTheDocument(); // Precision
    expect(screen.getByText('0.1454')).toBeInTheDocument(); // Brier score
    expect(screen.getByText('7.74%')).toBeInTheDocument(); // Baseline MAE
    expect(screen.getByText('11.45%')).toBeInTheDocument(); // Ridge MAE

    // Switch to Asymmetric Cost tab
    const asymTab = screen.getByRole('button', { name: /cost-asymmetric optimization/i });
    fireEvent.click(asymTab);
    expect(screen.getByText(/Cost of False Negative \(C_FN = 4.0x\)/i)).toBeInTheDocument();
    expect(screen.getByText(/30.5%/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
