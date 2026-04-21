// ChainCheck — App root
/* global React, ReactDOM, CHAIN_ICONS, CHAIN_COLORS, Welcome, ChainIntroScreen, QuestionScreen, StrategyScreen, Results, VersionMismatch */

const { useState, useEffect } = React;

// ── Scoring (uses verdict texts from the question set JSON) ───────────────────

function chainVerdict(chain, score) {
  const max = chain.questions.length * 3;
  const pct = score / max;
  const v = chain.verdicts || {};
  if (pct >= 0.75) return { tone: "good",  summary: v.strong || "" };
  if (pct >= 0.40) return { tone: "warn",  summary: v.warn   || "" };
  return               { tone: "weak",  summary: v.weak   || "" };
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function parsePath() {
  const parts = window.location.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
  return { slug: parts[0] || "default", customerId: parts[1] || null };
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function setParam(key, value) {
  const p = getParams();
  p.set(key, value);
  window.history.replaceState({}, "", "?" + p.toString());
}

function deleteParam(key) {
  const p = getParams();
  p.delete(key);
  const qs = p.toString();
  window.history.replaceState({}, "", qs ? "?" + qs : window.location.pathname);
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [chains, setChains] = useState([]);
  const [setMeta, setSetMeta] = useState({});
  const [currentSlug, setCurrentSlug] = useState("");

  // Navigation: 'welcome' | {chainIndex, qIndex} | 'results' | 'version-mismatch'
  const [view, setView] = useState("welcome");

  // Answers: { [chainId]: number[] }
  const [answers, setAnswers] = useState({});

  // Strategy form values
  const [strategyData, setStrategyData] = useState({});

  // Customer profile from external API (loaded when email is known)
  const [customerData, setCustomerData] = useState(null);
  const [customerId, setCustomerId] = useState(null);

  // Response tracking
  const [responseId, setResponseId] = useState(null);
  const [savedVersion, setSavedVersion] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const progressStyle = "ketting";
  const accent = "#EE3D96";

  // ── Load question set + optional saved response on mount ──────────────────

  useEffect(() => {
    const { slug, customerId: urlCustomerId } = parsePath();
    const respId = getParams().get("response");
    setCurrentSlug(slug);
    if (urlCustomerId) setCustomerId(urlCustomerId);

    const fetchSet = fetch(`/api/sets/${slug}`).then(r => {
      if (!r.ok) throw new Error(`Vragenlijst "${slug}" niet gevonden`);
      return r.json();
    });

    const fetchResp = respId
      ? fetch(`/api/responses/${respId}`).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null);

    const fetchCustomer = urlCustomerId
      ? fetch(`/api/customer?id=${encodeURIComponent(urlCustomerId)}`).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null);

    Promise.all([fetchSet, fetchResp, fetchCustomer])
      .then(([set, resp, customer]) => {
        setChains(set.chains);
        setSetMeta({ id: set.id, slug: set.slug, version: set.version, ...set.meta, strategy: set.strategy });

        if (customer) {
          setCustomerData(customer);

          // Support both array names and match on slug or id
          const allScans = customer.chaincheck || customer.questionnaire || [];
          const scans = allScans.filter(s => s.slug === slug || s.slug === setMeta.id || s.slug === setMeta.slug);
          const scan  = scans.sort((a, b) => new Date(b.submittedAt || b.completedAt || 0) - new Date(a.submittedAt || a.completedAt || 0))[0];

          if (scan) {
            if (scan.answers)    setAnswers(scan.answers);
            if (scan.strategy)   setStrategyData(scan.strategy);
            if (scan.responseId) setResponseId(scan.responseId);
            setSavedVersion(scan.version);

            if (scan.version !== set.version) {
              setView("version-mismatch");
            } else {
              setReadOnly(true);
              setView("results");
            }
            setLoadState("ready");
            return;
          }

          // No scan for this slug — known fields (email/name) are handled
          // silently by StrategyScreen via customerData prop
        }

        if (resp && !resp.error) {
          setResponseId(resp.id);
          setSavedVersion(resp.version);
          setAnswers(resp.answers || {});
          if (resp.strategy) setStrategyData(resp.strategy);
          setView(resp.version !== set.version ? "version-mismatch" : "results");
          if (resp.version === set.version) setReadOnly(true);
        }

        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalQuestions = chains.reduce((a, c) => a + c.questions.length, 0);
  const totalAnswered  = Object.values(answers).reduce((a, arr) => a + arr.filter(x => x != null).length, 0);

  function currentSelected() {
    if (typeof view !== "object") return null;
    const c = chains[view.chainIndex];
    return answers[c.id]?.[view.qIndex] ?? null;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function onSelect(optIndex) {
    if (typeof view !== "object") return;
    const c = chains[view.chainIndex];
    const arr = [...(answers[c.id] || [])];
    arr[view.qIndex] = optIndex;
    setAnswers({ ...answers, [c.id]: arr });
  }

  function onNext() {
    if (typeof view !== "object") return;
    const c = chains[view.chainIndex];
    if (view.qIndex === -1) {
      setView({ chainIndex: view.chainIndex, qIndex: 0 });
    } else if (view.qIndex + 1 < c.questions.length) {
      setView({ chainIndex: view.chainIndex, qIndex: view.qIndex + 1 });
    } else if (view.chainIndex + 1 < chains.length) {
      setView({ chainIndex: view.chainIndex + 1, qIndex: -1 });
    } else {
      setView("strategy");
    }
  }

  function onPrev() {
    if (view === "strategy") {
      const last = chains.length - 1;
      setView({ chainIndex: last, qIndex: chains[last].questions.length - 1 });
      return;
    }
    if (view === "results") {
      const last = chains.length - 1;
      setView({ chainIndex: last, qIndex: chains[last].questions.length - 1 });
      return;
    }
    if (typeof view === "object") {
      if (view.qIndex === -1 && view.chainIndex === 0) {
        setView("welcome");
      } else if (view.qIndex === -1) {
        const prev = chains[view.chainIndex - 1];
        setView({ chainIndex: view.chainIndex - 1, qIndex: prev.questions.length - 1 });
      } else if (view.qIndex === 0) {
        setView({ chainIndex: view.chainIndex, qIndex: -1 });
      } else {
        setView({ chainIndex: view.chainIndex, qIndex: view.qIndex - 1 });
      }
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveAndShowResults(strategy = strategyData) {
    setStrategyData(strategy);
    setSaving(true);
    try {
      if (!responseId) {
        const res  = await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: currentSlug, version: setMeta.version }),
        });
        const data = await res.json();
        if (data.id) {
          setResponseId(data.id);
          setParam("response", data.id);
        }
      }
    } catch (e) {
      console.error("Response ID generation failed:", e);
    }
    setSaving(false);
    setView("results");
  }

  // ── User actions ──────────────────────────────────────────────────────────

  function onStart()   { setAnswers({}); setReadOnly(false); setView({ chainIndex: 0, qIndex: -1 }); }
  function onEdit()    { setReadOnly(false); setView({ chainIndex: 0, qIndex: 0 }); }
  function onRetake()  { setAnswers({}); setReadOnly(false); setSavedVersion(null); setView({ chainIndex: 0, qIndex: -1 }); }
  function onViewOld() { setReadOnly(true); setView("results"); }

  function onRestart() {
    setAnswers({}); setResponseId(null); setSavedVersion(null); setReadOnly(false);
    deleteParam("response");
    setView("welcome");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="cc-app">
        <div className="cc-stage">
          <div className="cc-loading"><div className="cc-loading-spinner" /></div>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="cc-app">
        <div className="cc-stage">
          <div className="cc-window">
            <div className="cc-screen" style={{ padding: "40px 0" }}>
              <p style={{ fontSize: 18 }}>Vragenlijst niet gevonden.</p>
              <p style={{ color: "#6F8591", marginTop: 8 }}>Controleer de URL en probeer opnieuw.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-app">
      <div className="cc-stage">
        <div className="cc-topbar">
          <div className="cc-logo">
            <img src="/assets/logo_mm_wit.png" alt="Marketing Madheads"
              onError={e => { e.currentTarget.style.display = "none"; }} />
          </div>
        </div>

        <div className="cc-window">
          {view === "welcome" && (
            <Welcome meta={setMeta} accent={accent} onStart={onStart} chains={chains} />
          )}

          {typeof view === "object" && view.qIndex === -1 && (
            <ChainIntroScreen
              chain={chains[view.chainIndex]}
              chains={chains}
              chainIndex={view.chainIndex}
              onNext={onNext}
              onPrev={onPrev}
              progressStyle={progressStyle}
              accent={accent}
              totalAnswered={totalAnswered}
              totalQuestions={totalQuestions}
            />
          )}

          {typeof view === "object" && view.qIndex >= 0 && (
            <QuestionScreen
              chain={chains[view.chainIndex]}
              chains={chains}
              chainIndex={view.chainIndex}
              qIndex={view.qIndex}
              selected={currentSelected()}
              onSelect={readOnly ? () => {} : onSelect}
              onNext={onNext}
              onPrev={onPrev}
              canNext={currentSelected() != null}
              progressStyle={progressStyle}
              accent={accent}
              totalAnswered={totalAnswered}
              totalQuestions={totalQuestions}
              saving={saving}
              readOnly={readOnly}
            />
          )}

          {view === "strategy" && setMeta.strategy && (
            <StrategyScreen
              strategy={setMeta.strategy}
              initialValues={strategyData}
              customerData={customerData}
              onSubmit={saveAndShowResults}
              onPrev={onPrev}
              accent={accent}
              saving={saving}
            />
          )}

          {view === "results" && (
            <Results
              answers={answers}
              chains={chains}
              chainVerdict={chainVerdict}
              accent={accent}
              meta={setMeta}
              slug={setMeta.slug || currentSlug}
              onRestart={onRestart}
              onEdit={readOnly ? onEdit : null}
              responseId={responseId}
              readOnly={readOnly}
              strategy={strategyData}
              customerId={customerId}
              onCustomerId={(cid) => {
                setCustomerId(cid);
                window.history.replaceState({}, "", `/${setMeta.slug}/${cid}`);
              }}
            />
          )}

          {view === "version-mismatch" && (
            <VersionMismatch
              savedVersion={savedVersion}
              currentVersion={setMeta.version}
              accent={accent}
              onViewOld={onViewOld}
              onRetake={onRetake}
            />
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
