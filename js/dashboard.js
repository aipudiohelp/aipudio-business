document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();

  if (!session || !window.supabaseClient) return;

  const userId = session.user.id;
  const msg = document.getElementById("status");

  try {
    const [b, p, l] = await Promise.all([
      supabaseClient
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      supabaseClient
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      supabaseClient
        .from("landing_pages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
    ]);

    document.getElementById("businessCount").textContent = b.count ?? 0;
    document.getElementById("productCount").textContent = p.count ?? 0;
    document.getElementById("landingCount").textContent = l.count ?? 0;

    const err = b.error || p.error || l.error;

    if (err) {
      console.error(err);
      msg.textContent = err.message;
      msg.className = "message error";
      return;
    }

    msg.textContent = "";
    msg.className = "message";

  } catch (e) {
    console.error(e);
    msg.textContent = e.message;
    msg.className = "message error";
  }
});
