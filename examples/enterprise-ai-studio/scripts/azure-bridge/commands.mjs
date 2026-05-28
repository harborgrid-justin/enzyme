/**
 * Curated, allowlisted `az` operations used by the studio.
 *
 * Each export wraps a small set of `az` subcommands. Adding new operations
 * here is the ONLY way to expose new capabilities to the browser — the route
 * handlers in plugin.mjs call these by name and never accept arbitrary az
 * arguments from the wire. This is intentional: a compromised browser context
 * (XSS, malicious extension) can't trigger `az group delete` because that
 * command isn't reachable through any exported function.
 *
 * Conventions:
 *   - Every function passes `--output json` to az so callers get a parseable
 *     value.
 *   - Names accept the canonical Azure shape (`subscriptionId`,
 *     `resourceGroup`, `accountName`, etc.) and translate to az flags.
 *   - Read operations are memoized with a 60s TTL via cache.mjs — the
 *     browser refetches via React Query but we don't want to hammer ARM.
 */
import { runAz, streamAz } from './shell.mjs';
import { memoize } from './cache.mjs';

const ARM_API_VERSION_FOR_CONSUMPTION = '2024-08-01';

// -----------------------------------------------------------------------------
// Account / status
// -----------------------------------------------------------------------------

/** Currently signed-in account + tenant + default subscription. */
export const showAccount = memoize(
  () => runAz(['account', 'show', '--output', 'json']),
  { ttlMs: 30_000, key: 'account:show' }
);

/** List all subscriptions the user can see. */
export const listSubscriptions = memoize(
  () => runAz(['account', 'list', '--output', 'json']),
  { ttlMs: 60_000, key: 'account:list' }
);

// -----------------------------------------------------------------------------
// Resource groups + locations
// -----------------------------------------------------------------------------

export const listResourceGroups = memoize(
  ({ subscriptionId }) =>
    runAz(['group', 'list', '--subscription', subscriptionId, '--output', 'json']),
  { ttlMs: 60_000, keyFn: ({ subscriptionId }) => `rg:list:${subscriptionId}` }
);

export const listLocations = memoize(
  ({ subscriptionId }) =>
    runAz([
      'account',
      'list-locations',
      '--subscription',
      subscriptionId,
      '--output',
      'json',
    ]),
  { ttlMs: 24 * 60 * 60_000, keyFn: ({ subscriptionId }) => `loc:list:${subscriptionId}` }
);

// -----------------------------------------------------------------------------
// Cognitive Services / Azure OpenAI / Foundry
// -----------------------------------------------------------------------------

/**
 * All Cognitive Services accounts (this is the resource type that backs
 * Azure OpenAI + Foundry serverless model deployments).
 */
export const listCognitiveAccounts = memoize(
  ({ subscriptionId }) =>
    runAz([
      'cognitiveservices',
      'account',
      'list',
      '--subscription',
      subscriptionId,
      '--output',
      'json',
    ]),
  { ttlMs: 60_000, keyFn: ({ subscriptionId }) => `cog:list:${subscriptionId}` }
);

/** Existing model deployments on an Azure OpenAI / Foundry resource. */
export function listDeployments({ subscriptionId, resourceGroup, accountName }) {
  return runAz([
    'cognitiveservices',
    'account',
    'deployment',
    'list',
    '--name',
    accountName,
    '--resource-group',
    resourceGroup,
    '--subscription',
    subscriptionId,
    '--output',
    'json',
  ]);
}

/** Catalog of models available to deploy on a given resource. */
export const listDeployableModels = memoize(
  ({ subscriptionId, resourceGroup, accountName }) =>
    runAz([
      'cognitiveservices',
      'account',
      'list-models',
      '--name',
      accountName,
      '--resource-group',
      resourceGroup,
      '--subscription',
      subscriptionId,
      '--output',
      'json',
    ]),
  {
    ttlMs: 5 * 60_000,
    keyFn: ({ subscriptionId, accountName }) => `models:${subscriptionId}:${accountName}`,
  }
);

/**
 * Stream a deployment-create operation. Emits log lines via `onLine` so the
 * browser can render progress live. Returns the exit code.
 */
