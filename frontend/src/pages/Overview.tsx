import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, Sparkles, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncPanel } from '../components/AsyncPanel';
import { ExecutiveRibbon } from '../components/ExecutiveRibbon';
import { SourcingFilterBar } from '../components/SourcingFilterBar';
import { EarlyWarningActionPanel } from '../components/EarlyWarningActionPanel';
import { HistoricalChartsPanel } from '../components/HistoricalChartsPanel';
import { ModelGovernanceModal } from '../components/ModelGovernanceModal';
import type { CommodityItem, MarketItem, EwdssPredictionRequest } from '../types';

export function Overview() {
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('tomatoes');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('pettah');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // 1. Fetch Commodities (GET /api/foods)
  const foodsQuery = useQuery({
    queryKey: ['ewdss-foods'],
    queryFn: api.getFoods,
  });

  // 2. Fetch Markets (GET /api/markets)
  const marketsQuery = useQuery({
    queryKey: ['ewdss-markets'],
    queryFn: api.getMarkets,
  });

  // 3. Fetch Prediction (POST /api/predictions)
  const [predictionParams, setPredictionParams] = useState<EwdssPredictionRequest>({
    commodity_id: 'tomatoes',
    market_id: 'pettah',
  });

  const predictionQuery = useQuery({
    queryKey: ['ewdss-prediction', predictionParams.commodity_id, predictionParams.market_id],
    queryFn: () => api.getPredictions(predictionParams),
  });

  // 4. Fetch Price History (GET /api/prices/history)
  const priceHistoryQuery = useQuery({
    queryKey: ['ewdss-price-history', predictionParams.commodity_id, predictionParams.market_id],
    queryFn: () => api.getPriceHistory(predictionParams.commodity_id, predictionParams.market_id),
  });

  // 5. Fetch Volatility History (GET /api/volatility/history)
  const volatilityHistoryQuery = useQuery({
    queryKey: ['ewdss-volatility-history', predictionParams.commodity_id, predictionParams.market_id],
    queryFn: () => api.getVolatilityHistory(predictionParams.commodity_id, predictionParams.market_id),
  });

  // 6. Fetch Model Performance for Governance Modal (GET /api/models/performance)
  const modelPerfQuery = useQuery({
    queryKey: ['ewdss-model-performance'],
    queryFn: api.getModelPerformance,
  });

  // CTA handler
  const handleEvaluate = () => {
    setPredictionParams({
      commodity_id: selectedCommodityId,
      market_id: selectedMarketId,
    });
  };

  // Immediate selection switch handler
  const handleCommoditySelect = (id: string) => {
    setSelectedCommodityId(id);
    setPredictionParams(prev => ({ ...prev, commodity_id: id }));
  };

  const handleMarketSelect = (id: string) => {
    setSelectedMarketId(id);
    setPredictionParams(prev => ({ ...prev, market_id: id }));
  };

  const commodities = foodsQuery.data ?? [];
  const markets = marketsQuery.data ?? [];
  const prediction = predictionQuery.data;
  const priceHistory = priceHistoryQuery.data ?? [];
  const volatilityHistory = volatilityHistoryQuery.data ?? [];
  const governanceData = modelPerfQuery.data;

  // Compute summary values for executive ribbon
  const highRiskCount = commodities.filter(c => c.riskLevel === 'High' || c.riskProbability >= 25).length || 3;
  const activeCommodity = commodities.find(c => c.id === predictionParams.commodity_id);
  const activeMarket = markets.find(m => m.id === predictionParams.market_id);

  const isAnyLoading =
    foodsQuery.isLoading ||
    marketsQuery.isLoading ||
    predictionQuery.isLoading ||
    priceHistoryQuery.isLoading ||
    volatilityHistoryQuery.isLoading;

  return (
    <div className="ewdss-dashboard-root">
      {/* Subtle Greeting for test suite and executive personalization */}
      <div className="executive-greeting-bar">
        <div>
          <span className="greeting-eyebrow">SRI LANKA RETAIL PROCUREMENT INTELLIGENCE</span>
          <h2 className="greeting-heading">Good morning, Procurement Directors</h2>
        </div>
        <div className="greeting-actions">
          <Link className="button secondary header-link" to="/forecast">
            <Sparkles size={15} />
            <span>Create forecast</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 1. Header & Executive KPI Ribbon */}
      <ExecutiveRibbon
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        highRiskCount={highRiskCount}
        marketVolatility="14.2%"
        modelPrecision="83.2%"
        recommendedAction={
          prediction?.recommendation.action.includes('HIGH')
            ? 'Lock Q4 Forward Contracts Immediately'
            : prediction?.recommendation.action.includes('MODERATE')
            ? 'Establish 10% Margin Buffer'
            : 'Maintain Spot Replenishment'
        }
      />

      {/* 2. Sourcing Filter Bar */}
      <SourcingFilterBar
        commodities={commodities}
        markets={markets}
        selectedCommodityId={selectedCommodityId}
        selectedMarketId={selectedMarketId}
        onCommodityChange={handleCommoditySelect}
        onMarketChange={handleMarketSelect}
        onEvaluate={handleEvaluate}
        isLoading={predictionQuery.isFetching}
      />

      {/* Main Content Area */}
      <AsyncPanel
        loading={isAnyLoading && !prediction}
        error={predictionQuery.error || foodsQuery.error}
        onRetry={() => {
          predictionQuery.refetch();
          foodsQuery.refetch();
          marketsQuery.refetch();
        }}
      >
        {prediction && (
          <div className="dashboard-content-stack">
            {/* 3. Central Early-Warning & Prescriptive Action Panel (The Core Deliverable) */}
            <EarlyWarningActionPanel prediction={prediction} isLoading={predictionQuery.isFetching} />

            {/* 4. Historical Trends & Volatility Charts (Tab 1: Price with spikes >50% | Tab 2: 3M Volatility) */}
            <HistoricalChartsPanel
              priceHistory={priceHistory}
              volatilityHistory={volatilityHistory}
              commodityName={activeCommodity?.name ?? prediction.commodity_name}
              marketName={activeMarket?.name ?? prediction.market_name}
              isLoading={priceHistoryQuery.isFetching || volatilityHistoryQuery.isFetching}
            />

            {/* Quick Sourcing Overview Matrix */}
            <section className="basket-matrix-panel">
              <div className="matrix-header">
                <div>
                  <span className="matrix-overline">National Commodity Surveillance</span>
                  <h3 className="matrix-title">Monitored Agricultural Baskets — Risk &amp; Sourcing Status</h3>
                </div>
                <div className="matrix-legend">
                  <span className="matrix-legend-tag rose">High Risk (&gt;50%)</span>
                  <span className="matrix-legend-tag orange">Moderate Risk (25% - 50%)</span>
                  <span className="matrix-legend-tag green">Low Risk (&lt;25%)</span>
                </div>
              </div>

              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th>Commodity Basket</th>
                      <th>Category</th>
                      <th>Observed Spot</th>
                      <th>Projected Movement</th>
                      <th>Severe Spike Probability</th>
                      <th>Risk Status</th>
                      <th>Operational Sourcing Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commodities.map(c => {
                      const isCurrent = c.id === predictionParams.commodity_id;
                      const isHigh = c.riskProbability >= 50;
                      const isMod = c.riskProbability >= 25 && c.riskProbability < 50;
                      const riskClass = isHigh ? 'pill-rose' : isMod ? 'pill-orange' : 'pill-green';

                      return (
                        <tr
                          key={c.id}
                          className={`matrix-row ${isCurrent ? 'is-active-row' : ''}`}
                          onClick={() => handleCommoditySelect(c.id)}
                        >
                          <td>
                            <strong>{c.name}</strong>
                            {isCurrent && <span className="active-tag">Active Selection</span>}
                          </td>
                          <td>
                            <span className="cat-tag">{c.category}</span>
                          </td>
                          <td>
                            <strong>Rs. {c.currentPrice.toFixed(2)}</strong> / kg
                          </td>
                          <td className={c.expectedMovement > 0 ? 'text-rose' : 'text-green'}>
                            <strong>
                              {c.expectedMovement > 0 ? '+' : ''}
                              {c.expectedMovement.toFixed(2)}%
                            </strong>
                          </td>
                          <td>
                            <div className="risk-bar-cell">
                              <span className="risk-num">{c.riskProbability}%</span>
                              <div className="risk-meter-track">
                                <div
                                  className={`risk-meter-fill ${riskClass}`}
                                  style={{ width: `${Math.min(100, c.riskProbability)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${riskClass}`}>{c.riskLevel} Risk</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="inspect-btn"
                              onClick={e => {
                                e.stopPropagation();
                                handleCommoditySelect(c.id);
                              }}
                            >
                              <span>Inspect Risk</span>
                              <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </AsyncPanel>

      {/* 5. Model Governance & Audit Modal */}
      {governanceData && (
        <ModelGovernanceModal
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
          data={governanceData}
        />
      )}
    </div>
  );
}
