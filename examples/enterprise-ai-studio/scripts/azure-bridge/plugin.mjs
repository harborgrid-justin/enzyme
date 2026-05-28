/**
 * Vite plugin that exposes `/api/azure/*` during `npm run dev`.
 *
 * The browser talks to these routes via React Query (see src/studio/azure/api.ts).
 * Each route maps to one or more whitelisted `az` operations defined in
 * commands.mjs — there is no generic "run any az command" endpoint, by
 * design, so a compromised browser context can't trigger destructive
 * operations.
 *
 * Streaming endpoints (deployment create, chat completion proxy) use
 * Server-Sent Events so the client can render progress live without
 * additional WebSocket plumbing.
 */
import {
  showAccount,
  listSubscriptions,
  listResourceGroups,
  listLocations,
  listCognitiveAccounts,
  listDeployments,
  listDeployableModels,
  createDeployment,
  getAccountKey,
  getAccountEndpoint,
  getMonthToDateUsage,
  listFoundryHubs,
} from './commands.mjs';
import { invalidatePrefix } from './cache.mjs';
import { probeAz, platformInfo } from './shell.mjs';

const DEFAULT_BUDGET_USD = 45_000;
const DEFAULT_BUDGET_EXPIRES = '2026-06-05';

/** @typedef {import('vite').Plugin} VitePlugin */

/**
 * @returns {VitePlugin}
 */
export function azureBridgePlugin(options = {}) {
  const budgetUsd =
    Number(process.env.AZURE_BUDGET_USD ?? options.budgetUsd ?? DEFAULT_BUDGET_USD);
  const budgetExpires =
    process.env.AZURE_BUDGET_EXPIRES ?? options.budgetExpires ?? DEFAULT_BUDGET_EXPIRES;

  return {
    name: 'enzyme-studio:azure-bridge',
    apply: 'serve',
    configureServer(server) {
      const routes = buildRoutes({ budgetUsd, budgetExpires });
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/azure/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const route = routes.get(`${req.method} ${url.pathname}`);
        if (route == null) {
          json(res, 404, { error: 'NOT_FOUND', path: url.pathname });
          return;
        }
        try {
          await route({ req, res, url, query: queryToObj(url.searchParams) });
        } catch (err) {
          if (!res.headersSent) {
            json(res, 500, {
              error: 'BRIDGE_FAILED',
              message: err?.message ?? String(err),
              stderr: err?.stderr ?? null,
            });
          } else {
            try { res.end(); } catch { /* noop */ }
          }
        }
      });

      // eslint-disable-next-line no-console
      console.log(
        `  ⬢  Azure bridge ready (platform=${platformInfo.platform}, budget=$${budgetUsd}, expires=${budgetExpires})`
      );
    },
  };
}

// -----------------------------------------------------------------------------
// Route table
// -----------------------------------------------------------------------------

