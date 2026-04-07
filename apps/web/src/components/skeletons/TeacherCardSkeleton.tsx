import { Skeleton } from "@acroyoga/shared-ui";

export default function TeacherCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading…"
      className="border border-gray-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width="48px" height="48px" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton variant="text" width="60%" height="1.25em" />
          <Skeleton variant="text" lines={2} />
        </div>
      </div>
      <div className="mt-3">
        <Skeleton variant="text" width="80px" height="1.5em" />
      </div>
    </div>
  );
}
