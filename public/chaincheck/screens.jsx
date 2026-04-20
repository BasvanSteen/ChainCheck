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

function Welcome({ meta, accent, onStart, chains }) {
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
        <h2 className="cc-chain-title" style={{ color: accent }}>{chain.title}</h2>
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

function QuestionScreen({ chain, chains, chainIndex, qIndex, selected, onSelect, onNext, onPrev, canNext, progressStyle, accent, totalAnswered, totalQuestions, saving }) {
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

      <div className="cc-question-body">
        <div className="cc-q-block">
          <div className="cc-q-text">{question.q}</div>
          <div className="cc-q-options">
            {question.options.map((opt, i) => {
              const sel = selected === i;
              return (
                <button
                  key={i}
                  className={`cc-option ${sel ? "cc-option--sel" : ""}`}
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

window.CCButton = CCButton;
window.Welcome = Welcome;
window.ChainIntroScreen = ChainIntroScreen;
window.QuestionScreen = QuestionScreen;
window.VersionMismatch = VersionMismatch;
