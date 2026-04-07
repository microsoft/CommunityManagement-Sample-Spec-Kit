"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TEACHER_MESSAGES as msg } from "./teacher-messages";

export default function TeacherFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("query") ?? "";
  const badge = searchParams.get("badge") ?? "";
  const specialty = searchParams.get("specialty") ?? "";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/teachers?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="text"
        placeholder={msg.searchPlaceholder}
        defaultValue={query}
        onBlur={(e) => updateParams("query", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParams("query", e.currentTarget.value);
        }}
        className="border border-gray-300 px-3 py-2 rounded-md flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <select
        value={badge}
        onChange={(e) => updateParams("badge", e.target.value)}
        className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">{msg.allStatuses}</option>
        <option value="verified">{msg.verified}</option>
        <option value="expired">{msg.expired}</option>
        <option value="pending">{msg.pending}</option>
      </select>
      <input
        type="text"
        placeholder={msg.specialtyPlaceholder}
        defaultValue={specialty}
        onBlur={(e) => updateParams("specialty", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParams("specialty", e.currentTarget.value);
        }}
        className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}
