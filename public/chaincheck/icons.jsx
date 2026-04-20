// ChainCheck — SVG icon components
/* global React */
const h = React.createElement;

function IconChainLink({ size = 24, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 28 22", fill: "none", stroke: color, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M11.5 6.5h-3a4.5 4.5 0 0 0 0 9h3" }),
    h("path", { d: "M16.5 6.5h3a4.5 4.5 0 0 1 0 9h-3" }),
    h("path", { d: "M10 11h8" })
  );
}

function IconArrowRight({ size = 16, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M5 12h14M13 6l6 6-6 6" })
  );
}

function IconArrowLeft({ size = 16, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M19 12H5M11 18l-6-6 6-6" })
  );
}

function IconCheck({ size = 14, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "m5 12 5 5L20 7" })
  );
}

function IconWarning({ size = 28, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
    h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
    h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  );
}

function IconShare({ size = 14, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }),
    h("polyline", { points: "16 6 12 2 8 6" }),
    h("line", { x1: "12", y1: "2", x2: "12", y2: "15" })
  );
}

function IconEdit({ size = 14, color = "currentColor" }) {
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
    h("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
  );
}

// Per-chain color palette
const CHAIN_COLORS = {
  doelgroep: "#FF8C00",
  aanbod:    "#00BD13",
  seo:       "#FCBB15",
  ai:        "#EE3D96",
  ads:       "#00A4B8",
  conversie: "#6F3BFF",
};

// All chains use the same link icon; color varies per chain
const CHAIN_ICONS = Object.fromEntries(
  Object.keys(CHAIN_COLORS).map(id => [id, IconChainLink])
);

Object.assign(window, {
  IconChainLink, IconArrowRight, IconArrowLeft,
  IconCheck, IconWarning, IconShare, IconEdit,
  CHAIN_ICONS, CHAIN_COLORS,
});
