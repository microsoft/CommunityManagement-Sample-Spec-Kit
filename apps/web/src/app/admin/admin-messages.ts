/**
 * All user-facing strings for the Admin pages.
 * Constitution VIII: Extractable for i18n — no hardcoded strings in JSX.
 */

export const ADMIN_MESSAGES = {
  // Layout navigation
  panelTitle: "Admin Panel",
  navDashboard: "Dashboard",
  navTeacherRequests: "Teacher Requests",
  navConcessions: "Concessions",
  navPermissions: "Permissions",
  navRequests: "Requests",

  // Dashboard
  dashboardTitle: "Admin Dashboard",
  dashboardSubtitle: "Overview of pending actions and admin tools.",
  teacherRequests: "Teacher Requests",
  concessions: "Concessions",
  permissions: "Permissions",
  requests: "requests",
  pending: "pending",

  // Teacher applications
  loading: "Loading...",
  teacherApplications: "Teacher Applications",
  noPendingApplications: "No pending applications.",
  approve: "Approve",
  reject: "Reject",
  credentialsLabel: "Credentials:",

  // Concession applications
  concessionApplications: "Pending Concession Applications",

  // Permissions
  permissionGrants: "Permission Grants",
  noActiveGrants: "No active permission grants.",
  errorLoadingPermissions: "Error loading permissions",
  tryAgain: "Try again",
  revoke: "Revoke",
  tableUser: "User",
  tableRole: "Role",
  tableScope: "Scope",
  tableGranted: "Granted",
  tableActions: "Actions",

  // Requests page
  errorLoadingRequests: "Error loading requests",
} as const;
