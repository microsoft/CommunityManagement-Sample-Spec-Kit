/**
 * All user-facing strings for the Community Directory page.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 */

export const DIRECTORY_MESSAGES = {
  pageTitle: "Community Directory",
  tabAll: "All members",
  tabFriends: "My Friends",
  tabFollowing: "Following",
  tabFollowers: "Followers",
  tabBlocked: "Blocked",
  sortName: "Name (A\u2013Z)",
  sortRecent: "Recently joined",
  sortNearMe: "Near me",
  verifiedTeacher: "\u2713 Verified Teacher",
  unnamedMember: "Unnamed member",
  completeProfile: "Complete profile \u2192",
  filterCity: "Filter by city",
  filterCountry: "Filter by country",
  filterContinent: "Filter by continent",
  teachersOnly: "Verified teachers only",
  clearAll: "Clear all filters",
  follow: "Follow",
  unfollow: "Unfollow",
  block: "Block",
  unblock: "Unblock",
  blockConfirm: "Block this user? This will remove any follow relationship.",
} as const;
