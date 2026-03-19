"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Certification {
  id: string;
  certification_name: string;
  issuing_body: string;
  status: string;
  expiry_date: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  event_title: string;
  created_at: string;
}

interface TeacherDetail {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  badge_status: string;
  aggregate_rating: number | null;
  review_count: number;
  city: string | null;
  certifications: Certification[];
}

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<TeacherDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teachers/${id}`).then((r) => {
        if (!r.ok) throw new Error("Teacher not found");
        return r.json();
      }),
      fetch(`/api/teachers/${id}/reviews`).then((r) => r.json()),
    ])
      .then(([profileData, reviewData]) => {
        setProfile(profileData);
        setReviews(reviewData.reviews ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-6" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">{error ?? "Teacher not found"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/teachers"
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-6 inline-block"
      >
        ← Back to Teachers
      </Link>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          {profile.city && <p className="text-gray-500">{profile.city}</p>}
        </div>
        <div className="text-right">
          <span
            className={`text-sm px-3 py-1 rounded ${
              profile.badge_status === "verified"
                ? "bg-green-100 text-green-800"
                : profile.badge_status === "expired"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {profile.badge_status === "verified" ? "✓ Verified Teacher" : profile.badge_status}
          </span>
          {profile.aggregate_rating && (
            <p className="text-lg mt-2">
              ★ {profile.aggregate_rating.toFixed(1)}{" "}
              <span className="text-sm text-gray-500">({profile.review_count} reviews)</span>
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">About</h2>
          <p className="text-gray-700">{profile.bio}</p>
        </section>
      )}

      {profile.specialties.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {profile.specialties.map((s) => (
              <span key={s} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {profile.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Certifications</h2>
          <div className="space-y-2">
            {profile.certifications.map((c) => (
              <div key={c.id} className="border rounded p-3 flex justify-between">
                <div>
                  <p className="font-medium">{c.certification_name}</p>
                  <p className="text-sm text-gray-500">{c.issuing_body}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      c.status === "verified"
                        ? "bg-green-100 text-green-800"
                        : c.status === "expired"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.expiry_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      Expires: {new Date(c.expiry_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.reviewer_name}</span>
                  <span className="text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{r.event_title}</p>
                <p className="mt-1">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                {r.comment && <p className="text-gray-700 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
