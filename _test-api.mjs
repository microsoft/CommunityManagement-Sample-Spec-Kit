const endpoints = ["/api/events", "/api/teachers", "/api/venues", "/", "/events", "/teachers", "/profile"];
for (const ep of endpoints) {
  const r = await fetch("http://localhost:3000" + ep);
  const t = await r.text();
  const preview = ep.startsWith("/api") ? t.substring(0, 200) : t.length + " bytes";
  console.log(ep, "STATUS:", r.status, preview);
}
