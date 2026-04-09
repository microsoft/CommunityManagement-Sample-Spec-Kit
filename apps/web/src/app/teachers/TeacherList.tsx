import Link from "next/link";
import { searchTeachersCached } from "@/lib/teachers/profiles";
import { TEACHER_MESSAGES as msg } from "./teacher-messages";

interface Props {
  query?: string;
  specialty?: string;
  badge?: string;
}

export default async function TeacherList({ query, specialty, badge }: Props) {
  const { teachers } = await searchTeachersCached({ q: query, specialty, badge });

  if (teachers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{msg.noTeachersFound}</p>
        <p className="text-gray-500 mt-2">{msg.tryAdjusting}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {teachers.map((t) => {
        // searchTeachers SQL JOINs u.name as user_name
        const name = (t as unknown as { user_name?: string }).user_name ?? t.user_id;
        return (
          <Link
            key={t.id}
            href={`/teachers/${t.id}`}
            className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold text-lg text-gray-900">{name}</h2>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  t.badge_status === "verified"
                    ? "bg-green-100 text-green-800"
                    : t.badge_status === "expired"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {t.badge_status}
              </span>
            </div>
            {t.bio && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-2">{t.bio}</p>
            )}
            {t.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {t.specialties.map((s) => (
                  <span
                    key={s}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {t.aggregate_rating != null && (
              <p className="text-sm text-gray-500">
                ★ {parseFloat(String(t.aggregate_rating)).toFixed(1)} ({t.review_count})
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
