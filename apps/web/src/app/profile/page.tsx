"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SocialLinkForm {
  platform: "facebook" | "instagram" | "youtube" | "website";
  url: string;
  visibility: "everyone" | "followers" | "friends" | "hidden";
}

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [defaultRole, setDefaultRole] = useState<string>("hybrid");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [homeCityId, setHomeCityId] = useState<string | null>(null);
  const [homeCityName, setHomeCityName] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinkForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profiles/me")
      .then((r) => {
        if (r.status === 401) {
          setUnauthenticated(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setDisplayName(data.displayName ?? "");
        setBio(data.bio ?? "");
        setDefaultRole(data.defaultRole ?? "hybrid");
        setAvatarUrl(data.avatarUrl ?? "");
        setHomeCityId(data.homeCityId);
        setHomeCityName(data.homeCityName ?? null);
        setSocialLinks(
          data.socialLinks?.map((l: SocialLinkForm) => ({
            platform: l.platform,
            url: l.url,
            visibility: l.visibility,
          })) ?? [],
        );
        setLoading(false);
      })
      .catch(() => {
        setUnauthenticated(true);
        setLoading(false);
      });
  }, []);

  async function saveProfile() {
    setNameError(null);
    setSaveStatus("idle");
    if (!displayName.trim()) {
      setNameError("Display name is required");
      return;
    }
    setSaving(true);
    try {
      const res1 = await fetch("/api/profiles/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, defaultRole, avatarUrl, homeCityId }),
      });
      await fetch("/api/profiles/me/social-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: socialLinks }),
      });
      setSaveStatus(res1.ok ? "success" : "error");
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  }

  async function detectCity() {
    setDetecting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const res = await fetch("/api/profiles/me/detect-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      });
      const data = await res.json();
      if (data.cityId) {
        setHomeCityId(data.cityId);
        setHomeCityName(data.cityName);
      }
    } catch {
      // Geolocation denied or no city within range
    }
    setDetecting(false);
  }

  function updateLink(index: number, field: keyof SocialLinkForm, value: string) {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  }

  function addLink() {
    const used = new Set(socialLinks.map((l) => l.platform));
    const platforms = ["facebook", "instagram", "youtube", "website"] as const;
    const available = platforms.find((p) => !used.has(p));
    if (!available) return;
    setSocialLinks([...socialLinks, { platform: available, url: "", visibility: "everyone" }]);
  }

  function removeLink(index: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  }

  if (unauthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 text-lg">Please sign in to view your profile.</p>
        <Link href="/api/auth/signin" className="text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-4" /><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}</div></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {saveStatus === "success" && (
        <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-800">Profile saved successfully!</div>
      )}
      {saveStatus === "error" && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-800">Failed to save profile. Please try again.</div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input id="display-name" type="text" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setNameError(null); }} className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${nameError ? 'border-red-300' : 'border-gray-300'}`} maxLength={255} />
          {nameError && <p className="text-red-600 text-sm mt-1">{nameError}</p>}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} maxLength={2000} />
        </div>

        <div>
          <label htmlFor="default-role" className="block text-sm font-medium mb-1">Default Role</label>
          <select id="default-role" value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="base">Base</option>
            <option value="flyer">Flyer</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div>
          <label htmlFor="avatar-url" className="block text-sm font-medium mb-1">Avatar URL</label>
          <input id="avatar-url" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <p className="block text-sm font-medium mb-1">Home City</p>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">{homeCityName ?? "Not set"}</span>
            <button onClick={detectCity} disabled={detecting} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50" aria-label="Detect my city">
              {detecting ? "Detecting..." : "Auto-detect"}
            </button>
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium mb-2">Social Links</p>
          {socialLinks.map((link, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <select value={link.platform} onChange={(e) => updateLink(i, "platform", e.target.value)} className="border rounded px-2 py-1" aria-label="Platform">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <input type="url" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="URL" aria-label={`${link.platform} URL`} />
              <select value={link.visibility} onChange={(e) => updateLink(i, "visibility", e.target.value)} className="border rounded px-2 py-1" aria-label={`${link.platform} visibility`}>
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
                <option value="friends">Friends</option>
                <option value="hidden">Hidden</option>
              </select>
              <button onClick={() => removeLink(i)} className="text-red-500 hover:text-red-700" aria-label={`Remove ${link.platform} link`}>×</button>
            </div>
          ))}
          {socialLinks.length < 4 && (
            <button onClick={addLink} className="text-sm text-blue-600 hover:underline">+ Add link</button>
          )}
        </div>
      </div>

      <button onClick={saveProfile} disabled={saving} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
