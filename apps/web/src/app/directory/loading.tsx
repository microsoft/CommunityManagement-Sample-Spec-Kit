import DirectoryCardSkeleton from "@/components/skeletons/DirectoryCardSkeleton";

export default function DirectoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 10 }, (_, i) => (
          <DirectoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
