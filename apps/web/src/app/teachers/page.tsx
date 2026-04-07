import { Suspense } from "react";
import TeacherFilters from "./TeacherFilters";
import TeacherList from "./TeacherList";
import TeacherCardSkeleton from "@/components/skeletons/TeacherCardSkeleton";
import { TEACHER_MESSAGES as msg } from "./teacher-messages";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ query?: string; specialty?: string; badge?: string }>;
}

export default async function TeachersPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{msg.title}</h1>

      <TeacherFilters />

      <Suspense
        key={`${params.query ?? ""}-${params.specialty ?? ""}-${params.badge ?? ""}`}
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <TeacherCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <TeacherList
          query={params.query}
          specialty={params.specialty}
          badge={params.badge}
        />
      </Suspense>
    </div>
  );
}
