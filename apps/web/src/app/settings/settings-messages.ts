/**
 * All user-facing strings for the Settings pages.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 */

export const SETTINGS_MESSAGES = {
  // Overview
  title: "Settings",
  subtitle: "Manage your account preferences and privacy.",
  sectionAccount: "Account",
  sectionAccountDesc: "Manage data exports and account deletion.",
  sectionPrivacy: "Privacy",
  sectionPrivacyDesc: "Manage blocked and muted users.",
  sectionTeacher: "Teacher Application",
  sectionTeacherDesc: "Apply to become a verified teacher.",

  // Layout
  navOverview: "Overview",
  navAccount: "Account",
  navPrivacy: "Privacy",
  navTeacher: "Teacher Application",
  navPayment: "Payment Setup (coming soon)",
  loading: "Loading\u2026",
  signInRequired: "Please sign in to access settings.",
  signIn: "Sign In",

  // Account settings
  accountTitle: "Account Settings",
  dataExport: "Data Export",
  dataExportDesc: "Export all your data as a JSON file. Download links expire after 7 days.",
  exporting: "Exporting...",
  exportMyData: "Export My Data",
  exportHistory: "Export History",
  download: "Download",
  deleteAccount: "Delete Account",
  deleteAccountDesc: "This action is permanent. All your personal data will be removed. Anonymised aggregate data (RSVP counts, etc.) will be retained. Messages you posted will be replaced with \"[deleted]\".",
  deleteConfirmPlaceholder: "Type \"DELETE\" to confirm",
  deleting: "Deleting...",
  deleteMyAccount: "Delete My Account",

  // Privacy settings
  privacyTitle: "Privacy Settings",
  communityDirectory: "Community Directory",
  directoryToggle: "Show me in the community directory",
  directoryDesc: "When enabled, other members can find your profile in the community directory. Blocked users will never see your profile.",
  blockedUsers: (count: number) => `Blocked Users (${count})`,
  noBlockedUsers: "No blocked users.",
  unblock: "Unblock",
  mutedUsers: (count: number) => `Muted Users (${count})`,
  noMutedUsers: "No muted users.",
  unmute: "Unmute",
  manageSocialLinks: "Manage social link visibility \u2192",

  // Profile completeness
  profileCompleteness: "Profile Completeness",
  profileCompletenessDesc: "Complete your profile to help others find and recognize you in the community.",

  // Teacher application
  applyAsTeacher: "Apply as Teacher",
  bio: "Bio",
  bioPlaceholder: "Tell us about your teaching experience...",
  specialtiesLabel: "Specialties",
  city: "City",
  cityPlaceholder: "Your city",
  credentials: "Credentials",
  certNamePlaceholder: "Certification name *",
  issuingBodyPlaceholder: "Issuing body *",
  expiryDatePlaceholder: "Expiry date",
  addCredential: "+ Add another credential",
  submitting: "Submitting...",
  submitApplication: "Submit Application",
  applicationSubmitted: "Application submitted! You'll be notified when it's reviewed.",
} as const;
