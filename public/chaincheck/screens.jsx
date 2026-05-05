// ChainCheck — Welcome, QuestionScreen, VersionMismatch screens
/* global React, CHAIN_ICONS, CHAIN_COLORS, ChainProgress, IconArrowRight, IconArrowLeft, IconCheck, IconWarning */

function CCButton({ children, onClick, variant = "solid", accent = "#EE3D96", disabled, size = "md" }) {
  const styles = {
    solid:   { background: accent, color: "#fff", border: `2px solid ${accent}` },
    ghost:   { background: "transparent", color: "#002E48", border: "2px solid #002E48" },
    outline: { background: "transparent", color: "#002E48", border: `2px solid ${accent}` },
  };
  return (
    <button
      className={`cc-btn cc-btn--${size}`}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles[variant], opacity: disabled ? 0.4 : 1 }}
    >
      <span>{children}</span>
      <span className="cc-btn-affix" style={{
        background: variant === "solid" ? "#fff" : accent,
        color: variant === "solid" ? "#002E48" : "#fff",
      }}>
        <IconArrowRight size={size === "sm" ? 10 : 12} />
      </span>
    </button>
  );
}

function Welcome({ meta, accent, onStart }) {
  const { welcome } = meta;
  return (
    <div className="cc-screen cc-welcome">
      <div className="cc-eyebrow" style={{ color: accent }}>{welcome.badge}</div>
      <h1 className="cc-h1">{welcome.title}</h1>
      <p className="cc-lead">{welcome.lead}</p>

      {welcome.bullets && welcome.bullets.length > 0 && (
        <ul className="cc-bullets">
          {welcome.bullets.map((b, i) => (
            <li key={i}>
              <span className="cc-bullet-mark" style={{ background: accent }}>
                <IconCheck size={12} color="#fff" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="cc-welcome-cta">
        <CCButton onClick={onStart} accent={accent} size="sm">Start de check</CCButton>
        <span className="cc-foot-inline">{welcome.timeEstimate}</span>
      </div>
    </div>
  );
}

function ChainIntroScreen({ chain, chains, chainIndex, onNext, onPrev, progressStyle, accent, totalAnswered, totalQuestions }) {
  const Icon = CHAIN_ICONS[chain.id] || CHAIN_ICONS.doelgroep;
  return (
    <div className="cc-screen cc-chain-intro">
      <ChainProgress
        chains={chains}
        currentIndex={chainIndex}
        questionsDone={totalAnswered}
        totalQuestions={totalQuestions}
        style={progressStyle}
        accent={accent}
      />

      <div className="cc-chain-intro-body">
        <div className="cc-chain-intro-icon" style={{ color: accent }}>
          <Icon size={36} color={accent} />
        </div>
        <h2 className="cc-chain-title">{chain.title}</h2>
        <p className="cc-chain-lead">{chain.lead}</p>
      </div>

      <div className="cc-nav">
        <button className="cc-nav-back" onClick={onPrev} aria-label="Vorige">
          <IconArrowLeft size={14} /> <span>Vorige</span>
        </button>
        <CCButton onClick={onNext} accent={accent} size="sm">Volgende</CCButton>
      </div>
    </div>
  );
}

function QuestionScreen({ chain, chains, chainIndex, qIndex, selected, onSelect, onNext, onPrev, canNext, progressStyle, accent, totalAnswered, totalQuestions, saving, readOnly }) {
  const question = chain.questions[qIndex];
  const isLast = chainIndex === chains.length - 1 && qIndex === chain.questions.length - 1;

  return (
    <div className="cc-screen cc-question">
      <ChainProgress
        chains={chains}
        currentIndex={chainIndex}
        questionsDone={totalAnswered}
        totalQuestions={totalQuestions}
        style={progressStyle}
        accent={accent}
      />

      <div className="cc-question-body" key={`${chainIndex}-${qIndex}`}>
        <div className="cc-q-block">
          <div className="cc-q-text">{question.q}</div>
          <div className="cc-q-options">
            {question.options.map((opt, i) => {
              const sel = selected === i;
              return (
                <button
                  key={i}
                  className={`cc-option ${sel ? "cc-option--sel" : ""} ${readOnly ? "cc-option--readonly" : ""}`}
                  onClick={() => onSelect(i)}
                  style={sel ? { borderColor: accent, background: "#FFF7FB" } : undefined}
                >
                  <span className="cc-option-radio"
                    style={sel ? { borderColor: accent, background: accent } : undefined}>
                    {sel && <IconCheck size={12} color="#fff" />}
                  </span>
                  <span className="cc-option-label">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cc-nav">
        <button className="cc-nav-back" onClick={onPrev} aria-label="Vorige">
          <IconArrowLeft size={14} /> <span>Vorige</span>
        </button>
        <CCButton onClick={onNext} accent={accent} disabled={!canNext || saving} size="sm">
          {saving ? "Opslaan…" : isLast ? "Toon resultaat" : "Volgende"}
        </CCButton>
      </div>
    </div>
  );
}

function VersionMismatch({ savedVersion, currentVersion, accent, onViewOld, onRetake }) {
  return (
    <div className="cc-screen cc-mismatch">
      <div className="cc-mismatch-icon">
        <IconWarning size={28} color={accent} />
      </div>
      <div>
        <div className="cc-eyebrow" style={{ color: accent }}>Versie gewijzigd</div>
        <h1 className="cc-h1" style={{ fontSize: "clamp(26px,4vw,40px)", marginTop: 6 }}>
          De vragen zijn bijgewerkt
        </h1>
        <p className="cc-lead" style={{ marginTop: 10 }}>
          Je hebt deze check eerder ingevuld, maar de vragenlijst is sindsdien gewijzigd. Je kunt je oude antwoorden inzien of de check opnieuw invullen met de nieuwe vragen.
        </p>
      </div>

      <div className="cc-mismatch-versions">
        <span className="cc-version-pill cc-version-pill--old">v{savedVersion}</span>
        <span className="cc-mismatch-arrow">→</span>
        <span className="cc-version-pill cc-version-pill--new">v{currentVersion}</span>
      </div>

      <div className="cc-mismatch-actions">
        <CCButton onClick={onRetake} accent={accent} size="sm">Opnieuw invullen</CCButton>
        <button className="cc-btn-ghost" onClick={onViewOld}>Bekijk oude resultaten</button>
      </div>
    </div>
  );
}

function StrategyScreen({ strategy, initialValues, customerData, onSubmit, onPrev, accent, saving }) {
  // Values known from customer profile — used in submit but not shown to user
  const knownValues = React.useMemo(() => {
    if (!customerData) return {};
    const known = {};
    if (customerData.email)     known.email     = customerData.email;
    if (customerData.firstName) known.firstName = customerData.firstName;
    if (customerData.lastName)  known.lastName  = customerData.lastName;
    return known;
  }, [customerData]);

  const [values, setValues] = React.useState({ ...initialValues });
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);

  const visibleFields = strategy.fields.filter(f => !(f.id in knownValues));

  const canSubmit = React.useMemo(() => {
    return strategy.fields.every(f => {
      if (!f.required) return true;
      const val = knownValues[f.id] ?? values[f.id] ?? "";
      if (f.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      return String(val).trim().length > 0;
    });
  }, [strategy.fields, knownValues, values]);
  const strategySteps = Array.isArray(strategy.steps) ? strategy.steps : [];

  const sections = React.useMemo(() => {
    if (!strategySteps.length) return [{ id: "default", fields: visibleFields }];

    const stepIds = new Set(strategySteps.map(step => step.id));
    const mappedSections = strategySteps.map(step => ({
      ...step,
      fields: visibleFields.filter(field => field.stepId === step.id),
    })).filter(section => section.fields.length);

    const remainingFields = visibleFields.filter(field => !field.stepId || !stepIds.has(field.stepId));
    if (remainingFields.length) {
      mappedSections.push({ id: "default", fields: remainingFields });
    }

    return mappedSections.length ? mappedSections : [{ id: "default", fields: [] }];
  }, [strategySteps, visibleFields]);

  React.useEffect(() => {
    setActiveSectionIndex(0);
  }, [sections.length]);

  function set(id, val) { setValues(v => ({ ...v, [id]: val })); }
  function submit() { onSubmit({ ...knownValues, ...values }); }
  function fieldPlaceholder(field) {
    if (field.placeholder) return field.placeholder;
    if (field.type === "email") return "jouw@email.nl";
    if (field.type === "number") return "0";
    return "";
  }

  const activeSection = sections[activeSectionIndex] || sections[0] || { fields: [] };
  const isLastSection = activeSectionIndex >= sections.length - 1;

  function goPrev() {
    if (activeSectionIndex > 0) {
      setActiveSectionIndex(i => i - 1);
      return;
    }
    onPrev();
  }

  function goNext() {
    if (isLastSection) {
      submit();
      return;
    }
    setActiveSectionIndex(i => Math.min(i + 1, sections.length - 1));
  }

  return (
    <div className="cc-screen cc-strategy">
      <div className="cc-strategy-body">
        <h2 className="cc-chain-title" style={{ color: accent }}>{strategy.title}</h2>
        <p className="cc-chain-lead">{strategy.lead}</p>

        {strategy.note && (
          <div className="cc-strategy-note">
            {strategy.note}
          </div>
        )}

        {sections.length > 1 && (
          <div className="cc-strategy-stepcount">Stap {activeSectionIndex + 1} van {sections.length}</div>
        )}

        <div className="cc-strategy-sections">
          <section className="cc-strategy-section">
            {(activeSection.eyebrow || activeSection.title || activeSection.body) && (
              <div className="cc-strategy-section-head">
                {activeSection.eyebrow && <div className="cc-eyebrow" style={{ color: accent }}>{activeSection.eyebrow}</div>}
                {activeSection.title && <h3 className="cc-strategy-section-title">{activeSection.title}</h3>}
                {activeSection.body && <p className="cc-strategy-section-body">{activeSection.body}</p>}
              </div>
            )}

            <div className="cc-strategy-fields">
              {activeSection.fields.map(f => (
                <div key={f.id} className="cc-field">
                  <label className="cc-field-label">
                    {f.label}
                    {f.required && <span className="cc-field-required" style={{ color: accent }}>*</span>}
                  </label>
                  {f.helper && <div className="cc-field-helper">{f.helper}</div>}
                  <input
                    className="cc-field-input"
                    type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                    value={values[f.id] || ""}
                    onChange={e => set(f.id, e.target.value)}
                    placeholder={fieldPlaceholder(f)}
                    min={f.type === "number" ? 0 : undefined}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="cc-nav">
        <button className="cc-nav-back" onClick={goPrev} aria-label="Vorige">
          <IconArrowLeft size={14} /> <span>{activeSectionIndex > 0 ? "Vorige stap" : "Vorige"}</span>
        </button>
        <CCButton onClick={goNext} accent={accent} disabled={saving || (isLastSection && !canSubmit)} size="sm">
          {saving ? "Opslaan…" : (isLastSection ? (strategy.submitLabel || "Toon resultaat") : "Volgende stap")}
        </CCButton>
      </div>
    </div>
  );
}

window.CCButton = CCButton;
window.Welcome = Welcome;
window.ChainIntroScreen = ChainIntroScreen;
window.QuestionScreen = QuestionScreen;
window.StrategyScreen = StrategyScreen;
window.VersionMismatch = VersionMismatch;
