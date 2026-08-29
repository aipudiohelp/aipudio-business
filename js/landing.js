let landingUser = null;
let businesses = [];
let selectedBusiness = null;
let products = [];

const sb = window.supabaseClient;

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !sb) return;

  landingUser = session.user;

  const businessSelect = document.getElementById("businessSelect");
  const saveButton = document.getElementById("saveLanding");

  if (businessSelect) {
    businessSelect.addEventListener("change", async (e) => {
      await selectBusiness(e.target.value);
    });
  }

  if (saveButton) saveButton.addEventListener("click", saveLanding);

  await loadBusinesses();
});

async function loadBusinesses() {
  const select = document.getElementById("businessSelect");
  if (!select) return;

  select.innerHTML = '<option value="">جاري تحميل الأنشطة...</option>';

  const { data, error } = await sb
    .from("businesses")
    .select("*")
    .eq("user_id", landingUser.id)
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
      `<option value="${escapeAttr(b.id)}">${escapeHtml(b.name || "نشاط بدون اسم")}</option>`
    ).join("");

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
    info.hidden = true;
    info.textContent = "";
    products = [];
    productList.innerHTML = '<div class="empty">اختر نشاطًا أولًا.</div>';
    return;
  }

  info.hidden = false;
  info.textContent = `النشاط المختار: ${selectedBusiness.name || "بدون اسم"}`;

  await loadProducts(selectedBusiness.id);

  const whatsapp = selectedBusiness.whatsapp || selectedBusiness.phone || "";
  const whatsappInput = document.getElementById("pageWhatsapp");
  if (whatsappInput && !whatsappInput.value.trim() && whatsapp) {
    whatsappInput.value = String(whatsapp);
  }

  await loadLandings();
}

async function loadProducts(businessId) {
  const list = document.getElementById("productList");
  list.innerHTML = '<div class="loading">جاري تحميل المنتجات...</div>';

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    products = [];
    list.innerHTML = `<div class="empty">تعذر تحميل المنتجات: ${escapeHtml(error.message)}</div>`;
    return;
  }

  products = data || [];

  if (!products.length) {
    list.innerHTML = '<div class="empty">لا توجد منتجات نشطة مرتبطة بهذا النشاط.</div>';
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

  const title = document.getElementById("pageTitle").value.trim();
  const headline = document.getElementById("pageHeadline").value.trim();
  const description = document.getElementById("pageDescription").value.trim();
  const imageUrl = document.getElementById("pageImage").value.trim();
  const whatsapp = document.getElementById("pageWhatsapp").value.trim();
  const slug = document.getElementById("pageSlug")?.value.trim() || "";

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

  const { error } = await sb.from("landing_pages").insert(payload);

  if (error) {
    show("landingMessage", error.message, true);
    return;
  }

  show("landingMessage", "تم حفظ صفحة الهبوط وربط النشاط والمنتجات بنجاح.");

  ["pageTitle", "pageSlug", "pageHeadline", "pageDescription", "pageImage", "pageWhatsapp"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

  document.querySelectorAll(".product-check").forEach(x => x.checked = false);

  await loadLandings();
}

async function loadLandings() {
  const list = document.getElementById("landingList");
  if (!list) return;

  if (!selectedBusiness) {
    list.innerHTML = '<div class="empty">اختر نشاطًا لعرض صفحاته.</div>';
    return;
  }

  list.innerHTML = '<div class="loading">جاري تحميل الصفحات...</div>';

  const { data, error } = await sb
    .from("landing_pages")
    .select("*")
    .eq("business_id", selectedBusiness.id)
    .order("created_at", { ascending: false });

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
  if (!selectedBusiness) return;
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
  if (!el) return;
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
