import defaultSet from './sets/default.json';

// Registry of all available question sets
const SETS = {
  default: defaultSet,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsPreflightHeaders() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function getSets() {
  const list = Object.values(SETS).map(s => ({
    id: s.id,
    version: s.version,
    title: s.meta.welcome.title,
  }));
  return json(list);
}

async function getSet(setId) {
  const set = SETS[setId];
  if (!set) return json({ error: 'Not found' }, 404);
  return json(set);
}

async function saveResponse(request, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured yet' }, 501);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { setId, version, answers } = body;
  if (!setId || !version || !answers) {
    return json({ error: 'Missing required fields: setId, version, answers' }, 400);
  }
  if (!SETS[setId]) {
    return json({ error: `Unknown setId: ${setId}` }, 400);
  }

  const id = crypto.randomUUID();
  const record = {
    id,
    setId,
    version,
    answers,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  await env.RESPONSES.put(`response:${id}`, JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 365,
  });

  return json({ id }, 201);
}

async function getResponse(id, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured yet' }, 501);
  const raw = await env.RESPONSES.get(`response:${id}`);
  if (!raw) return json({ error: 'Not found' }, 404);
  return json(JSON.parse(raw));
}

async function updateResponse(id, request, env) {
  if (!env.RESPONSES) return json({ error: 'Storage not configured yet' }, 501);
  const raw = await env.RESPONSES.get(`response:${id}`);
  if (!raw) return json({ error: 'Not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

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

// ── Main entry ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsPreflightHeaders();
    }

    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.slice(4); // strip '/api'

      // GET /api/sets
      if (path === '/sets' && request.method === 'GET') {
        return getSets();
      }

      // GET /api/sets/:id
      const setMatch = path.match(/^\/sets\/([a-z0-9_-]+)$/);
      if (setMatch && request.method === 'GET') {
        return getSet(setMatch[1]);
      }

      // POST /api/responses
      if (path === '/responses' && request.method === 'POST') {
        return saveResponse(request, env);
      }

      // GET /api/responses/:id  or  PUT /api/responses/:id
      const respMatch = path.match(/^\/responses\/([0-9a-f-]{36})$/i);
      if (respMatch) {
        if (request.method === 'GET') return getResponse(respMatch[1], env);
        if (request.method === 'PUT') return updateResponse(respMatch[1], request, env);
      }

      return json({ error: 'Not found' }, 404);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
