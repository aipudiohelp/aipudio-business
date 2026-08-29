document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();

  if (!session || !window.supabaseClient) return;

  const userId = session.user.id;
  const msg = document.getElementById("status");

  try {
    // businesses.user_id هو عمود مالك النشاط في قاعدة البيانات الحالية.
    const { count: businessCount, error: businessError } =
      await supabaseClient
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

    if (businessError) throw businessError;

    // نحتاج IDs الأنشطة لأن products و landing_pages مرتبطان بالنشاط،
    // وليس بالمستخدم مباشرة.
    const { data: businesses, error: businessesError } =
      await supabaseClient
        .from("businesses")
        .select("id")
        .eq("user_id", userId);

    if (businessesError) throw businessesError;

    const businessIds = (businesses || []).map((business) => business.id);

    let productCount = 0;
    let landingCount = 0;

    if (businessIds.length > 0) {
      const { count, error: productError } =
        await supabaseClient
          .from("products")
          .select("id", { count: "exact", head: true })
          .in("business_id", businessIds);

      if (productError) throw productError;
      productCount = count ?? 0;

      const { count: pagesCount, error: landingError } =
        await supabaseClient
          .from("landing_pages")
          .select("id", { count: "exact", head: true })
          .in("business_id", businessIds);

      if (landingError) throw landingError;
      landingCount = pagesCount ?? 0;
    }

    document.getElementById("businessCount").textContent =
      businessCount ?? 0;

    document.getElementById("productCount").textContent =
      productCount;

    document.getElementById("landingCount").textContent =
      landingCount;

    msg.textContent = "";
    msg.className = "message";

  } catch (error) {
    console.error("Dashboard error:", error);
    msg.textContent = error.message;
    msg.className = "message error";
  }
});
