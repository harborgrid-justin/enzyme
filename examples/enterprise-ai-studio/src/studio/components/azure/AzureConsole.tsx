import { useAzureStore } from '../../azure/store';
import { AzureStatusBanner } from './AzureStatusBanner';
import { SubscriptionPicker } from './SubscriptionPicker';
import { BudgetMeter } from './BudgetMeter';
import { FoundryDeploymentList } from './FoundryDeploymentList';
import { DeployModelWizard } from './DeployModelWizard';

/**
 * Right-rail Azure console — opens when the user clicks "Azure" in the
 * top toolbar. Replaces the standard settings/usage rail with:
 *
 *   - Status banner (CLI installed? logged in? on Windows?)
 *   - Subscription picker
 *   - $45k budget meter with June-5 expiry
 *   - Existing Foundry / Cognitive Services deployments → "Use in studio"
 *   - Deploy wizard (live `az cognitiveservices account deployment create`)
 */
export function AzureConsole(): React.ReactElement {
  const close = useAzureStore((s) => s.setConsoleOpen);

  return (
    <aside className="hidden w-96 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-3 lg:block">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">⬢ Azure console</h2>
          <p className="text-[11px] text-slate-500">
            Foundry deployments &amp; live model wiring
          </p>
        </div>
        <button
          type="button"
          onClick={() => close(false)}
          className="h-7 w-7 rounded text-slate-500 hover:bg-slate-100"
          aria-label="Close Azure console"
        >
          ✕
        </button>
      </header>

      <div className="space-y-3">
        <AzureStatusBanner />
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <SubscriptionPicker />
        </section>
        <BudgetMeter />
        <FoundryDeploymentList />
        <DeployModelWizard />

        <details className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Prerequisites checklist
          </summary>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li>✓ Windows 10/11 with PowerShell 7 installed</li>
            <li>✓ Azure CLI ≥ 2.60 (<code>winget install -e --id Microsoft.AzureCLI</code>)</li>
            <li>✓ Signed in: <code>az login</code> (interactive, opens browser)</li>
            <li>✓ Default subscription set: <code>az account set --subscription &lt;id&gt;</code></li>
            <li>✓ <code>az extension add --name ml</code> if you want Foundry hub listings</li>
          </ul>
        </details>
      </div>
    </aside>
  );
}
