let landingUser = null;
let landingBusiness = null;
let landingProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !sb) return;

  landingUser = session.user;

  const saveBtn = document.getElementById("saveLanding");
  if (saveBtn) saveBtn.addEventListener("click", saveLanding);

  await loadBusinessAndProducts();
  await loadLandings();
});

async function loadBusinessAndProducts() {
  setBusinessLoading(true);

  const { data: businesses, error } = await sb
    .from("businesses")
    .select("id,name,slug,description,whatsapp,phone")
    .eq("owner_id", landingUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    show("landingMessage", "تعذر تحميل النشاط: " + error.message, true);
    setBusinessLoading(false);
    return;
  }

  const list = businesses || [];
  if (!list.length) {
    landingBusiness = null;
    renderBusinessSelect([]);
    renderProducts([]);
    setBusinessLoading(false);
    return;
  }

  landingBusiness = list[0];
  renderBusinessSelect(list);
  await loadProductsForBusiness(landingBusiness.id);
  setBusinessLoading(false);
}

async function loadProductsForBusiness(businessId) {
  landingProducts = [];

  if (!businessId) {
    renderProducts([]);
    return;
  }

  const { data, error } = await sb
    .from("products")
    .select("id,business_id,name,slug,description,price,currency,image_url,whatsapp_message,is_active,sort_order,created_at")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    show("landingMessage", "تعذر تحميل المنتجات: " + error.message, true);
    renderProducts([]);
    return;
  }

  landingProducts = data || [];
  renderProducts(landingProducts);
}

function renderBusinessSelect(businesses) {
  const select = document.getElementById("businessSelect");
  if (!select) return;

  select.innerHTML = "";

  if (!businesses.length) {
    select.innerHTML = '<option value="">لا يوجد نشاط مسجل</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;

  businesses.forEach(b => {
    const option = document.createElement("option");
    option.value = b.id;
    option.textContent = b.name || "نشاط بدون اسم";
    if (landingBusiness && b.id === landingBusiness.id) option.selected = true;
    select.appendChild(option);
  });

  select.onchange = async () => {
    landingBusiness = businesses.find(b => b.id === select.value) || null;
    await loadProductsForBusiness(select.value);
    await loadLandings();
  };
}

function renderProducts(products) {
  const box = document.getElementById("productsList");
  if (!box) return;

  box.innerHTML = "";

  if (!landingBusiness) {
    box.innerHTML = '<div class="empty">اختر نشاطًا أولًا.</div>';
    return;
  }

  if (!products.length) {
    box.innerHTML = '<div class="empty">لا توجد منتجات مسجلة لهذا النشاط.</div>';
    return;
  }

  products.forEach(p => {
    const label = document.createElement("label");
    label.className = "product-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "landingProduct";
    checkbox.value = p.id;

    const text = document.createElement("span");
    text.textContent = p.name || "منتج بدون اسم";

    const price = document.createElement("small");
    price.textContent = p.price != null ? ` — ${p.price} ${p.currency || "EGP"}` : "";

    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(price);
    box.appendChild(label);
  });
}

async function saveLanding() {
  if (!landingBusiness) {
    show("landingMessage", "اختر نشاطًا أولًا.", true);
    return;
  }

  const title = valueOf("pageTitle");
  const slug = valueOf("pageSlug");
  const headline = valueOf("pageHeadline");
  const description = valueOf("pageDescription");
  const imageUrl = valueOf("pageImage");
  const whatsapp = valueOf("pageWhatsapp");

  if (!title || !slug) {
    show("landingMessage", "اكتب عنوان الصفحة والرابط المختصر.", true);
    return;
  }

  const selectedIds = Array.from(
    document.querySelectorAll('input[name="landingProduct"]:checked')
  ).map(i => i.value);

  const selectedProducts = landingProducts.filter(p => selectedIds.includes(p.id));

  const content = {
    business_id: landingBusiness.id,
    business: {
      id: landingBusiness.id,
      name: landingBusiness.name || "",
      slug: landingBusiness.slug || "",
      description: landingBusiness.description || "",
      whatsapp: landingBusiness.whatsapp || landingBusiness.phone || ""
    },
    page: {
      title,
      slug,
      headline,
      description,
      image_url: imageUrl,
      whatsapp
    },
    product_ids: selectedIds,
    products: selectedProducts
  };

  const payload = {
    business_id: landingBusiness.id,
    title,
    subtitle: headline || null,
    page_type: "product_offer",
    content,
    seo_title: title,
    seo_description: description || headline || null,
    published: false
  };

  const btn = document.getElementById("saveLanding");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "جاري الحفظ...";
  }

  const { error } = await sb.from("landing_pages").insert(payload);

  if (btn) {
    btn.disabled = false;
    btn.textContent = "حفظ الصفحة";
  }

  if (error) {
    show("landingMessage", "تعذر حفظ صفحة الهبوط: " + error.message, true);
    return;
  }

  show("landingMessage", "تم حفظ صفحة الهبوط بنجاح.");
  ["pageTitle","pageSlug","pageHeadline","pageDescription","pageImage","pageWhatsapp"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

  document.querySelectorAll('input[name="landingProduct"]')
    .forEach(i => i.checked = false);

  await loadLandings();
}

async function loadLandings() {
  const list = document.getElementById("landingList");
  if (!list || !landingBusiness) return;

  const { data, error } = await sb
    .from("landing_pages")
    .select("id,business_id,title,subtitle,page_type,published,created_at")
    .eq("business_id", landingBusiness.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<div class="empty">لا توجد صفحات محفوظة.</div>';
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="item">
      <div>
        <b>${escapeHtml(p.title || p.subtitle || "صفحة")}</b>
        <small>${p.published ? "منشورة" : "مسودة"}</small>
      </div>
      <button class="btn danger" onclick="deleteLanding('${p.id}')">حذف</button>
    </div>
  `).join("");
}

async function deleteLanding(id) {
  if (!landingBusiness || !confirm("حذف الصفحة؟")) return;

  const { error } = await sb
    .from("landing_pages")
    .delete()
    .eq("id", id)
    .eq("business_id", landingBusiness.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadLandings();
}

function setBusinessLoading(loading) {
  const select = document.getElementById("businessSelect");
  if (!select) return;
  select.disabled = loading;
  if (loading) select.innerHTML = '<option value="">جاري تحميل الأنشطة...</option>';
}

function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
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
