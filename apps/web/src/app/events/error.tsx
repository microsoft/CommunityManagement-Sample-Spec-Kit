"use client";

import { EmptyState } from "@acroyoga/shared-ui";

export default function EventsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert" className="min-h-[50vh] flex items-center justify-center">
      <EmptyState icon="📅" title="Could not load events. Please try again.">
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
        >
          Try again
        </button>
      </EmptyState>
    </div>
  );
}
