import { useState } from 'react';

/** Throws on demand to demonstrate enzyme's ErrorBoundary recovery. */
export function ErrorProne(): React.ReactElement {
  const [boom, setBoom] = useState(false);
  if (boom) {
    throw new Error('Demo: a chat widget crashed on purpose.');
  }
  return (
    <button
      type="button"
      onClick={() => setBoom(true)}
      className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
    >
      Trigger a render error
    </button>
  );
}
