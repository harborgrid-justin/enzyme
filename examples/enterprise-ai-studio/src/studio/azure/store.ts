/**
 * Azure UI state — picked subscription, RG, region, and which live
 * deployment (if any) the studio's chat composer should route through.
 *
 * Live-deployment selection deliberately lives outside the existing
 * `useStudioStore` so the chat-completion code can route on a "azure-live:*"
 * model id without growing the studio store's surface.
 */
import { create } from 'zustand';

export interface LiveDeploymentRef {
  subscriptionId: string;
  resourceGroup: string;
  accountName: string;
  deploymentName: string;
  /** Display label shown in the studio's model picker. */
  label: string;
  modelName?: string;
  modelVersion?: string;
  apiVersion?: string;
}

export interface AzureStoreState {
  /** Subscription id selected in the Azure Console. */
  selectedSubscriptionId: string | null;
  /** RG selected for the deploy wizard. */
  selectedResourceGroup: string | null;
  /** Azure region selected for the deploy wizard. */
  selectedLocation: string | null;
  /** Cognitive Services account selected for the deploy wizard. */
  selectedAccountName: string | null;
  /** Whether the Azure Console is open in the right pane. */
  isConsoleOpen: boolean;

  /** Currently active live deployment for chat (if any). Picker appends this. */
  liveDeployment: LiveDeploymentRef | null;

  setSubscription: (id: string | null) => void;
  setResourceGroup: (name: string | null) => void;
  setLocation: (name: string | null) => void;
  setAccount: (name: string | null) => void;
  setConsoleOpen: (open: boolean) => void;
  setLiveDeployment: (ref: LiveDeploymentRef | null) => void;
}

export const useAzureStore = create<AzureStoreState>((set) => ({
  selectedSubscriptionId: null,
  selectedResourceGroup: null,
  selectedLocation: null,
  selectedAccountName: null,
  isConsoleOpen: false,
  liveDeployment: null,

  setSubscription: (id) =>
    set({
      selectedSubscriptionId: id,
      // Clear downstream picks when subscription changes — different RGs/accounts.
      selectedResourceGroup: null,
      selectedAccountName: null,
    }),
  setResourceGroup: (name) => set({ selectedResourceGroup: name }),
  setLocation: (name) => set({ selectedLocation: name }),
  setAccount: (name) => set({ selectedAccountName: name }),
  setConsoleOpen: (open) => set({ isConsoleOpen: open }),
  setLiveDeployment: (ref) => set({ liveDeployment: ref }),
}));

/** Format the model id used by the chat composer for a live deployment. */
export function liveModelId(ref: LiveDeploymentRef): string {
  return `azure-live:${ref.accountName}:${ref.deploymentName}`;
}

/** Parse a "azure-live:account:deployment" model id back to its parts. */
export function parseLiveModelId(
  id: string
): { accountName: string; deploymentName: string } | null {
  if (!id.startsWith('azure-live:')) return null;
  const [, account, deployment] = id.split(':');
  if (account == null || deployment == null) return null;
  return { accountName: account, deploymentName: deployment };
}
