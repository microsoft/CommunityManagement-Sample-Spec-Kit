"use client";

import { useState } from "react";

const SPECIALTIES = [
  "washing_machines", "hand_to_hand", "therapeutic",
  "whips_and_pops", "icarian", "standing_acrobatics",
  "inversions", "flow", "other",
];

export default function TeacherApplicationPage() {
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [credentials, setCredentials] = useState([
    { certificationName: "", issuingBody: "", expiryDate: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function addCredential() {
    setCredentials((prev) => [...prev, { certificationName: "", issuingBody: "", expiryDate: "" }]);
  }

  function updateCredential(index: number, field: string, value: string) {
    setCredentials((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/teachers/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio: bio || undefined,
        specialties,
        city: city || undefined,
        credentials: credentials.filter((c) => c.certificationName && c.issuingBody).map((c) => ({
          certificationName: c.certificationName,
          issuingBody: c.issuingBody,
          expiryDate: c.expiryDate || undefined,
        })),
      }),
    });

    if (res.ok) {
      setResult("Application submitted! You'll be notified when it's reviewed.");
    } else {
      const data = await res.json();
      setResult(`Error: ${data.error ?? "Submission failed"}`);
    }
    setSubmitting(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Apply as Teacher</h1>

      {result && (
        <div
          className={`mb-4 p-3 rounded ${
            result.startsWith("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {result}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border rounded p-2"
            rows={4}
            placeholder="Tell us about your teaching experience..."
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Specialties</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1 rounded text-sm ${
                  specialties.includes(s)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder="Your city"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Credentials</label>
          {credentials.map((c, i) => (
            <div key={i} className="border rounded p-3 mb-2 space-y-2">
              <input
                type="text"
                placeholder="Certification name *"
                value={c.certificationName}
                onChange={(e) => updateCredential(i, "certificationName", e.target.value)}
                className="border rounded p-2 w-full"
              />
              <input
                type="text"
                placeholder="Issuing body *"
                value={c.issuingBody}
                onChange={(e) => updateCredential(i, "issuingBody", e.target.value)}
                className="border rounded p-2 w-full"
              />
              <input
                type="date"
                placeholder="Expiry date"
                value={c.expiryDate}
                onChange={(e) => updateCredential(i, "expiryDate", e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addCredential}
            className="text-blue-600 text-sm underline"
          >
            + Add another credential
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
