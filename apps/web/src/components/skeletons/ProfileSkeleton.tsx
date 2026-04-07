import { Skeleton } from "@acroyoga/shared-ui";

export default function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading…"
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="flex flex-col items-center gap-4 mb-8">
        <Skeleton variant="circular" width="120px" height="120px" />
        <Skeleton variant="text" width="200px" height="1.5em" />
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="flex gap-3 mt-6 justify-center">
        <Skeleton variant="circular" width="32px" height="32px" />
        <Skeleton variant="circular" width="32px" height="32px" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
    </div>
  );
}
