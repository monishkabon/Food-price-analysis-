import { useQuery } from '@tanstack/react-query';
import { backend } from '../api/plumber';
import { AsyncPanel } from '../components/AsyncPanel';
import { PageHeader } from '../components/PageHeader';

const percent = (value: number | null) => value === null ? 'Unavailable' : `${(value * 100).toFixed(2)}%`;

export function LiveModelInsights() {
  const query = useQuery({ queryKey: ['backend', 'performance'], queryFn: backend.performance });
  const data = query.data;
  const binary = data?.binary[0];
  const best = data?.continuous.reduce<(NonNullable<typeof data>)['continuous'][number] | undefined>((current, row) => !current || row.mae < current.mae ? row : current, undefined);
  return <>
    <PageHeader eyebrow="Held-out evaluation" title="Model Insights" description="Review errors and classification results from the R analytics pipeline." />
    <AsyncPanel loading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
      {data && <>
        <section className="model-banner"><div><span>Prediction models · version {data.model_version}</span><h2>Ridge regression + Logistic regression + LASSO regression</h2><p>Test period: {data.test_period.start} – {data.test_period.end} · {data.n_test} observations</p></div></section>
        <article className="panel table-panel live-section"><div className="panel-head"><div><h2>Movement-size prediction errors</h2><p className="live-caption">MAE and RMSE are in percentage points. Lower is better.</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>Model</th><th>MAE</th><th>RMSE</th></tr></thead><tbody>{data.continuous.map(row => <tr key={row.model}><td>{row.model}</td><td>{row.mae.toFixed(4)}</td><td>{row.rmse.toFixed(4)}</td></tr>)}</tbody></table></div>
        </article>
        {best && best.model !== 'Ridge' && <div className="decision-note live-note"><p><strong>{best.model} has the lowest MAE on this test set.</strong>The prediction endpoint currently serves Ridge. Review the model choice against validation performance before relying on its estimates.</p></div>}
        {binary && <>
          <h2 className="live-section">Large-movement classification</h2>
          <p className="live-caption">Movement threshold: {data.large_change_threshold_pct}%. Probability cutoff: {percent(binary.prob_cutoff)}. These metrics evaluate classification of movement size.</p>
          <section className="metrics">
            {([['Accuracy', percent(binary.accuracy)], ['Precision', percent(binary.precision)], ['Recall', percent(binary.recall)], ['Brier score', binary.brier_score?.toFixed(4) ?? 'Unavailable']] as const).map(([label, value]) => <article className="metric" key={label}><p>{label}</p><strong>{value}</strong></article>)}
          </section>
          <article className="panel live-section"><h2>Classification counts</h2><p>True positives: {binary.tp} · False positives: {binary.fp} · False negatives: {binary.fn} · True negatives: {binary.tn}</p><p>F1 score: {percent(binary.f1)}</p></article>
        </>}
        <article className="panel table-panel live-section"><div className="panel-head"><h2>Results by commodity</h2></div><div className="table-wrap"><table><thead><tr><th>Commodity</th><th>Observations</th><th>Baseline MAE</th><th>Ridge MAE</th><th>Brier score</th></tr></thead><tbody>{data.per_commodity.map(row => <tr key={row.commodity}><td>{row.commodity}</td><td>{row.n}</td><td>{row.mae_baseline.toFixed(4)}</td><td>{row.mae_ridge.toFixed(4)}</td><td>{row.brier_logit.toFixed(4)}</td></tr>)}</tbody></table></div></article>
        <article className="panel live-section"><h2>Limitations</h2><ul>{data.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></article>
      </>}
    </AsyncPanel>
  </>;
}
