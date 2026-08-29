document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !window.supabaseClient) return;

  const userId = session.user.id;
  const client = window.supabaseClient;
  const msg = document.getElementById("status");

  const setCount = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? 0);
  };

  try {
    // businesses are owned directly by the authenticated user through user_id.
    const { data: businesses, error: businessError } = await client
      .from("businesses")
      .select("id")
      .eq("user_id", userId);

    if (businessError) {
      console.error("Businesses error:", businessError);
      throw businessError;
    }

    const businessIds = (businesses || [])
      .map(row => row.id)
      .filter(Boolean);

    setCount("businessCount", businessIds.length);

    // Products belong to businesses through products.business_id.
    if (businessIds.length > 0) {
      const { count: productCount, error: productError } = await client
        .from("products")
        .select("id", { count: "exact", head: true })
        .in("business_id", businessIds);

      if (productError) {
        console.error("Products error:", productError);
        throw productError;
      }

      setCount("productCount", productCount ?? 0);

      // Landing pages also belong to businesses through business_id.
      const { count: landingCount, error: landingError } = await client
        .from("landing_pages")
        .select("id", { count: "exact", head: true })
        .in("business_id", businessIds);

      if (landingError) {
        console.error("Landing pages error:", landingError);
        // Keep the business/product counts visible even if landing-page RLS is different.
        setCount("landingCount", 0);
        if (msg) {
          msg.textContent = "تعذر تحميل عدد صفحات الهبوط: " +
            (landingError.message || "خطأ غير معروف");
          msg.className = "message error";
        }
        return;
      }

      setCount("landingCount", landingCount ?? 0);
    } else {
      setCount("productCount", 0);
      setCount("landingCount", 0);
    }

    if (msg) {
      msg.textContent = "";
      msg.className = "message";
    }
  } catch (error) {
    console.error("Dashboard error:", error);
    if (msg) {
      msg.textContent = "تعذر تحميل إحصائيات الحساب: " +
        (error?.message || "خطأ غير معروف");
      msg.className = "message error";
    }
  }
});
