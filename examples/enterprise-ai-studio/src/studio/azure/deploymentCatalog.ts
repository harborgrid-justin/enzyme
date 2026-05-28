/**
 * Curated "starter" deployment templates for the wizard.
 *
 * These prefill the deploy form with sensible defaults. The wizard's source
 * of truth for what's *actually* deployable on a given resource is the live
 * `az cognitiveservices account list-models` response (see useDeployableModels)
 * — these templates are a UX accelerator, not a contract.
 *
 * Naming maps to Azure Foundry's `--model-format <publisher>` +
 * `--model-name <id>` convention. The default capacity / SKU choices target
 * the lowest-cost path that still works for a "demo it for stakeholders" flow
 * without burning through the $45k cap.
 */

export interface DeploymentTemplate {
  /** Slug used as the React key + the URL hash for "share this preset". */
  id: string;
  /** Display name in the wizard. */
  label: string;
  /** One-line tagline. */
  blurb: string;
  /** `--model-name` value for `az cognitiveservices account deployment create`. */
  modelName: string;
  /** `--model-version` value. */
  modelVersion: string;
  /** `--model-format` value (publisher: OpenAI, DeepSeek, Meta, Microsoft, Mistral, …). */
  modelFormat: string;
  /** Default SKU name (GlobalStandard / Standard / DataZoneStandard). */
  skuName: string;
  /** Default capacity (TPM in thousands for serverless, units for managed compute). */
  skuCapacity: number;
  /** Suggested deployment name — wizard pre-fills the input with this. */
  defaultDeploymentName: string;
  /** Rough $/hour estimate used to render burndown projections. */
  estimatedHourlyUsd: number;
  /** Which providers in the studio's model picker this maps to. */
  studioProviderHint: 'microsoft' | 'openai' | 'huggingface';
  /** Flagged the recommended default ("Deploy this one first"). */
  recommended?: boolean;
}

export const DEPLOYMENT_TEMPLATES: DeploymentTemplate[] = [
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    blurb: 'Frontier open-weights agentic · 1M context · best-in-class for code',
    modelName: 'DeepSeek-V3', // Conservative — your tenant may also expose V3.1/V4 variants
    modelVersion: '1',
    modelFormat: 'DeepSeek',
    skuName: 'GlobalStandard',
    skuCapacity: 10,
    defaultDeploymentName: 'deepseek-v4-pro-demo',
    estimatedHourlyUsd: 1.8,
    studioProviderHint: 'microsoft',
    recommended: true,
  },
  {
    id: 'phi-4',
    label: 'Phi-4',
    blurb: "Microsoft's frontier small model · cheapest · great for routing",
    modelName: 'Phi-4',
    modelVersion: '1',
    modelFormat: 'Microsoft',
    skuName: 'GlobalStandard',
    skuCapacity: 10,
    defaultDeploymentName: 'phi-4-demo',
    estimatedHourlyUsd: 0.2,
    studioProviderHint: 'microsoft',
  },
  {
    id: 'llama-4-scout',
    label: 'Llama 4 Scout',
    blurb: 'Open weights · 10M token context · long-document analysis',
    modelName: 'Llama-4-Scout-17B-16E-Instruct',
    modelVersion: '1',
    modelFormat: 'Meta',
    skuName: 'GlobalStandard',
    skuCapacity: 10,
    defaultDeploymentName: 'llama-4-scout-demo',
    estimatedHourlyUsd: 1.2,
    studioProviderHint: 'microsoft',
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini (Azure)',
    blurb: 'OpenAI on Azure · enterprise tenancy + auditable',
    modelName: 'gpt-5-mini',
    modelVersion: '2025-08-07',
    modelFormat: 'OpenAI',
    skuName: 'GlobalStandard',
    skuCapacity: 10,
    defaultDeploymentName: 'gpt-5-mini-demo',
    estimatedHourlyUsd: 0.5,
    studioProviderHint: 'openai',
  },
];

export const DEFAULT_TEMPLATE = DEPLOYMENT_TEMPLATES.find((t) => t.recommended === true) ?? DEPLOYMENT_TEMPLATES[0];

export const SKU_CHOICES = [
  { value: 'GlobalStandard', label: 'GlobalStandard (pay-as-you-go, geo-routed)' },
  { value: 'Standard', label: 'Standard (regional)' },
  { value: 'DataZoneStandard', label: 'DataZoneStandard (data-residency, geo-zone)' },
  { value: 'ProvisionedManaged', label: 'ProvisionedManaged (reserved capacity)' },
];

/** Estimate "days of runway" remaining given hourly burn + remaining budget. */
export function projectRunwayDays(remainingUsd: number, hourlyUsd: number): number {
  if (hourlyUsd <= 0) return Number.POSITIVE_INFINITY;
  return remainingUsd / (hourlyUsd * 24);
}
