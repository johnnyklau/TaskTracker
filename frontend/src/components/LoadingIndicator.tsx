import { useState, useEffect } from 'react';
import { SLOW_LOAD_THRESHOLD_MS } from './canvasConstants';

export function LoadingIndicator() {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setShowSlowMessage(true),
      SLOW_LOAD_THRESHOLD_MS
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full min-h-140 w-full flex-col items-center justify-center gap-4 bg-canvas">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-surface-edge border-t-ink-soft"
        role="status"
        aria-label="Loading"
      />
      {showSlowMessage && (
        <p className="max-w-xs text-center text-sm text-ink-soft">
          Waking up the server — this can take up to a minute on the first load.
        </p>
      )}
    </div>
  );
}
