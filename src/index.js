import questionnaires from './sets/questionnaires.json';

// Build lookup maps for fast access by id and by slug
const byId   = Object.fromEntries(questionnaires.map(q => [q.id,   q]));
const bySlug = Object.fromEntries(questionnaires.map(q => [q.slug, q]));

function findSet(identifier) {
  return bySlug[identifier] ?? byId[identifier] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsHeaders() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Serve the SPA index.html for any slug route
async function serveSPA(env, request) {
  const spaUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(new Request(spaUrl.toString(), request));
}

// ── API handlers ──────────────────────────────────────────────────────────────

function handleGetSets() {
  const list = questionnaires.map(q => ({
    id: q.id,
    slug: q.slug,
    name: q.name,
    version: q.version,
    tag: q.tag,
  }));
  return json(list);
}

function handleGetSet(identifier) {
  const set = findSet(identifier);
  if (!set) return json({ error: 'Not found' }, 404);
  // Strip internal fields before sending to frontend
  const { pipelineId, calendly, ...rest } = set;
  return json(rest);
}

async function handleSaveResponse(request, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured' }, 501);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { slug, version, answers } = body;
  if (!slug || !version || !answers) {
    return json({ error: 'Missing required fields: slug, version, answers' }, 400);
  }
  if (!findSet(slug)) return json({ error: `Unknown slug: ${slug}` }, 400);

  const id = crypto.randomUUID();
  await env.RESPONSES.put(`response:${id}`, JSON.stringify({
    id, slug, version, answers,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  }), { expirationTtl: 60 * 60 * 24 * 365 });

  return json({ id }, 201);
}

async function handleGetResponse(id, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured' }, 501);
  const raw = await env.RESPONSES.get(`response:${id}`);
  if (!raw) return json({ error: 'Not found' }, 404);
  return json(JSON.parse(raw));
}

async function handleUpdateResponse(id, request, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured' }, 501);
  const raw = await env.RESPONSES.get(`response:${id}`);
  if (!raw) return json({ error: 'Not found' }, 404);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const existing = JSON.parse(raw);
  const updated = {
    ...existing,
    answers: body.answers ?? existing.answers,
    version: body.version ?? existing.version,
    updatedAt: new Date().toISOString(),
  };
  await env.RESPONSES.put(`response:${id}`, JSON.stringify(updated), {
    expirationTtl: 60 * 60 * 24 * 365,
  });
  return json(updated);
}

// Submit handler — triggers external API (CRM pipeline, Calendly, etc.)
// env.EXTERNAL_API_URL comes from .dev.vars locally, [vars] in production
async function handleSubmit(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { responseId, slug } = body;
  if (!responseId || !slug) {
    return json({ error: 'Missing required fields: responseId, slug' }, 400);
  }

  const set = findSet(slug);
  if (!set) return json({ error: `Unknown slug: ${slug}` }, 400);

  const externalUrl = env.EXTERNAL_API_URL;

  if (externalUrl) {
    try {
      await fetch(`${externalUrl}/api/chaincheck/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.EXTERNAL_API_KEY ? { 'Authorization': `Bearer ${env.EXTERNAL_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          responseId,
          pipelineId: set.pipelineId,
          slug: set.slug,
          name: set.name,
          tag: set.tag,
        }),
      });
    } catch (e) {
      // Log but don't block — returning calendly link is more important
      console.error('External API call failed:', e.message);
    }
  }

  return json({ ok: true, calendly: set.calendly });
}

// ── Main entry ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return corsHeaders();

    // ── API routes ────────────────────────────────────────────────────────────
    if (path.startsWith('/api/')) {
      const route = path.slice(4); // strip '/api'

      if (route === '/sets' && request.method === 'GET')
        return handleGetSets();

      const setMatch = route.match(/^\/sets\/([a-z0-9_-]+)$/);
      if (setMatch && request.method === 'GET')
        return handleGetSet(setMatch[1]);

      if (route === '/responses' && request.method === 'POST')
        return handleSaveResponse(request, env);

      const respMatch = route.match(/^\/responses\/([0-9a-f-]{36})$/i);
      if (respMatch) {
        if (request.method === 'GET') return handleGetResponse(respMatch[1], env);
        if (request.method === 'PUT') return handleUpdateResponse(respMatch[1], request, env);
      }

      if (route === '/submit' && request.method === 'POST')
        return handleSubmit(request, env);

      return json({ error: 'Not found' }, 404);
    }

    // ── Static assets (JS, CSS, fonts, images) ────────────────────────────────
    // Pass through requests for files with extensions to the asset handler
    if (path.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // ── Slug routes → serve SPA ───────────────────────────────────────────────
    // e.g. /intake, /marketing-check → serve index.html
    // The frontend reads the slug from window.location.pathname
    return serveSPA(env, request);
  },
};
