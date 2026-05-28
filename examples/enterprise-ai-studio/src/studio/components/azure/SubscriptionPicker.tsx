import { useEffect } from 'react';
import { useSubscriptions } from '../../azure/api';
import { useAzureStore } from '../../azure/store';

/**
 * Subscription dropdown. Auto-selects the default subscription on first
 * load if the user hasn't picked one yet, so the rest of the console
 * (deployments, budget) has something to query immediately.
 */
export function SubscriptionPicker(): React.ReactElement {
  const { data, isLoading, error } = useSubscriptions();
  const selected = useAzureStore((s) => s.selectedSubscriptionId);
  const setSubscription = useAzureStore((s) => s.setSubscription);

  useEffect(() => {
    if (selected == null && data != null && data.length > 0) {
      const defaultSub = data.find((s) => s.isDefault) ?? data[0];
      if (defaultSub) setSubscription(defaultSub.id);
    }
  }, [data, selected, setSubscription]);

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Subscription
      </label>
      {isLoading ? (
        <SkeletonInput />
      ) : error != null ? (
        <p className="text-xs text-rose-600">
          Couldn&apos;t list subscriptions ({(error as Error).message}).
        </p>
      ) : (
        <select
          value={selected ?? ''}
          onChange={(e) => setSubscription(e.target.value || null)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {(data ?? []).length === 0 && <option value="">No subscriptions visible</option>}
          {(data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isDefault ? ' · default' : ''}
            </option>
          ))}
        </select>
      )}
      {selected != null && (
        <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{selected}</p>
      )}
    </div>
  );
}

function SkeletonInput(): React.ReactElement {
  return <div className="h-8 w-full animate-pulse rounded-md bg-slate-200" />;
}
