import TeacherCardSkeleton from "@/components/skeletons/TeacherCardSkeleton";

export default function TeachersLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <TeacherCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
