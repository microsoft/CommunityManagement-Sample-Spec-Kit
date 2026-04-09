import NotificationPreferences from "@/components/NotificationPreferences";

export default function NotificationsSettingsPage() {
  return (
    <div>
      <h1 style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", borderWidth: 0 }}>
        Notification Preferences
      </h1>
      <NotificationPreferences />
    </div>
  );
}
