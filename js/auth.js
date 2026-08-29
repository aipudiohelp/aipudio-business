const sb = window.supabaseClient;

async function requireAuth() {
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "login.html"; return null; }
  return session;
}

async function ensureProfile(user) {
  if (!sb || !user) return;
  const { data } = await sb.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!data) {
    await sb.from("profiles").insert({ id: user.id, email: user.email });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const google = document.getElementById("googleLogin");
  if (google) {
    google.addEventListener("click", async () => {
      const msg = document.getElementById("authMessage");
      if (!sb) { msg.textContent = "أكمل إعداد مفتاح Supabase داخل js/config.js أولًا."; msg.className="message error"; return; }
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/dashboard.html" }
      });
      if (error) { msg.textContent = error.message; msg.className="message error"; }
    });
  }

  const logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    window.location.href = "index.html";
  });

  if (document.body.contains(document.getElementById("userEmail"))) {
    const session = await requireAuth();
    if (session) {
      await ensureProfile(session.user);
      document.getElementById("userEmail").textContent = session.user.email || "";
    }
  }
});