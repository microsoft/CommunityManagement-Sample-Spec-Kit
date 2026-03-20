const endpoints = ["/api/events", "/api/teachers", "/api/dev/mock-user"];
for (const ep of endpoints) {
  const r = await fetch("http://localhost:3000" + ep);
  const data = await r.json();
  if (ep === "/api/events") {
    console.log("EVENTS:", data.total, "items. Titles:", data.events.map(function(e){ return e.title }).join(", "));
  } else if (ep === "/api/teachers") {
    console.log("TEACHERS:", data.total, "items. IDs:", data.teachers.map(function(t){ return t.user_id.slice(-2) }).join(", "));
  } else {
    console.log("MOCK USERS:", data.availableUsers ? data.availableUsers.length : "N/A", "available");
    if (data.availableUsers) data.availableUsers.forEach(function(u){ console.log("  -", u.name, "(" + u.displayRole + ")") });
  }
}
