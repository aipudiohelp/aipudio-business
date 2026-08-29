document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();

  if (!session || !window.supabaseClient) return;

  const userId = session.user.id;
  const msg = document.getElementById("status");

  try {
    // عدد الأنشطة الخاصة بالمستخدم
    const { count: businessCount, error: businessError } =
      await supabaseClient
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

    // جلب IDs الأنشطة الخاصة بالمستخدم
    const { data: businesses, error: businessesError } =
      await supabaseClient
        .from("businesses")
        .select("id")
        .eq("user_id", userId);

    if (businessError || businessesError) {
      throw businessError || businessesError;
    }

    const businessIds = (businesses || []).map((business) => business.id);

    let productCount = 0;

    // المنتجات مرتبطة بالنشاط عن طريق business_id
    if (businessIds.length > 0) {
      const { count, error: productError } =
        await supabaseClient
          .from("products")
          .select("id", { count: "exact", head: true })
          .in("business_id", businessIds);

      if (productError) {
        throw productError;
      }

      productCount = count ?? 0;
    }

    // عدد صفحات الهبوط الخاصة بالمستخدم
    const { count: landingCount, error: landingError } =
      await supabaseClient
        .from("landing_pages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

    if (landingError) {
      console.warn("Landing pages:", landingError);
    }

    document.getElementById("businessCount").textContent =
      businessCount ?? 0;

    document.getElementById("productCount").textContent =
      productCount;

    document.getElementById("landingCount").textContent =
      landingCount ?? 0;

    msg.textContent = "";
    msg.className = "message";

  } catch (error) {
    console.error("Dashboard error:", error);

    msg.textContent = error.message;
    msg.className = "message error";
  }
});
