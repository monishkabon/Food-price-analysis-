import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Info, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AsyncPanel } from "../components/AsyncPanel";
import { FilterPanel } from "../components/FilterPanel";
import { ForecastChart } from "../components/Charts";
import { PageHeader } from "../components/PageHeader";
import { RiskBadge } from "../components/RiskBadge";
import { useSelection } from "../hooks/useSelection";
import {
  buildForecastSchema,
  isForecastStale,
  money,
  pct,
} from "../lib/domain";
import type { Features, PredictionRequest } from "../types";
const initialFeatures: Features = {
  inflation: 5.2,
  exchangeRate: 302,
  fuelPrice: 311,
  rainfall: 120,
};
export function Forecast() {
  const meta = useQuery({ queryKey: ["metadata"], queryFn: api.metadata });
  const [selection, setSelection] = useSelection();
  const [period, setPeriod] = useState(3);
  const [features, setFeatures] = useState(initialFeatures);
  const [submitted, setSubmitted] = useState<PredictionRequest | null>(null);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: api.predict,
    onSuccess: (result, variables) => {
      const { forecastPeriod: period, features, ...selection } = variables;
      setError("");
      sessionStorage.setItem(
        "latestForecast",
        JSON.stringify({ selection, period, features, result }),
      );
    },
  });
  const request = { ...selection, forecastPeriod: period, features };
  const stale =
    !!mutation.data && !!submitted && isForecastStale(submitted, request);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = buildForecastSchema().safeParse(request);
    if (!parsed.success) {
      setError("Complete all required fields with valid positive values.");
      return;
    }
    setSubmitted(request);
    mutation.mutate(request);
  };
  const setFeature = (key: keyof Features, value: number) =>
    setFeatures((v) => ({ ...v, [key]: value }));
  return (
    <>
      <PageHeader
        eyebrow="Predictive workspace"
        title="Price Forecast"
        description="Generate a transparent, model-based estimate for a selected commodity and market."
      />
      <div className="forecast-layout">
        <form className="panel forecast-form" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <span className="step">01</span>
              <h2>Forecast context</h2>
            </div>
          </div>
          <AsyncPanel loading={meta.isLoading} error={meta.error}>
            {meta.data && (
              <FilterPanel
                compact
                metadata={meta.data}
                value={selection}
                onChange={setSelection}
              />
            )}
          </AsyncPanel>
          <hr />
          <div className="panel-head">
            <div>
              <span className="step">02</span>
              <h2>Forecast horizon</h2>
            </div>
          </div>
          <label className="field">
            Period
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </label>
          <hr />
          <div className="panel-head">
            <div>
              <span className="step">03</span>
              <h2>Economic inputs</h2>
            </div>
          </div>
          <div className="feature-grid">
            <label>
              Inflation rate (%)
              <input
                type="number"
                step="0.1"
                value={features.inflation}
                onChange={(e) => setFeature("inflation", +e.target.value)}
              />
            </label>
            <label>
              Exchange rate (LKR/USD)
              <input
                type="number"
                value={features.exchangeRate}
                onChange={(e) => setFeature("exchangeRate", +e.target.value)}
              />
            </label>
            <label>
              Fuel price (LKR/litre)
              <input
                type="number"
                value={features.fuelPrice}
                onChange={(e) => setFeature("fuelPrice", +e.target.value)}
              />
            </label>
            <label>
              Monthly rainfall (mm)
              <input
                type="number"
                value={features.rainfall}
                onChange={(e) => setFeature("rainfall", +e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={mutation.isPending}>
            <Sparkles />
            {mutation.isPending
              ? "Generating forecast..."
              : "Generate forecast"}
          </button>
        </form>
        <section className="results">
          <div className="results-heading">
            <div>
              <span className="step">04</span>
              <h2>Forecast result</h2>
            </div>
            {mutation.data && (
              <span className="generated">
                Model {mutation.data.modelVersion}
              </span>
            )}
          </div>
          {!mutation.data ? (
            <div className="empty-result">
              <div>
                <Sparkles />
              </div>
              <h2>Your forecast will appear here</h2>
              <p>
                Set the market context and economic inputs, then generate an
                estimate.
              </p>
            </div>
          ) : (
            <div className={`result-stack ${stale ? "stale" : ""}`}>
              {stale && (
                <div className="stale-notice">
                  <Info />
                  Inputs changed. Generate again to refresh this result.
                </div>
              )}
              <article className="prediction-hero">
                <div>
                  <span>Predicted price</span>
                  <strong>
                    {money(mutation.data.predictedPrice)}
                    <small>/kg</small>
                  </strong>
                  <p>
                    from {money(mutation.data.latestObservedPrice)} observed on
                    20 Sep
                  </p>
                </div>
                <div className="change-block">
                  <span>Expected change</span>
                  <strong
                    className={
                      mutation.data.expectedChangePercent >= 0 ? "up" : "down"
                    }
                  >
                    {pct(mutation.data.expectedChangePercent)}
                  </strong>
                  <span>{money(mutation.data.expectedChangeAbsolute)}/kg</span>
                </div>
              </article>
              <div className="result-cards">
                <article>
                  <span>90% prediction interval</span>
                  <strong>
                    {money(mutation.data.predictionInterval.lower)} -{" "}
                    {money(mutation.data.predictionInterval.upper)}
                  </strong>
                </article>
                <article>
                  <span>Expected volatility</span>
                  <strong>{mutation.data.volatility.value}%</strong>
                  <RiskBadge level={mutation.data.volatility.level} />
                </article>
              </div>
              <article className="panel chart-panel">
                <div className="panel-head">
                  <div>
                    <span className="overline">Projection</span>
                    <h2>{period}-month price path</h2>
                  </div>
                </div>
                <ForecastChart result={mutation.data} />
              </article>
              <div className="decision-note">
                <Info />
                <p>
                  <strong>Decision note</strong>Prices are estimated to trend
                  upward within a moderate range. Consider confirming near-term
                  supply conditions before timing purchases.
                </p>
              </div>
              <Link className="button secondary full" to="/scenarios">
                Compare scenarios <ArrowRight />
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
