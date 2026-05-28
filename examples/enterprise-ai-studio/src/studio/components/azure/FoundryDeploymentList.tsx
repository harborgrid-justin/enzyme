import { useState } from 'react';
import {
  useCognitiveAccounts,
  useCognitiveDeployments,
} from '../../azure/api';
import { useAzureStore, liveModelId, type LiveDeploymentRef } from '../../azure/store';
import { useStudioStore } from '../../store/studioStore';
import type { CognitiveAccount, CognitiveDeployment } from '../../azure/types';

/**
 * Browse + select existing Foundry / Azure OpenAI deployments.
 *
 * Three nested lists:
 *
 *   1. Cognitive Services accounts in the selected subscription
 *   2. Deployments inside the selected account
 *   3. Per-deployment actions: "Use in studio" (registers a live model id
 *      that the composer routes through the bridge) or "Set as default"
 *
 * The selection sync runs through the studio's `modelOverrideId` so the
 * existing chat-composer flow handles the live deployment without a separate
 * code path — completions.ts checks for the `azure-live:` prefix.
 */
export function FoundryDeploymentList(): React.ReactElement | null {
  const subscriptionId = useAzureStore((s) => s.selectedSubscriptionId);
  const selectedAccount = useAzureStore((s) => s.selectedAccountName);
  const setAccount = useAzureStore((s) => s.setAccount);
  const setResourceGroup = useAzureStore((s) => s.setResourceGroup);

  const { data: accounts, isLoading: loadingAccounts, error: accountsError } = useCognitiveAccounts(subscriptionId);

  if (subscriptionId == null) return null;

  if (loadingAccounts) {
    return <Section title="Foundry deployments"><Skeleton /></Section>;
  }
  if (accountsError != null) {
    return (
      <Section title="Foundry deployments">
        <p className="text-xs text-rose-600">
          Couldn&apos;t list Cognitive Services accounts: {(accountsError as Error).message}
        </p>
      </Section>
    );
  }
  if (accounts == null || accounts.length === 0) {
    return (
      <Section title="Foundry deployments">
        <p className="text-xs text-slate-500">
          No Cognitive Services / Foundry accounts found in this subscription. Use the deploy
          wizard below to create your first one.
        </p>
      </Section>
    );
  }

  const account =
    accounts.find((a) => a.name === selectedAccount) ?? accounts[0];

  function onSelectAccount(a: CognitiveAccount): void {
    setAccount(a.name);
    setResourceGroup(a.resourceGroup);
  }

  return (
    <Section title="Foundry deployments">
      <div className="mb-2">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Account
        </label>
        <select
          value={account?.name ?? ''}
          onChange={(e) => {
            const a = accounts.find((x) => x.name === e.target.value);
            if (a != null) onSelectAccount(a);
          }}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name} · {a.location} · {a.kind}
            </option>
          ))}
        </select>
      </div>
      {account != null && <DeploymentsForAccount account={account} />}
    </Section>
  );
}

function DeploymentsForAccount({ account }: { account: CognitiveAccount }): React.ReactElement {
  const subscriptionId = useAzureStore((s) => s.selectedSubscriptionId);
  const setLiveDeployment = useAzureStore((s) => s.setLiveDeployment);
  const liveDeployment = useAzureStore((s) => s.liveDeployment);
  const setModelOverride = useStudioStore((s) => s.setModelOverride);
  const setConsoleOpen = useAzureStore((s) => s.setConsoleOpen);

  const { data, isLoading, error } = useCognitiveDeployments(
    subscriptionId,
    account.resourceGroup,
    account.name
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  function useInStudio(d: CognitiveDeployment): void {
    if (subscriptionId == null) return;
    setPendingId(d.name);
    const ref: LiveDeploymentRef = {
      subscriptionId,
      resourceGroup: account.resourceGroup,
      accountName: account.name,
      deploymentName: d.name,
      label: `${d.name} · ${account.name}`,
      modelName: d.properties?.model?.name,
      modelVersion: d.properties?.model?.version,
    };
    setLiveDeployment(ref);
    setModelOverride(liveModelId(ref));
    // Close the console so the user lands back on the chat with the live
    // deployment selected.
    setConsoleOpen(false);
    setPendingId(null);
  }

  if (isLoading) return <Skeleton />;
  if (error != null) {
    return (
      <p className="text-xs text-rose-600">
        Couldn&apos;t list deployments: {(error as Error).message}
      </p>
    );
  }
  if (data == null || data.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No deployments on <code>{account.name}</code> yet. Use the deploy wizard below.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {data.map((d) => {
        const isActive = liveDeployment?.deploymentName === d.name && liveDeployment?.accountName === account.name;
        return (
          <li
            key={d.name}
            className={`rounded-lg border px-3 py-2 text-xs ${
              isActive ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {d.name}
                  {isActive && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {d.properties?.model?.format ?? '?'} ·{' '}
                  {d.properties?.model?.name ?? '?'}@{d.properties?.model?.version ?? '?'} ·{' '}
                  SKU {d.sku?.name ?? '?'}@{d.sku?.capacity ?? '?'}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {d.properties?.provisioningState ?? 'state unknown'}
                </p>
              </div>
              <button
                type="button"
                disabled={pendingId === d.name}
                onClick={() => useInStudio(d)}
                className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isActive ? 'In use ✓' : 'Use in studio →'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Skeleton(): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
    </div>
  );
}
