/**
 * Domain types for the Azure bridge. Each one mirrors the shape returned
 * by the corresponding `az` command (translated to camelCase where the CLI
 * surface uses snake_case).
 */

export interface AzureStatus {
  installed: boolean;
  cliVersion?: string;
  extensions?: string[];
  platform: NodeJS.Platform;
  isWindows: boolean;
  loggedIn: boolean;
  account?: AzureAccount | { error: string } | null;
  budget: { capUsd: number; expiresIso: string };
  error?: string;
}

export interface AzureAccount {
  /** Subscription id currently selected by `az account show`. */
  id: string;
  name: string;
  state: string;
  tenantId: string;
  user?: { name?: string; type?: string };
  isDefault: boolean;
}

export interface AzureSubscription extends AzureAccount {}

export interface ResourceGroup {
  id: string;
  name: string;
  location: string;
  properties?: { provisioningState?: string };
  tags?: Record<string, string>;
}

export interface AzureLocation {
  id: string;
  name: string;
  displayName: string;
  regionalDisplayName: string;
  metadata?: { regionCategory?: string; regionType?: string };
}

export interface CognitiveAccount {
  id: string;
  name: string;
  location: string;
  /** The Azure resource group derived from the id. Computed client-side. */
  resourceGroup: string;
  kind: string;
  sku?: { name: string; tier?: string };
  properties?: {
    endpoint?: string;
    customSubDomainName?: string;
    provisioningState?: string;
  };
}

export interface CognitiveDeployment {
  id?: string;
  name: string;
  /** Containing account name — populated client-side. */
  accountName?: string;
  resourceGroup?: string;
  subscriptionId?: string;
  sku?: { name: string; capacity?: number };
  properties?: {
    model?: { name: string; version: string; format?: string };
    provisioningState?: string;
    capabilities?: Record<string, string | boolean>;
    rateLimits?: Array<{ key: string; renewalPeriod: number; count: number }>;
  };
}

/** Shape returned by `az cognitiveservices account list-models`. */
export interface DeployableModel {
  format?: string;
  name?: string;
  version?: string;
  /** Older az output uses `model.format` etc. — the bridge normalizes. */
  model?: { name: string; version: string; format?: string };
  kind?: string;
  skuName?: string;
  capabilities?: Record<string, string | boolean>;
}

export interface BudgetSummary {
  totalUsd: number;
  lineItems: number;
  sinceIso: string;
  capUsd: number;
  expiresIso: string;
  daysRemaining: number;
  remainingUsd: number;
  utilization: number;
  error?: string;
}

export interface FoundryHub {
  id: string;
  name: string;
  location: string;
  kind: string;
  resourceGroup?: string;
}

export interface DeployRequest {
  subscriptionId: string;
  resourceGroup: string;
  accountName: string;
  deploymentName: string;
  modelName: string;
  modelVersion: string;
  modelFormat: string;
  skuName: string;
  skuCapacity: number;
}
