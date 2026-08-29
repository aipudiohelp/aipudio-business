document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !window.supabaseClient) return;
  const userId = session.user.id;
  const msg = document.getElementById("status");
  try {
    const [b,p,l] = await Promise.all([
      sb.from("businesses").select("id", {count:"exact",head:true}).eq("owner_id", userId),
      sb.from("products").select("id", {count:"exact",head:true}).eq("owner_id", userId),
      sb.from("landing_pages").select("id", {count:"exact",head:true}).eq("owner_id", userId)
    ]);
    document.getElementById("businessCount").textContent = b.count ?? 0;
    document.getElementById("productCount").textContent = p.count ?? 0;
    document.getElementById("landingCount").textContent = l.count ?? 0;
    const err = b.error || p.error || l.error;
    if (err) { msg.textContent = "راجع سياسات RLS وأسماء أعمدة المالك في الجداول."; msg.className="message error"; }
  } catch(e) { msg.textContent = e.message; msg.className="message error"; }
});