// ChainCheck — Results screen
/* global React, CHAIN_ICONS, CHAIN_COLORS, CCButton, IconCheck, IconEdit */

const { useState } = React;

function toneColor(tone) {
  return tone === "good" ? "#16A34A" : tone === "warn" ? "#EA580C" : "#DC2626";
}

function toneLabel(tone) {
  return tone === "good" ? "Sterk" : tone === "warn" ? "Aandacht" : "Zwakke schakel";
}

function buildAnalysis(analysisConfig, totalScore, strategy) {
  const from = strategy?.currentClients;
  const to   = strategy?.targetClients;
  const grow = from && to ? ` van ${from} klanten naar ${to} klanten` : "";

  const tiers = (analysisConfig || []).slice().sort((a, b) => (a.maxScore ?? Infinity) - (b.maxScore ?? Infinity));
  const tier  = tiers.find(t => t.maxScore == null || totalScore <= t.maxScore) || tiers[tiers.length - 1] || {};

  return {
    level:    tier.level    || "",
    headline: tier.headline || "",
    body:     (tier.body    || "").replace("{grow}", grow),
  };
}

function ShareBar({ customerId, slug }) {
  const [copied, setCopied] = useState(false);
  if (!customerId || !slug) return null;

  const url = `${window.location.origin}/${slug}/${customerId}`;

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="cc-share">
      <span className="cc-share-label">Deel resultaat</span>
      <span className="cc-share-url">{url}</span>
      <button className={`cc-share-copy ${copied ? "cc-share-copy--done" : ""}`} onClick={copyUrl}>
        {copied ? "Gekopieerd ✓" : "Kopieer link"}
      </button>
    </div>
  );
}

function ScoreDial({ value, accent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <div className="cc-dial">
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ECECEC" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.3,1)" }} />
      </svg>
      <div className="cc-dial-inner">
        <div className="cc-dial-pct">{Math.round(value * 100)}%</div>
      </div>
    </div>
  );
}