function buildRoutes({ budgetUsd, budgetExpires }) {
  /** @type {Map<string, (ctx: any) => Promise<void>>} */
  const routes = new Map();

  // ---- Status -------------------------------------------------------------
  routes.set('GET /api/azure/status', async ({ res }) => {
    const probe = await probeAz();
    let account = null;
    let loggedIn = false;
    if (probe.installed) {
      try {
        account = await showAccount();
        loggedIn = account != null;
      } catch (err) {
        loggedIn = false;
        account = { error: err.message };
      }
    }
    json(res, 200, {
      ...probe,
      platform: platformInfo.platform,
      isWindows: platformInfo.isWindows,
      loggedIn,
      account,
      budget: { capUsd: budgetUsd, expiresIso: budgetExpires },
    });
  });

  // ---- Subscriptions / RGs / Locations -----------------------------------
  routes.set('GET /api/azure/subscriptions', async ({ res }) => {
    const subs = await listSubscriptions();
    json(res, 200, subs ?? []);
  });

  routes.set('GET /api/azure/resource-groups', async ({ res, query }) => {
    requireQuery(query, ['subscription']);
    const groups = await listResourceGroups({ subscriptionId: query.subscription });
    json(res, 200, groups ?? []);
  });

  routes.set('GET /api/azure/locations', async ({ res, query }) => {
    requireQuery(query, ['subscription']);
    const locations = await listLocations({ subscriptionId: query.subscription });
    json(res, 200, locations ?? []);
  });

  // ---- Cognitive / Foundry -----------------------------------------------
  routes.set('GET /api/azure/cognitive/accounts', async ({ res, query }) => {
    requireQuery(query, ['subscription']);
    const accounts = await listCognitiveAccounts({ subscriptionId: query.subscription });
    json(res, 200, accounts ?? []);
  });

  routes.set('GET /api/azure/cognitive/deployments', async ({ res, query }) => {
    requireQuery(query, ['subscription', 'resourceGroup', 'account']);
    const deps = await listDeployments({
      subscriptionId: query.subscription,
      resourceGroup: query.resourceGroup,
      accountName: query.account,
    });
    json(res, 200, deps ?? []);
  });

  routes.set('GET /api/azure/cognitive/models', async ({ res, query }) => {
    requireQuery(query, ['subscription', 'resourceGroup', 'account']);
    const models = await listDeployableModels({
      subscriptionId: query.subscription,
      resourceGroup: query.resourceGroup,
      accountName: query.account,
    });
    json(res, 200, models ?? []);
  });

  routes.set('GET /api/azure/foundry/hubs', async ({ res, query }) => {
    requireQuery(query, ['subscription']);
    const hubs = await listFoundryHubs({ subscriptionId: query.subscription });
    json(res, 200, hubs);
  });

  // ---- Budget / consumption ----------------------------------------------
  routes.set('GET /api/azure/budget', async ({ res, query }) => {
    requireQuery(query, ['subscription']);
    const usage = await getMonthToDateUsage({ subscriptionId: query.subscription });
    const expires = new Date(budgetExpires + 'T23:59:59Z');
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    json(res, 200, {
      ...usage,
      capUsd: budgetUsd,
      expiresIso: budgetExpires,
      daysRemaining,
      remainingUsd: Math.max(0, budgetUsd - (usage.totalUsd ?? 0)),
      utilization: budgetUsd > 0 ? (usage.totalUsd ?? 0) / budgetUsd : 0,
    });
  });

  // ---- Deployment wizard (streams live log) ------------------------------
  routes.set('POST /api/azure/cognitive/deploy', async ({ req, res }) => {
    const body = await readJson(req);
    const required = [
      'subscriptionId',
      'resourceGroup',
      'accountName',
      'deploymentName',
      'modelName',
      'modelVersion',
      'modelFormat',
      'skuName',
      'skuCapacity',
    ];
    for (const field of required) {
      if (body[field] == null || body[field] === '') {
        json(res, 400, { error: 'MISSING_FIELD', field });
        return;
      }
    }
    startSse(res);
    sse(res, 'log', { stream: 'meta', line: `▶ Deploying ${body.modelName}@${body.modelVersion} to ${body.accountName}/${body.deploymentName}` });
    sse(res, 'log', { stream: 'meta', line: `   subscription=${body.subscriptionId}, rg=${body.resourceGroup}, sku=${body.skuName}@${body.skuCapacity}` });
    let code;
    try {
      code = await createDeployment(body, {
        onLine: (line, stream) => sse(res, 'log', { stream, line }),
      });
    } catch (err) {
      // Most commonly: `az` isn't on PATH, or the spawn failed mid-stream.
      sse(res, 'log', { stream: 'stderr', line: err?.message ?? String(err) });
      sse(res, 'done', { code: -1 });
      res.end();
      return;
    }
    invalidatePrefix(`cog:`);
    if (code === 0) {
      sse(res, 'log', { stream: 'meta', line: '✔ Deployment succeeded' });
      sse(res, 'done', { code });
    } else {
      sse(res, 'log', { stream: 'meta', line: `✖ az exited with code ${code}` });
      sse(res, 'done', { code });
    }
    res.end();
  });

  // ---- Live chat completion proxy ----------------------------------------
  // The browser sends a neutral chat-completion request; we resolve the
  // deployment's endpoint + key on the bridge (key never leaves the server)
  // and proxy the request to Azure with `stream: true`. We then pipe the
  // Azure SSE response through this connection so the studio sees the same
  // SSE shape its mock backend uses.
  routes.set('POST /api/azure/openai/chat', async ({ req, res }) => {
    const body = await readJson(req);
    const required = ['subscriptionId', 'resourceGroup', 'accountName', 'deploymentName', 'messages'];
    for (const field of required) {
      if (body[field] == null) {
        json(res, 400, { error: 'MISSING_FIELD', field });
        return;
      }
    }
    const apiVersion = body.apiVersion ?? '2024-10-21';

    const [key, endpoint] = await Promise.all([
      getAccountKey({
        subscriptionId: body.subscriptionId,
        resourceGroup: body.resourceGroup,
        accountName: body.accountName,
      }),
      getAccountEndpoint({
        subscriptionId: body.subscriptionId,
        resourceGroup: body.resourceGroup,
        accountName: body.accountName,
      }),
    ]);
    if (key == null || endpoint == null) {
      json(res, 502, {
        error: 'KEY_OR_ENDPOINT_MISSING',
        message: 'Could not resolve deployment key/endpoint via az.',
      });
      return;
    }
    const url =
      `${endpoint.replace(/\/$/, '')}/openai/deployments/` +
      `${encodeURIComponent(body.deploymentName)}/chat/completions?api-version=${apiVersion}`;

    const upstreamBody = {
      messages: body.messages,
      max_tokens: body.maxTokens ?? 512,
      temperature: body.temperature ?? 0.7,
      stream: true,
    };

    startSse(res);
    let upstream;
    try {
      upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify(upstreamBody),
      });
    } catch (err) {
      sse(res, 'error', { message: `Upstream connect failed: ${err?.message ?? String(err)}` });
      res.end();
      return;
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      sse(res, 'error', { message: `Upstream ${upstream.status}: ${text.slice(0, 400)}` });
      res.end();
      return;
    }
    if (upstream.body == null) {
      sse(res, 'error', { message: 'Upstream returned empty body.' });
      res.end();
      return;
    }

    // Pipe SSE frames straight through. Azure OpenAI emits `data: {...}\n\n`
    // chunks matching the OpenAI shape; we forward them verbatim so the
    // studio's existing parser handles them.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      sse(res, 'error', { message: `Stream read failed: ${err?.message ?? String(err)}` });
    } finally {
      res.end();
    }
  });

  return routes;
}

// -----------------------------------------------------------------------------
// HTTP helpers
// -----------------------------------------------------------------------------

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function startSse(res) {
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.flushHeaders?.();
}

function sse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks).toString('utf-8');
  if (buf.trim() === '') return {};
  return JSON.parse(buf);
}

function queryToObj(searchParams) {
  const out = {};
  for (const [key, value] of searchParams.entries()) out[key] = value;
  return out;
}

function requireQuery(query, names) {
  for (const name of names) {
    if (query[name] == null || query[name] === '') {
      const err = new Error(`Missing required query param: ${name}`);
      err.statusCode = 400;
      throw err;
    }
  }
}
