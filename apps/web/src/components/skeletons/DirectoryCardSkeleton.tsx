import { Skeleton } from "@acroyoga/shared-ui";

export default function DirectoryCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading…"
      className="border border-gray-200 rounded-lg p-4 flex items-center gap-4"
    >
      <Skeleton variant="circular" width="56px" height="56px" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton variant="text" width="50%" height="1.125em" />
        <Skeleton variant="text" width="35%" height="0.875em" />
        <div className="flex gap-2 mt-1">
          <Skeleton variant="circular" width="24px" height="24px" />
          <Skeleton variant="circular" width="24px" height="24px" />
        </div>
      </div>
    </div>
  );
}
