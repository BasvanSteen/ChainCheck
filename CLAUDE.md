# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # lokale Worker op http://localhost:8787
npm run deploy   # deploy naar Cloudflare Workers (productie)
```

Geen build-stap. De frontend gebruikt React 18 + Babel standalone geladen via CDN — JSX wordt in de browser getranspileerd.

## Architectuur

```
Browser (React SPA)
  └── /api/*  →  Cloudflare Worker  (src/index.js)
                    ├── /api/sets/:slug     → vragenlijst-data
                    ├── /api/responses      → opslaan/ophalen antwoorden (KV)
                    └── /api/submit         → trigger externe API + geeft Calendly terug
  └── /:slug  →  Worker serveert public/index.html (SPA)
```

**Backend** (`src/`): Cloudflare Worker. Verwerkt alle `/api/*`-routes en serveert de SPA voor slug-routes. Elke request zonder extensie en buiten `/api/` wordt intern herschreven naar `index.html`.

**Frontend** (`public/`): Statische bestanden, geserveerd via de `ASSETS`-binding. Vijf JSX-modules worden geladen via `<script type="text/babel">` in volgorde: `icons → progress → screens → results → app`. Ze communiceren via `window.*`-globals (geen bundler). `app.jsx` is het enige bestand dat de API aanroept.

**Vragenlijsten** (`src/sets/`): Elke vragenlijst is een eigen JSON-bestand, vernoemd naar de slug. `index.js` importeert ze allemaal en exporteert een array. De Worker bouwt twee lookup-maps (`bySlug`, `byId`). De velden `pipelineId` en `calendly` worden **nooit** naar de frontend gestuurd — die blijven backend-only.

## Een nieuwe vragenlijst toevoegen

1. Maak `src/sets/<slug>.json` aan op basis van de structuur hieronder
2. Voeg één import toe aan `src/sets/index.js`

```js
// src/sets/index.js
import winstgevendeWebsite from './winstgevende-website.json';
import nieuweSet           from './nieuwe-set.json';          // ← toevoegen

export default [winstgevendeWebsite, nieuweSet];              // ← toevoegen
```

De vragenlijst is daarna bereikbaar op `/<slug>` en via `GET /api/sets/<slug>`.

### JSON-schema van een vragenlijst

```jsonc
{
  "id": "uniek-id",           // intern ID (mag afwijken van slug)
  "slug": "url-naam",         // URL-pad: /<slug>
  "name": "Leesbare naam",
  "version": "1.0.0",         // verhoog bij inhoudelijke wijziging van vragen
  "tag": "categorie",
  "pipelineId": "",           // CRM pipeline-ID (alleen backend, nooit naar frontend)
  "calendly": "https://calendly.com/...",  // idem

  "meta": {
    "welcome": {
      "badge": "Naam · gratis",
      "title": "...",
      "lead": "...",
      "bullets": ["...", "..."],
      "timeEstimate": "12 vragen · ~4 min"
    },
    "cta": {
      "heading": "...",
      "body": "...",
      "buttonLabel": "Plan een call"
    }
  },

  "chains": [
    {
      "id": "schakel-id",
      "title": "Schakel titel",
      "lead": "Toelichting bij de schakel.",
      "verdicts": {
        "strong": "Tekst bij score ≥ 75%",
        "warn":   "Tekst bij score 40–74%",
        "weak":   "Tekst bij score < 40%"
      },
      "questions": [
        {
          "q": "De vraag?",
          "options": [
            { "label": "Beste antwoord",    "score": 3 },
            { "label": "Gedeeltelijk",      "score": 1 },
            { "label": "Nog niet",          "score": 0 }
          ]
        }
      ]
    }
  ],

  "strategy": {
    "title": "...",
    "lead": "...",
    "fields": [
      { "id": "fieldId", "label": "...", "type": "number|email|text" }
    ]
  }
}
```

**Scoringslogica**: per schakel = som van de geselecteerde scores. Max = aantal vragen × 3. Drempelwaarden: ≥ 75% = sterk, 40–74% = aandacht, < 40% = zwak. Dit zit in `chainVerdict()` in `public/chaincheck/app.jsx`.

**Versiebeheer**: verhoog `version` bij elke inhoudelijke wijziging van vragen of opties. Als een gebruiker een opgeslagen antwoordset (`?response=UUID`) laadt en de versie niet overeenkomt, ziet hij een "versie gewijzigd"-scherm met de keuze om opnieuw in te vullen of de oude resultaten te bekijken.

## Omgevingsvariabelen

| Variabele | Lokaal (`.dev.vars`) | Productie |
|---|---|---|
| `EXTERNAL_API_URL` | `http://localhost:3000` | `wrangler.toml` → `[vars]` |
| `EXTERNAL_API_KEY` | `dev-key` | `npx wrangler secret put EXTERNAL_API_KEY` |

Bij `/api/submit` POST'et de Worker naar `$EXTERNAL_API_URL/api/chaincheck/submit` met `{ responseId, pipelineId, slug, name, tag }`. Als de externe API niet beschikbaar is, blokkeert dit de response niet.

## Opslag (KV) activeren

Responses worden opgeslagen in Cloudflare KV. Nog niet geconfigureerd — de endpoints geven nu `501` terug. Activeren:

```bash
npm run kv:create
# kopieer het ID naar wrangler.toml onder [[kv_namespaces]]
```

KV-sleutelformaat: `response:{uuid}`. TTL: 1 jaar.

## URL-routing

- `/:slug` → SPA (index.html), frontend leest slug via `window.location.pathname`
- `/:slug?response=UUID` → SPA laadt opgeslagen response vanuit KV
- Bestanden met extensie (`.js`, `.css`, `.ttf`, etc.) → direct via `ASSETS`-binding
- `/api/*` → Worker-handlers
