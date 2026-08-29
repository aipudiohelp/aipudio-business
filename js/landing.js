let landingUser = null;
let businesses = [];
let selectedBusiness = null;
let products = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !window.sb) return;

  landingUser = session.user;

  document.getElementById("businessSelect").addEventListener("change", async (e) => {
    await selectBusiness(e.target.value);
  });

  document.getElementById("saveLanding").addEventListener("click", saveLanding);

  await loadBusinesses();
  await loadLandings();
});

async function loadBusinesses() {
  const select = document.getElementById("businessSelect");
  select.innerHTML = '<option value="">جاري تحميل الأنشطة...</option>';

  const { data, error } = await sb
    .from("businesses")
    .select("*")
    .eq("owner_id", landingUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    select.innerHTML = '<option value="">تعذر تحميل الأنشطة</option>';
    show("landingMessage", error.message, true);
    return;
  }

  businesses = data || [];

  if (!businesses.length) {
    select.innerHTML = '<option value="">لا توجد أنشطة مسجلة</option>';
    document.getElementById("productList").innerHTML =
      '<div class="empty">أضف نشاطًا من صفحة إدارة النشاط أولًا.</div>';
    return;
  }

  select.innerHTML =
    '<option value="">اختر النشاط...</option>' +
    businesses.map(b =>
      `<option value="${escapeAttr(b.id)}">${escapeHtml(b.name || b.title || "نشاط بدون اسم")}</option>`
    ).join("");

  // إذا كان هناك نشاط واحد، يتم اختياره تلقائيًا.
  if (businesses.length === 1) {
    select.value = businesses[0].id;
    await selectBusiness(businesses[0].id);
  }
}

async function selectBusiness(businessId) {
  selectedBusiness = businesses.find(b => b.id === businessId) || null;

  const info = document.getElementById("businessInfo");

  if (!selectedBusiness) {
    info.hidden = true;
    info.textContent = "";
    products = [];
    document.getElementById("productList").innerHTML =
      '<div class="empty">اختر نشاطًا أولًا.</div>';
    return;
  }

  info.hidden = false;
  info.textContent = `النشاط المختار: ${selectedBusiness.name || selectedBusiness.title || "بدون اسم"}`;

  await loadProducts(businessId);

  // تعبئة رقم واتساب من بيانات النشاط إن وجد.
  const whatsapp =
    selectedBusiness.whatsapp ||
    selectedBusiness.whatsapp_number ||
    selectedBusiness.phone ||
    "";

  const whatsappInput = document.getElementById("pageWhatsapp");
  if (!whatsappInput.value.trim() && whatsapp) {
    whatsappInput.value = String(whatsapp);
  }
}

async function loadProducts(businessId) {
  const list = document.getElementById("productList");
  list.innerHTML = '<div class="loading">جاري تحميل المنتجات...</div>';

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    return;
  }

  products = data || [];

  if (!products.length) {
    list.innerHTML = '<div class="empty">لا توجد منتجات مرتبطة بهذا النشاط.</div>';
    return;
  }

  list.innerHTML = `
    <div class="product-list">
      ${products.map(p => `
        <label class="product-row">
          <input type="checkbox" class="product-check" value="${escapeAttr(p.id)}">
          <span class="product-info">
            <b>${escapeHtml(p.name || "منتج بدون اسم")}</b>
            <span class="product-meta">
              ${p.price != null ? `${escapeHtml(p.price)} ${escapeHtml(p.currency || "EGP")}` : ""}
            </span>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

async function saveLanding() {
  if (!selectedBusiness) {
    show("landingMessage", "اختر النشاط أولًا.", true);
    return;
  }

  const selectedProductIds = [...document.querySelectorAll(".product-check:checked")]
    .map(input => input.value);

  const payload = {
    business_id: selectedBusiness.id,
    title: document.getElementById("pageTitle").value.trim(),
    subtitle: document.getElementById("pageHeadline").value.trim(),
    page_type: "product_offer",
    content: {
      description: document.getElementById("pageDescription").value.trim(),
      image_url: document.getElementById("pageImage").value.trim(),
      whatsapp: document.getElementById("pageWhatsapp").value.trim(),
      product_ids: selectedProductIds
    },
    seo_title: document.getElementById("pageTitle").value.trim(),
    seo_description: document.getElementById("pageDescription").value.trim(),
    published: false
  };

  if (!payload.title) {
    show("landingMessage", "اكتب عنوان الصفحة.", true);
    return;
  }

  const { error } = await sb.from("landing_pages").insert(payload);

  if (error) {
    show("landingMessage", error.message, true);
    return;
  }

  show("landingMessage", "تم حفظ صفحة الهبوط وربط النشاط والمنتجات بنجاح.");
  document.getElementById("pageTitle").value = "";
  document.getElementById("pageSlug").value = "";
  document.getElementById("pageHeadline").value = "";
  document.getElementById("pageDescription").value = "";
  document.getElementById("pageImage").value = "";
  document.getElementById("pageWhatsapp").value = "";

  document.querySelectorAll(".product-check").forEach(x => x.checked = false);

  await loadLandings();
}

async function loadLandings() {
  const list = document.getElementById("landingList");
  list.innerHTML = '<div class="loading">جاري تحميل الصفحات...</div>';

  const { data, error } = await sb
    .from("landing_pages")
    .select("*")
    .eq("business_id", selectedBusiness?.id || "")
    .order("created_at", { ascending: false });

  // لا نعرض خطأ عند عدم اختيار نشاط.
  if (!selectedBusiness) {
    list.innerHTML = '<div class="empty">اختر نشاطًا لعرض صفحاته.</div>';
    return;
  }

  if (error) {
    list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<div class="empty">لا توجد صفحات محفوظة لهذا النشاط.</div>';
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="saved-item">
      <div>
        <b>${escapeHtml(p.title || p.subtitle || "صفحة")}</b>
        <small>${escapeHtml(p.page_type || "")}</small>
      </div>
      <button class="btn btn-danger" onclick="deleteLanding('${escapeAttr(p.id)}')">حذف</button>
    </div>
  `).join("");
}

async function deleteLanding(id) {
  if (!confirm("حذف الصفحة؟")) return;

  const { error } = await sb
    .from("landing_pages")
    .delete()
    .eq("id", id)
    .eq("business_id", selectedBusiness.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadLandings();
}

function show(id, text, error = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "message " + (error ? "error" : "success");
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(v) {
  return String(v ?? "").replace(/["'\\]/g, "");
}
