let landingUser = null;
let businesses = [];
let selectedBusiness = null;
let products = [];

function getClient() {
  return window.supabaseClient || null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  const client = getClient();

  if (!session || !client) return;

  landingUser = session.user;

  const businessSelect = document.getElementById("businessSelect");
  const saveButton = document.getElementById("saveLanding");

  if (businessSelect) {
    businessSelect.addEventListener("change", async (event) => {
      await selectBusiness(event.target.value);
    });
  }

  if (saveButton) saveButton.addEventListener("click", saveLanding);

  await loadBusinesses();
});

async function loadBusinesses() {
  const client = getClient();
  const select = document.getElementById("businessSelect");
  if (!client || !select) return;

  select.innerHTML = '<option value="">جاري تحميل الأنشطة...</option>';

  const { data, error } = await client
    .from("businesses")
    .select("*")
    .eq("user_id", landingUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Businesses error:", error);
    select.innerHTML = '<option value="">تعذر تحميل الأنشطة</option>';
    show("landingMessage", "تعذر تحميل الأنشطة: " + (error.message || "خطأ غير معروف"), true);
    return;
  }

  businesses = data || [];

  if (!businesses.length) {
    select.innerHTML = '<option value="">لا توجد أنشطة مسجلة</option>';
    const list = document.getElementById("productList");
    if (list) list.innerHTML = '<div class="empty">أضف نشاطًا من صفحة إدارة النشاط أولًا.</div>';
    return;
  }

  select.innerHTML =
    '<option value="">اختر النشاط...</option>' +
    businesses.map(b =>
      `<option value="${escapeAttr(b.id)}">${escapeHtml(b.name || "نشاط بدون اسم")}</option>`
    ).join("");

  // With one business, select it automatically.
  if (businesses.length === 1) {
    select.value = businesses[0].id;
    await selectBusiness(businesses[0].id);
  }
}

async function selectBusiness(businessId) {
  selectedBusiness = businesses.find(b => b.id === businessId) || null;

  const info = document.getElementById("businessInfo");
  const productList = document.getElementById("productList");

  if (!selectedBusiness) {
    if (info) {
      info.hidden = true;
      info.textContent = "";
    }
    products = [];
    if (productList) productList.innerHTML = '<div class="empty">اختر نشاطًا أولًا.</div>';
    const saved = document.getElementById("landingList");
    if (saved) saved.innerHTML = '<div class="empty">اختر نشاطًا لعرض صفحاته.</div>';
    return;
  }

  if (info) {
    info.hidden = false;
    info.textContent = `النشاط المختار: ${selectedBusiness.name || "بدون اسم"}`;
  }

  await loadProducts(selectedBusiness.id);

  // Use the actual WhatsApp field from the business schema when available.
  const whatsapp = selectedBusiness.whatsapp || selectedBusiness.phone || "";
  const whatsappInput = document.getElementById("pageWhatsapp");
  if (whatsappInput && !whatsappInput.value.trim() && whatsapp) {
    whatsappInput.value = String(whatsapp);
  }

  await loadLandings();
}

async function loadProducts(businessId) {
  const client = getClient();
  const list = document.getElementById("productList");
  if (!client || !list) return;

  list.innerHTML = '<div class="loading">جاري تحميل المنتجات...</div>';

  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products error:", error);
    products = [];
    list.innerHTML = `<div class="empty">تعذر تحميل المنتجات: ${escapeHtml(error.message || "خطأ غير معروف")}</div>`;
    return;
  }

  products = data || [];

  if (!products.length) {
    list.innerHTML = '<div class="empty">لا توجد منتجات مرتبطة بهذا النشاط.</div>';
    return;
  }

  list.innerHTML = `
    <div class="product-list">
      ${products.map(product => `
        <label class="product-row">
          <input type="checkbox" class="product-check" value="${escapeAttr(product.id)}">
          <span class="product-info">
            <b>${escapeHtml(product.name || "منتج بدون اسم")}</b>
            <span class="product-meta">
              ${product.price != null ? `${escapeHtml(product.price)} ${escapeHtml(product.currency || "EGP")}` : ""}
            </span>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

