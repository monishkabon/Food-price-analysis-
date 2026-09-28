import React from 'react';
import { SlidersHorizontal, Sparkles, MapPin, ShoppingBag, ArrowRight } from 'lucide-react';
import type { CommodityItem, MarketItem } from '../types';

interface SourcingFilterBarProps {
  commodities: CommodityItem[];
  markets: MarketItem[];
  selectedCommodityId: string;
  selectedMarketId: string;
  onCommodityChange: (id: string) => void;
  onMarketChange: (id: string) => void;
  onEvaluate: () => void;
  isLoading?: boolean;
}

export function SourcingFilterBar({
  commodities,
  markets,
  selectedCommodityId,
  selectedMarketId,
  onCommodityChange,
  onMarketChange,
  onEvaluate,
  isLoading = false,
}: SourcingFilterBarProps) {
  const currentCommodity = commodities.find(c => c.id === selectedCommodityId);
  const currentMarket = markets.find(m => m.id === selectedMarketId);

  return (
    <div className="sourcing-filter-bar">
      <div className="filter-controls-row">
        {/* Commodity Dropdown */}
        <div className="filter-group">
          <label htmlFor="commodity-select" className="filter-label">
            <ShoppingBag size={14} className="filter-icon" />
            <span>Commodity Basket</span>
          </label>
          <div className="select-wrapper">
            <select
              id="commodity-select"
              value={selectedCommodityId}
              onChange={e => onCommodityChange(e.target.value)}
              className="executive-select"
            >
              {commodities.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Market / District Dropdown */}
        <div className="filter-group">
          <label htmlFor="market-select" className="filter-label">
            <MapPin size={14} className="filter-icon" />
            <span>Market / District Corridor</span>
          </label>
          <div className="select-wrapper">
            <select
              id="market-select"
              value={selectedMarketId}
              onChange={e => onMarketChange(e.target.value)}
              className="executive-select"
            >
              {markets.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.district} ({m.province})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Evaluate Sourcing Risk CTA Button */}
        <div className="filter-cta-group">
          <button
            type="button"
            className="evaluate-cta-btn"
            onClick={onEvaluate}
            disabled={isLoading}
            aria-label="Evaluate Sourcing Risk"
          >
            <Sparkles size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>{isLoading ? 'Evaluating Risk Model...' : 'Evaluate Sourcing Risk'}</span>
          </button>
        </div>
      </div>

      {/* Quick Commodity Selection Ribbon */}
      <div className="quick-commodity-bar">
        <span className="quick-bar-label">Quick Basket Access:</span>
        <div className="quick-commodity-chips">
          {commodities.map(c => {
            const isSelected = c.id === selectedCommodityId;
            const badgeClass =
              c.riskLevel === 'High' ? 'chip-rose' : c.riskLevel === 'Moderate' ? 'chip-orange' : 'chip-green';
            return (
              <button
                key={c.id}
                type="button"
                className={`commodity-chip ${badgeClass} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onCommodityChange(c.id)}
              >
                <span className="chip-name">{c.name}</span>
                <span className="chip-risk">{c.riskProbability}% Risk</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
