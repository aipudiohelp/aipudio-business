document.addEventListener("DOMContentLoaded", async () => {
  try {
    // التأكد من وجود Supabase
    const supabase = window.supabaseClient;

    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    // التأكد من تسجيل الدخول
    const session = await requireAuth();

    if (!session || !session.user) {
      return;
    }

    const userId = session.user.id;

    const status = document.getElementById("status");

    // جلب الإحصائيات بالتوازي
    const [
      businessResult,
      productResult,
      landingResult
    ] = await Promise.all([
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId),

      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId),

      supabase
        .from("landing_pages")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
    ]);

    // فحص الأخطاء
    const errors = [
      businessResult.error,
      productResult.error,
      landingResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error("Dashboard Supabase errors:", errors);

      if (status) {
        status.textContent =
          errors.map(error => error.message).join(" | ");

        status.className = "message error";
      }

      return;
    }

    // عرض الأعداد
    const businessCount =
      document.getElementById("businessCount");

    const productCount =
      document.getElementById("productCount");

    const landingCount =
      document.getElementById("landingCount");

    if (businessCount) {
      businessCount.textContent =
        businessResult.count ?? 0;
    }

    if (productCount) {
      productCount.textContent =
        productResult.count ?? 0;
    }

    if (landingCount) {
      landingCount.textContent =
        landingResult.count ?? 0;
    }

    // رسالة نجاح اختيارية
    if (status) {
      status.textContent = "";
      status.className = "message";
    }

  } catch (error) {
    console.error("Dashboard error:", error);

    const status = document.getElementById("status");

    if (status) {
      status.textContent = error.message;
      status.className = "message error";
    }
  }
});
