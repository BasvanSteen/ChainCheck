// ChainCheck — App root
/* global React, ReactDOM, CHAIN_ICONS, CHAIN_COLORS, Welcome, ChainIntroScreen, QuestionScreen, Results, VersionMismatch */

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

function getSlug() {
  const path = window.location.pathname.replace(/^\//, "").replace(/\/$/, "");
  return path || "default";
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

  // Response tracking
  const [responseId, setResponseId] = useState(null);
  const [savedVersion, setSavedVersion] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const progressStyle = "ketting";
  const accent = "#EE3D96";

  // ── Load question set + optional saved response on mount ──────────────────

  useEffect(() => {
    const slug = getSlug();
    const respId = getParams().get("response");
    setCurrentSlug(slug);

    const fetchSet = fetch(`/api/sets/${slug}`).then(r => {
      if (!r.ok) throw new Error(`Vragenlijst "${slug}" niet gevonden`);
      return r.json();
    });

    const fetchResp = respId
      ? fetch(`/api/responses/${respId}`).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null);

    Promise.all([fetchSet, fetchResp])
      .then(([set, resp]) => {
        setChains(set.chains);
        setSetMeta({ id: set.id, slug: set.slug, version: set.version, ...set.meta });

        if (resp && !resp.error) {
          setResponseId(resp.id);
          setSavedVersion(resp.version);
          setAnswers(resp.answers || {});
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
      saveAndShowResults();
    }
  }

  function onPrev() {
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

  async function saveAndShowResults() {
    setSaving(true);
    try {
      const isUpdate = !!responseId;
      const url    = isUpdate ? `/api/responses/${responseId}` : "/api/responses";
      const method = isUpdate ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: currentSlug, version: setMeta.version, answers }),
      });
      const data = await res.json();
      const id   = data.id || responseId;

      if (id) {
        setResponseId(id);
        setParam("response", id);
      }
    } catch (e) {
      console.error("Save failed:", e);
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
              onSelect={onSelect}
              onNext={onNext}
              onPrev={onPrev}
              canNext={currentSelected() != null}
              progressStyle={progressStyle}
              accent={accent}
              totalAnswered={totalAnswered}
              totalQuestions={totalQuestions}
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
              slug={currentSlug}
              onRestart={onRestart}
              onEdit={readOnly ? onEdit : null}
              responseId={responseId}
              readOnly={readOnly}
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
