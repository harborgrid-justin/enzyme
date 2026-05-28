import { useState } from 'react';

/** Throws on demand to demonstrate enzyme's ErrorBoundary recovery. */
export function ErrorProne(): React.ReactElement {
  const [boom, setBoom] = useState(false);
  if (boom) {
    throw new Error('Demo: a warehouse widget crashed on purpose.');
  }
  return (
    <button
      type="button"
      onClick={() => setBoom(true)}
      className="danger-button"
    >
      Trigger a render error
    </button>
  );
}
