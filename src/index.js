import questionnaires from './sets/index.js';

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

async function serveSPA(env, request) {
  const url = new URL(request.url);
  url.pathname = '/index.html';
  return env.ASSETS.fetch(url.toString());
}

// ── API handlers ──────────────────────────────────────────────────────────────

function handleGetSets() {
  return json(questionnaires.map(q => ({
    id: q.id, slug: q.slug, name: q.name, version: q.version, tag: q.tag,
  })));
}

function handleGetSet(identifier) {
  const set = findSet(identifier);
  if (!set) return json({ error: 'Not found' }, 404);
  const { pipelineId, groupId, calendly, ...rest } = set;
  return json(rest);
}

// Generates a responseId for correlation — no storage
function handleCreateResponse(body) {
  const { slug, version } = body || {};
  if (!slug || !version) return json({ error: 'Missing required fields: slug, version' }, 400);
  if (!findSet(slug)) return json({ error: `Unknown slug: ${slug}` }, 400);
  return json({ id: crypto.randomUUID() }, 201);
}

// Compute per-chain scores from raw answer indices
function computeResult(set, answers) {
  let totalScore = 0;
  let totalMax   = 0;

  const chains = set.chains.map(chain => {
    const picked = answers[chain.id] || [];
    const score  = chain.questions.reduce((sum, q, i) => sum + (q.options[picked[i]]?.score ?? 0), 0);
    const max    = chain.questions.length * 3;
    const pct    = max > 0 ? score / max : 0;
    const verdict = pct >= 0.75 ? 'strong' : pct >= 0.40 ? 'warn' : 'weak';
    totalScore += score;
    totalMax   += max;
    const questions = chain.questions.map((q, i) => {
      const opt = q.options[picked[i]];
      return { q: q.q, answer: opt?.label ?? null, score: opt?.score ?? null };
    });
    return { id: chain.id, title: chain.title, score, max, pct: Math.round(pct * 100) / 100, verdict, questions };
  });

  const totalPct = totalMax > 0 ? totalScore / totalMax : 0;
  const tiers = (set.meta?.analysis || []).slice().sort((a, b) => (a.maxScore ?? Infinity) - (b.maxScore ?? Infinity));
  const tier  = tiers.find(t => t.maxScore == null || totalScore <= t.maxScore) || tiers[tiers.length - 1];

  return { totalScore, totalMax, totalPct: Math.round(totalPct * 100) / 100, level: tier?.level || '', chains };
}

// Submit — sends full payload to external API
async function handleSubmit(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { slug, responseId, strategy, answers, version } = body;
  if (!slug) return json({ error: 'Missing required field: slug' }, 400);

  console.log('[submit] slug:', slug, '| responseId:', responseId || '(none)');

  const set = findSet(slug);
  if (!set) return json({ error: `Unknown slug: ${slug}` }, 400);

  const result = computeResult(set, answers || {});
  const externalUrl = env.EXTERNAL_API_URL;
  let customerId = null;

  if (externalUrl) {
    try {
      const extRes = await fetch(`${externalUrl}/api-internal/questionnaire/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Tool': 'chaincheck',
          ...(env.EXTERNAL_API_KEY ? { 'Authorization': `Bearer ${env.EXTERNAL_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          responseId,
          pipelineId: set.pipelineId,
          groupId: set.groupId,
          slug: set.slug,
          name: set.name,
          tag: set.tag,
          version,
          strategy,
          answers,
          result,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (extRes.ok) {
        const extData = await extRes.json();
        console.log('[submit] external API full response:', JSON.stringify(extData));
        customerId = extData.customerTrackingId ?? extData.customerId ?? null;
      } else {
        const errText = await extRes.text().catch(() => '(no body)');
        console.error('[submit] external API error | status:', extRes.status, '| body:', errText);
      }
    } catch (e) {
      console.error('[submit] external API unreachable:', e.message);
      console.error('[submit] url attempted:', `${externalUrl}/api-internal/chaincheck/submit`);
      console.error('[submit] error name:', e.name);
      console.error('[submit] error cause:', e.cause ?? '(none)');
    }
  }

  return json({ ok: true, calendly: set.calendly, customerId });
}

// Customer proxy — fetches customer profile from external API by id or email
async function handleGetCustomer(request, env) {
  const params = new URL(request.url).searchParams;
  const lookup = params.get('id') || params.get('email');
  if (!lookup) return json({ error: 'Missing id or email parameter' }, 400);

  const externalUrl = env.EXTERNAL_API_URL;
  if (!externalUrl) return json({ error: 'External API not configured' }, 501);

  try {
    const res = await fetch(
      `${externalUrl}/api-internal/questionnaire/customers/${encodeURIComponent(lookup)}`,
      {
        headers: {
          'X-Internal-Tool': 'chaincheck',
          ...(env.EXTERNAL_API_KEY ? { 'Authorization': `Bearer ${env.EXTERNAL_API_KEY}` } : {}),
        },
      }
    );
    if (!res.ok) return json({ error: 'Not found' }, res.status);
    return json(await res.json());
  } catch (e) {
    return json({ error: 'External API unavailable' }, 502);
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return corsHeaders();

    if (path.startsWith('/api/')) {
      const route = path.slice(4);

      if (route === '/sets' && request.method === 'GET')
        return handleGetSets();

      const setMatch = route.match(/^\/sets\/([a-z0-9_-]+)$/);
      if (setMatch && request.method === 'GET')
        return handleGetSet(setMatch[1]);

      const calendlyMatch = route.match(/^\/sets\/([a-z0-9_-]+)\/calendly$/);
      if (calendlyMatch && request.method === 'GET') {
        const set = findSet(calendlyMatch[1]);
        if (!set) return json({ error: 'Not found' }, 404);
        return json({ calendly: set.calendly || null });
      }

      if (route === '/responses' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch { body = {}; }
        return handleCreateResponse(body);
      }

      if (route === '/submit' && request.method === 'POST')
        return handleSubmit(request, env);

      if (route === '/customer' && request.method === 'GET')
        return handleGetCustomer(request, env);

      return json({ error: 'Not found' }, 404);
    }

    if (path.includes('.')) return env.ASSETS.fetch(request);

    return serveSPA(env, request);
  },
};