export function createDeployment(
  { subscriptionId, resourceGroup, accountName, deploymentName, modelName, modelVersion, modelFormat, skuName, skuCapacity },
  { signal, onLine }
) {
  const args = [
    'cognitiveservices',
    'account',
    'deployment',
    'create',
    '--name',
    accountName,
    '--resource-group',
    resourceGroup,
    '--subscription',
    subscriptionId,
    '--deployment-name',
    deploymentName,
    '--model-name',
    modelName,
    '--model-version',
    modelVersion,
    '--model-format',
    modelFormat,
    '--sku-name',
    skuName,
    '--sku-capacity',
    String(skuCapacity),
    '--output',
    'json',
  ];
  return streamAz(args, { signal, onLine });
}

/**
 * Resolve a deployment's key. ⚠️ This is SERVER-SIDE ONLY. The key is
 * attached to outbound chat-completion requests by the bridge and never
 * returned to the browser.
 */
export async function getAccountKey({ subscriptionId, resourceGroup, accountName }) {
  const result = await runAz([
    'cognitiveservices',
    'account',
    'keys',
    'list',
    '--name',
    accountName,
    '--resource-group',
    resourceGroup,
    '--subscription',
    subscriptionId,
    '--output',
    'json',
  ]);
  return result?.key1 ?? null;
}

/** Resolve a Cognitive Services endpoint URL (used to call /chat/completions). */
export async function getAccountEndpoint({ subscriptionId, resourceGroup, accountName }) {
  const result = await runAz([
    'cognitiveservices',
    'account',
    'show',
    '--name',
    accountName,
    '--resource-group',
    resourceGroup,
    '--subscription',
    subscriptionId,
    '--output',
    'json',
  ]);
  return result?.properties?.endpoint ?? null;
}

// -----------------------------------------------------------------------------
// Consumption / cost
// -----------------------------------------------------------------------------

/**
 * Get the user's month-to-date consumption for the given subscription. We
 * use the REST API directly via `az rest` because `az consumption usage list`
 * has quirks with subscription-scoped vs. billing-account-scoped queries.
 */
export const getMonthToDateUsage = memoize(
  async ({ subscriptionId }) => {
    const url =
      `/subscriptions/${subscriptionId}/providers/Microsoft.Consumption/usageDetails` +
      `?api-version=${ARM_API_VERSION_FOR_CONSUMPTION}` +
      `&$expand=meterDetails,additionalInfo` +
      `&$filter=properties/usageStart ge '${monthStartIso()}'`;
    try {
      const response = await runAz(['rest', '--method', 'get', '--url', url]);
      const items = Array.isArray(response?.value) ? response.value : [];
      let totalUsd = 0;
      for (const row of items) {
        const cost = Number(row.properties?.cost ?? 0);
        if (Number.isFinite(cost)) totalUsd += cost;
      }
      return { totalUsd, lineItems: items.length, sinceIso: monthStartIso() };
    } catch (err) {
      return { totalUsd: 0, lineItems: 0, sinceIso: monthStartIso(), error: err.message };
    }
  },
  { ttlMs: 5 * 60_000, keyFn: ({ subscriptionId }) => `usage:${subscriptionId}` }
);

function monthStartIso() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart.toISOString();
}

// -----------------------------------------------------------------------------
// Foundry / ML workspaces (hub + project)
// -----------------------------------------------------------------------------

export const listFoundryHubs = memoize(
  async ({ subscriptionId }) => {
    // Hubs are an ML workspace with kind="Hub". Filter on the client side
    // because the az ml workspace list doesn't expose --kind everywhere yet.
    try {
      const workspaces = await runAz([
        'ml',
        'workspace',
        'list',
        '--subscription',
        subscriptionId,
        '--output',
        'json',
      ]);
      if (!Array.isArray(workspaces)) return [];
      return workspaces.filter((w) => (w.kind ?? '').toLowerCase() === 'hub');
    } catch (err) {
      // The az ml extension may not be installed — surface that gracefully.
      if (/ml.*not.*installed|extension/i.test(err.message ?? '')) {
        return { error: 'AZ_ML_EXTENSION_MISSING', message: err.message };
      }
      throw err;
    }
  },
  { ttlMs: 60_000, keyFn: ({ subscriptionId }) => `foundry:hubs:${subscriptionId}` }
);
