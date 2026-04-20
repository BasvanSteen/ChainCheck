// ChainCheck — Progress indicator (ketting / dots / pills)
/* global React, CHAIN_ICONS, CHAIN_COLORS */

function ChainProgress({ chains, currentIndex, questionsDone, totalQuestions, style, accent }) {
  const pct = totalQuestions > 0 ? questionsDone / totalQuestions : 0;

  if (style === "dots") {
    return (
      <div className="cc-progress cc-progress--dots">
        <div className="cc-dots-track">
          <div className="cc-dots-fill" style={{ width: `${pct * 100}%`, background: accent }} />
        </div>
        <div className="cc-dots-row">
          {chains.map((c, i) => {
            const Icon = CHAIN_ICONS[c.id] || CHAIN_ICONS.doelgroep;
            const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
            return (
              <div key={c.id} className={`cc-dot cc-dot--${state}`}>
                <Icon size={18} color={state === "todo" ? "#8fa4af" : "#fff"} />
                <span style={state === "active" ? { color: accent } : undefined}>{c.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "pills") {
    return (
      <div className="cc-progress cc-progress--pills">
        {chains.map((c, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
          return (
            <div key={c.id} className={`cc-pill cc-pill--${state}`}
              style={state === "active" ? { background: accent, borderColor: accent } : undefined}>
              <span className="cc-pill-num">{i + 1}</span>
              <span>{c.title}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ketting (default)
  const activeChain = chains[currentIndex];
  return (
    <div className="cc-progress cc-progress--ketting">
      <div className="cc-ketting-active-label" style={{ color: accent }}>{activeChain?.title}</div>
      <div className="cc-ketting-icons-row">
        <div className="cc-ketting-track" />
        {chains.map((c, i) => {
          const Icon = CHAIN_ICONS[c.id] || CHAIN_ICONS.doelgroep;
          const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
          const tint = state === "active" ? accent
            : state === "done" ? (CHAIN_COLORS[c.id] || accent)
            : "#CBD5DB";
          return (
            <div key={c.id} className={`cc-klink cc-klink--${state}`}>
              <div className="cc-klink-icon" style={{ color: tint }}>
                <Icon size={26} color={tint} />
              </div>
              <span className="cc-klink-label" style={state === "active" ? { color: accent, fontWeight: 700 } : undefined}>
                {c.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ChainProgress = ChainProgress;