async function saveLanding() {
  const client = getClient();

  if (!client) {
    show("landingMessage", "تعذر الاتصال بقاعدة البيانات.", true);
    return;
  }

  if (!selectedBusiness) {
    show("landingMessage", "اختر النشاط أولًا.", true);
    return;
  }

  const title = document.getElementById("pageTitle")?.value.trim() || "";
  const slug = document.getElementById("pageSlug")?.value.trim() || "";
  const headline = document.getElementById("pageHeadline")?.value.trim() || "";
  const description = document.getElementById("pageDescription")?.value.trim() || "";
  const imageUrl = document.getElementById("pageImage")?.value.trim() || "";
  const whatsapp = document.getElementById("pageWhatsapp")?.value.trim() || "";

  if (!title) {
    show("landingMessage", "اكتب عنوان الصفحة.", true);
    return;
  }

  const selectedProductIds = [...document.querySelectorAll(".product-check:checked")]
    .map(input => input.value);

  const payload = {
    business_id: selectedBusiness.id,
    title,
    subtitle: headline,
    page_type: "product_offer",
    content: {
      slug,
      description,
      image_url: imageUrl,
      whatsapp,
      product_ids: selectedProductIds
    },
    seo_title: title,
    seo_description: description,
    published: false
  };

  const { error } = await client.from("landing_pages").insert(payload);

  if (error) {
    console.error("Save landing error:", error);
    show("landingMessage", error.message || "تعذر حفظ الصفحة.", true);
    return;
  }

  show("landingMessage", "تم حفظ صفحة الهبوط وربط النشاط والمنتجات بنجاح.");

  ["pageTitle", "pageSlug", "pageHeadline", "pageDescription", "pageImage", "pageWhatsapp"]
    .forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });

  document.querySelectorAll(".product-check").forEach(input => {
    input.checked = false;
  });

  await loadLandings();
}

async function loadLandings() {
  const client = getClient();
  const list = document.getElementById("landingList");
  if (!client || !list) return;

  if (!selectedBusiness) {
    list.innerHTML = '<div class="empty">اختر نشاطًا لعرض صفحاته.</div>';
    return;
  }

  list.innerHTML = '<div class="loading">جاري تحميل الصفحات...</div>';

  const { data, error } = await client
    .from("landing_pages")
    .select("*")
    .eq("business_id", selectedBusiness.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Landing pages error:", error);
    list.innerHTML = `<div class="empty">تعذر تحميل الصفحات: ${escapeHtml(error.message || "خطأ غير معروف")}</div>`;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<div class="empty">لا توجد صفحات محفوظة لهذا النشاط.</div>';
    return;
  }

  list.innerHTML = data.map(page => `
    <div class="saved-item">
      <div>
        <b>${escapeHtml(page.title || page.subtitle || "صفحة")}</b>
        <small>${escapeHtml(page.page_type || "")}</small>
      </div>
      <button class="btn btn-danger" onclick="deleteLanding('${escapeAttr(page.id)}')">حذف</button>
    </div>
  `).join("");
}

async function deleteLanding(id) {
  const client = getClient();
  if (!client || !selectedBusiness) return;
  if (!confirm("حذف الصفحة؟")) return;

  const { error } = await client
    .from("landing_pages")
    .delete()
    .eq("id", id)
    .eq("business_id", selectedBusiness.id);

  if (error) {
    alert(error.message || "تعذر حذف الصفحة.");
    return;
  }

  await loadLandings();
}

function show(id, text, error = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = text;
  element.className = "message " + (error ? "error" : "success");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function escapeAttr(value) {
  return String(value ?? "").replace(/["'\\]/g, "");
}
