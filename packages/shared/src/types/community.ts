// Community & Social feature types — Spec 002

// Enums
export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'website' | 'tiktok' | 'twitter_x' | 'linkedin' | 'threads';
export type LinkVisibility = 'everyone' | 'followers' | 'friends' | 'hidden';
export type Relationship = 'self' | 'friend' | 'follower' | 'following' | 'none';
export type ThreadEntityType = 'event' | 'city' | 'country';
export type ReactionEmoji = 'thumbs_up' | 'heart' | 'fire' | 'laugh' | 'sad' | 'celebrate';
export type ReportReason = 'harassment' | 'spam' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type DefaultRole = 'base' | 'flyer' | 'hybrid';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Profile
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  homeCityId: string | null;
  defaultRole: DefaultRole | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  userId: string;
  platform: SocialPlatform;
  url: string;
  visibility: LinkVisibility;
}

export interface UserProfileSelf extends UserProfile {
  socialLinks: SocialLink[];
  homeCityName?: string | null;
}

export interface UserProfilePublic {
  userId: string;
  displayName: string | null;
  bio: string | null;
  homeCityName: string | null;
  defaultRole: DefaultRole | null;
  avatarUrl: string | null;
  socialLinks: SocialLink[];
  relationship: Relationship;
}

// Request / Response types
export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  homeCityId?: string;
  defaultRole?: DefaultRole;
  avatarUrl?: string;
  directoryVisible?: boolean;
}

export interface UpdateProfileResponse {
  profile: UserProfile;
}

export interface SetSocialLinksRequest {
  links: Array<{
    platform: SocialPlatform;
    url: string;
    visibility: LinkVisibility;
  }>;
}

export interface DetectCityRequest {
  lat: number;
  lon: number;
}

export interface DetectCityResponse {
  cityId: string | null;
  cityName: string | null;
  distance: number | null;
}

// Follow
export interface FollowEntry {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  relationship: Relationship;
  followedAt: string;
}

export interface CreateFollowRequest {
  followeeId: string;
}

export interface CreateFollowResponse {
  followed: boolean;
  becameFriends: boolean;
}

export interface UnfollowResponse {
  unfollowed: boolean;
}

// Block
export interface CreateBlockRequest {
  blockedId: string;
}

export interface CreateBlockResponse {
  blocked: boolean;
  severedFollows: number;
}

export interface BlockEntry {
  userId: string;
  displayName: string | null;
  blockedAt: string;
}

// Mute
export interface CreateMuteRequest {
  mutedId: string;
}

export interface MuteEntry {
  userId: string;
  displayName: string | null;
  mutedAt: string;
}

// Report
export interface CreateReportRequest {
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
}

export interface CreateReportResponse {
  reportId: string;
  status: ReportStatus;
}

export interface ReviewReportRequest {
  status: 'reviewed' | 'actioned' | 'dismissed';
}

export interface ReportEntry {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

// Thread / Message
export interface Thread {
  id: string;
  entityType: ThreadEntityType;
  entityId: string;
  isLocked: boolean;
  createdAt: string;
}

export interface EditHistoryEntry {
  content: string;
  editedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string | null;
  content: string;
  editHistory: EditHistoryEntry[];
  isPinned: boolean;
  isDeleted: boolean;
  reactions: ReactionSummary[];
  createdAt: string;
  editedAt: string | null;
}

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  reacted: boolean; // whether current viewer reacted
}

export interface CreateMessageRequest {
  content: string;
}

export interface EditMessageRequest {
  content: string;
}

export interface ToggleReactionRequest {
  emoji: ReactionEmoji;
}

export interface ToggleReactionResponse {
  action: 'added' | 'removed';
  emoji: ReactionEmoji;
  count: number;
}

export interface PinMessageRequest {
  pinned: boolean;
}

export interface LockThreadRequest {
  locked: boolean;
}

export interface ListMessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

export interface ThreadAccess {
  canRead: boolean;
  canPost: boolean;
  reason?: string;
}

// GDPR
export interface DataExportRow {
  id: string;
  userId: string;
  status: ExportStatus;
  fileUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RequestExportResponse {
  exportId: string;
  status: ExportStatus;
}

export interface ExportFileSchema {
  profile: UserProfile | null;
  socialLinks: SocialLink[];
  rsvps: unknown[];
  eventInterests: unknown[];
  credits: unknown[];
  messagesAuthored: unknown[];
  follows: { followers: string[]; following: string[] };
  blocks: string[];
  mutes: string[];
}

export interface DeleteAccountRequest {
  confirmation: string;
}

export interface DeleteAccountResponse {
  deleted: boolean;
}