function Results({ answers, chains, chainVerdict, accent, meta, slug, onRestart, onEdit, responseId, readOnly, strategy, onCustomerId, customerId: customerIdProp }) {
  const [calendly, setCalendly] = React.useState(null);
  const [customerId, setCustomerId] = React.useState(customerIdProp || null);

  React.useEffect(() => {
    if (!slug || readOnly) return;
    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId: responseId || undefined, slug, strategy, answers, version: meta?.version }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.calendly) setCalendly(d.calendly);
        if (d?.customerId) {
          setCustomerId(d.customerId);
          if (onCustomerId) onCustomerId(d.customerId);
        }
      })
      .catch(() => {});
  }, [slug, responseId]);
  const perChain = chains.map((c) => {
    let s = 0;
    const ans = answers[c.id] || [];
    c.questions.forEach((q, i) => {
      const pick = ans[i];
      if (pick != null) s += (q.options[pick]?.score || 0);
    });
    const max = c.questions.length * 3;
    return { chain: c, score: s, max, verdict: chainVerdict(c, s), pct: s / max };
  });

  const total = perChain.reduce((a, b) => a + b.score, 0);
  const totalMax = perChain.reduce((a, b) => a + b.max, 0);
  const totalPct = total / totalMax;
  const analysis = buildAnalysis(meta?.analysis, total, strategy);
  const weakest = [...perChain].sort((a, b) => a.pct - b.pct).slice(0, 2);
  const cta = meta?.cta || {};

  return (
    <div className="cc-screen cc-results">
      {/* HERO */}
      <div className="cc-results-hero">
        <div>
          <div className="cc-eyebrow" style={{ color: accent }}>Jouw resultaat</div>
          <h1 className="cc-results-title">{analysis.level}.</h1>
          <p className="cc-results-headline">{analysis.headline}</p>
          <p className="cc-results-lead">{analysis.body}</p>
          <div className="cc-results-actions">
            {readOnly && onEdit && (
              <button className="cc-btn-ghost" onClick={onEdit}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <IconEdit size={13} /> Antwoorden aanpassen
              </button>
            )}
            {readOnly && (
              <span className="cc-readonly-badge">
                <IconCheck size={11} color="#002E48" /> Opgeslagen resultaat
              </span>
            )}
          </div>
        </div>
        <div className="cc-results-score">
          <ScoreDial value={totalPct} accent={accent} />
          <div className="cc-results-score-meta">
            <div className="cc-score-num">{total}<span>/{totalMax}</span></div>
            <div className="cc-score-label">Ketting-score</div>
          </div>
        </div>
      </div>

      {/* Share URL */}
      <ShareBar customerId={customerId} slug={slug} />

      {/* Visual chain */}
      <div className="cc-results-chain">
        {perChain.map((p) => {
          const Icon = CHAIN_ICONS[p.chain.id] || CHAIN_ICONS.doelgroep;
          const col = toneColor(p.verdict.tone);
          return (
            <div key={p.chain.id} className={`cc-result-link cc-result-link--${p.verdict.tone}`}>
              <div className="cc-result-link-icon" style={{ color: col }}>
                <Icon size={38} color={col} />
              </div>
              <div className="cc-result-link-label">{p.chain.title}</div>
              <div className="cc-result-link-score" style={{ color: col }}>{p.score}/{p.max}</div>
            </div>
          );
        })}
      </div>

      {/* Per-schakel cards */}
      <div>
        <h2 className="cc-section-h">Per schakel</h2>
        <div className="cc-cards-grid">
          {perChain.map((p) => {
            const Icon = CHAIN_ICONS[p.chain.id] || CHAIN_ICONS.doelgroep;
            const col = toneColor(p.verdict.tone);
            return (
              <div key={p.chain.id} className="cc-rcard" style={{ borderLeft: `6px solid ${col}` }}>
                <div className="cc-rcard-head">
                  <div className="cc-rcard-icon" style={{ color: col }}>
                    <Icon size={24} color={col} />
                  </div>
                  <div className="cc-rcard-headtxt">
                    <div className="cc-rcard-title">{p.chain.title}</div>
                    <div className="cc-rcard-tone" style={{ color: col }}>{toneLabel(p.verdict.tone)}</div>
                  </div>
                  <div className="cc-rcard-score">
                    <div className="cc-rcard-bar">
                      <div className="cc-rcard-bar-fill" style={{ width: `${p.pct * 100}%`, background: col }} />
                    </div>
                    <div className="cc-rcard-num">{p.score}/{p.max}</div>
                  </div>
                </div>
                <p className="cc-rcard-body">{p.verdict.summary}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus */}
      <div className="cc-focus">
        <div className="cc-focus-eyebrow" style={{ color: accent }}>Begin hier</div>
        <h2 className="cc-section-h">Jouw twee zwakste schakels</h2>
        <div className="cc-focus-list">
          {weakest.map((p) => {
            const Icon = CHAIN_ICONS[p.chain.id] || CHAIN_ICONS.doelgroep;
            const col = toneColor(p.verdict.tone);
            return (
              <div key={p.chain.id} className="cc-focus-item">
                <div className="cc-focus-icon" style={{ color: col }}>
                  <Icon size={28} color={col} />
                </div>
                <div>
                  <div className="cc-focus-title">{p.chain.title}</div>
                  <div className="cc-focus-sub">{p.score}/{p.max} · versterk deze eerst voor de grootste impact</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="cc-cta">
        <div>
          <h2 className="cc-cta-h">{cta.heading || "Even praktisch meekijken?"}</h2>
          <p className="cc-cta-p">{cta.body || "Boek een korte, vrijblijvende call — we bedenken samen waar jij vandaag kunt beginnen."}</p>
        </div>
        <div className="cc-cta-right">
          <CCButton accent={accent} size="sm"
            onClick={() => { const url = calendly || cta.buttonUrl; if (url) window.open(url, "_blank"); }}>
            {cta.buttonLabel || "Plan een call"}
          </CCButton>
          <button className="cc-cta-restart" onClick={onRestart}>Opnieuw doen</button>
        </div>
      </div>
    </div>
  );
}

window.Results = Results;
