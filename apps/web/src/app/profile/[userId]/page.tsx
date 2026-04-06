import Image from "next/image";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles/service";
import { getServerSession } from "@/lib/auth/session";
import { PROFILE_MESSAGES as msg } from "../profile-messages";
import ProfileActions from "./ProfileActions";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const session = await getServerSession();
  const viewerId = session?.userId ?? null;

  const profile = await getProfile(userId, viewerId);
  if (!profile) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        {profile.avatarUrl && (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover"
            priority
            sizes="80px"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName ?? msg.anonymous}</h1>
          {profile.homeCityName && <p className="text-gray-600">{profile.homeCityName}</p>}
          {profile.defaultRole && (
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded capitalize">
              {profile.defaultRole}
            </span>
          )}
        </div>
      </div>

      {profile.bio && <p className="mt-4 text-gray-700">{profile.bio}</p>}

      {profile.socialLinks.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="text-sm font-medium text-gray-500">{msg.links}</h2>
          {profile.socialLinks.map((link: { platform: string; url: string }) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline text-sm capitalize"
            >
              {link.platform}
            </a>
          ))}
        </div>
      )}

      <ProfileActions userId={userId} initialRelationship={profile.relationship} />
    </div>
  );
}
