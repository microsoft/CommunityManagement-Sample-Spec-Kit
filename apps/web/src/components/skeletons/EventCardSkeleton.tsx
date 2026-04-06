import { Skeleton } from "@acroyoga/shared-ui";

export default function EventCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading…"
      className="border border-gray-200 rounded-lg p-4"
    >
      <Skeleton variant="rectangular" width="100%" height="160px" />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton variant="text" width="75%" height="1.25em" />
        <Skeleton variant="text" width="50%" height="1em" />
        <div className="flex gap-3 mt-1">
          <Skeleton variant="text" width="80px" height="0.875em" />
          <Skeleton variant="text" width="60px" height="0.875em" />
        </div>
      </div>
    </div>
  );
}
