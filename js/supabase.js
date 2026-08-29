(() => {
  const cfg = window.AIPUDIO_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("PASTE_")) {
    console.warn("Supabase configuration is incomplete. Update js/config.js.");
    window.supabaseClient = null;
    return;
  }
  window.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
})();