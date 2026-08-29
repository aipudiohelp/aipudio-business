let landingUser = null;
let businesses = [];
let selectedBusiness = null;
let products = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !window.sb) return;

  landingUser = session.user;

  const businessSelect = document.getElementById("businessSelect");
  const saveButton = document.getElementById("saveLanding");

  if (businessSelect) {
    businessSelect.addEventListener("change", async (event) => {
      await selectBusiness(event.target.value);
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", saveLanding);
  }

  await loadBusinesses();
});

async function loadBusinesses() {
  const select = document.getElementById("businessSelect");
  if (!select) return;

  select.innerHTML = '<option value="">جاري تحميل الأنشطة...</option>';

  // businesses.user_id هو عمود مالك النشاط في قاعدة البيانات الحالية.
  const { data, error } = await sb
    .from("businesses")
    .select("*")
    .eq("user_id", landingUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    select.innerHTML = '<option value="">تعذر تحميل الأنشطة</option>';
    show("landingMessage", `تعذر تحميل الأنشطة: ${error.message}`, true);
    return;
  }

  businesses = data || [];

  if (!businesses.length) {
    select.innerHTML = '<option value="">لا توجد أنشطة مسجلة</option>';
    selectedBusiness = null;
    products = [];
    document.getElementById("productList").innerHTML =
      '<div class="empty">أضف نشاطًا من صفحة إدارة النشاط أولًا.</div>';
    document.getElementById("businessInfo").hidden = true;
    return;
  }

  select.innerHTML =
    '<option value="">اختر النشاط...</option>' +
    businesses.map((business) =>
      `<option value="${escapeAttr(business.id)}">${escapeHtml(
        business.name || "نشاط بدون اسم"
      )}</option>`
    ).join("");

  // في حالة وجود نشاط واحد، اختياره تلقائيًا.
  if (businesses.length === 1) {
    select.value = businesses[0].id;
    await selectBusiness(businesses[0].id);
  }
}

async function selectBusiness(businessId) {
  selectedBusiness =
    businesses.find((business) => business.id === businessId) || null;

  const info = document.getElementById("businessInfo");
  const productList = document.getElementById("productList");

  if (!selectedBusiness) {
    if (info) {
      info.hidden = true;
      info.textContent = "";
    }

    products = [];

    if (productList) {
      productList.innerHTML =
        '<div class="empty">اختر نشاطًا أولًا.</div>';
    }

    clearLandingDefaults();
    await loadLandings();
    return;
  }

  if (info) {
    info.hidden = false;
    info.textContent =
      `النشاط المختار: ${selectedBusiness.name || "بدون اسم"}`;
  }

  await loadProducts(selectedBusiness.id);

  // تعبئة رقم واتساب النشاط تلقائيًا إن كان موجودًا.
  const whatsapp =
    selectedBusiness.whatsapp ||
    selectedBusiness.whatsapp_number ||
    selectedBusiness.phone ||
    "";

  const whatsappInput = document.getElementById("pageWhatsapp");

  if (whatsappInput && !whatsappInput.value.trim() && whatsapp) {
    whatsappInput.value = String(whatsapp);
  }

  await loadLandings();
}

async function loadProducts(businessId) {
  const list = document.getElementById("productList");
  if (!list) return;

  list.innerHTML =
    '<div class="loading">جاري تحميل المنتجات...</div>';

  // products.business_id هو الرابط الفعلي بين المنتج والنشاط.
  const { data, error } = await sb
    .from("products")
    .select("id,business_id,name,slug,description,price,currency,image_url,whatsapp_message,is_active,sort_order,created_at")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    products = [];
    list.innerHTML =
      `<div class="empty">تعذر تحميل المنتجات: ${escapeHtml(error.message)}</div>`;
    return;
  }

  products = data || [];

  if (!products.length) {
    list.innerHTML =
      '<div class="empty">لا توجد منتجات نشطة مرتبطة بهذا النشاط.</div>';
    return;
  }

  list.innerHTML = `
    <div class="product-list">
      ${products.map((product) => `
        <label class="product-row">
          <input
            type="checkbox"
            class="product-check"
            value="${escapeAttr(product.id)}"
          >
          <span class="product-info">
            <b>${escapeHtml(product.name || "منتج بدون اسم")}</b>
            ${
              product.description
                ? `<span class="product-description">${escapeHtml(product.description)}</span>`
                : ""
            }
            ${
              product.price !== null && product.price !== undefined
                ? `<span class="product-meta">${escapeHtml(product.price)} ${escapeHtml(product.currency || "EGP")}</span>`
                : ""
            }
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

async function saveLanding() {
  if (!selectedBusiness?.id) {
    show("landingMessage", "اختر النشاط أولًا.", true);
    return;
  }

  const selectedProductIds = [
    ...document.querySelectorAll(".product-check:checked")
  ].map((input) => input.value);

  const title =
    document.getElementById("pageTitle")?.value.trim() || "";

  const slug =
    document.getElementById("pageSlug")?.value.trim() || "";

  const headline =
    document.getElementById("pageHeadline")?.value.trim() || "";

  const description =
    document.getElementById("pageDescription")?.value.trim() || "";

  const imageUrl =
    document.getElementById("pageImage")?.value.trim() || "";

  const whatsapp =
    document.getElementById("pageWhatsapp")?.value.trim() || "";

  if (!title) {
    show("landingMessage", "اكتب عنوان الصفحة.", true);
    return;
  }

  if (!slug) {
    show("landingMessage", "اكتب الرابط المختصر للصفحة.", true);
    return;
  }

  if (!selectedProductIds.length) {
    show("landingMessage", "اختر منتجًا واحدًا على الأقل.", true);
    return;
  }

  // landing_pages لا يحتوي owner_id أو user_id.
  // الملكية تكون من خلال business_id، وبيانات الصفحة الإضافية داخل content.
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

  const { error } = await sb
    .from("landing_pages")
    .insert(payload);

  if (error) {
    show("landingMessage", `تعذر حفظ صفحة الهبوط: ${error.message}`, true);
    return;
  }

  show(
    "landingMessage",
    "تم حفظ صفحة الهبوط وربط النشاط والمنتجات بنجاح."
  );

  clearLandingForm();
  await loadLandings();
}

async function loadLandings() {
  const list = document.getElementById("landingList");
  if (!list) return;

  if (!selectedBusiness?.id) {
    list.innerHTML =
      '<div class="empty">اختر نشاطًا لعرض صفحاته.</div>';
    return;
  }

  list.innerHTML =
    '<div class="loading">جاري تحميل الصفحات...</div>';

  const { data, error } = await sb
    .from("landing_pages")
    .select("*")
    .eq("business_id", selectedBusiness.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML =
      `<div class="empty">تعذر تحميل الصفحات: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    list.innerHTML =
      '<div class="empty">لا توجد صفحات محفوظة لهذا النشاط.</div>';
    return;
  }

  list.innerHTML = data.map((page) => {
    const content =
      page.content && typeof page.content === "object"
        ? page.content
        : {};

    return `
      <div class="saved-item">
        <div>
          <b>${escapeHtml(page.title || page.subtitle || "صفحة")}</b>
          <small>
            ${escapeHtml(content.slug || page.page_type || "")}
          </small>
        </div>
        <button
          class="btn btn-danger"
          onclick="deleteLanding('${escapeAttr(page.id)}')"
        >
          حذف
        </button>
      </div>
    `;
  }).join("");
}

async function deleteLanding(id) {
  if (!selectedBusiness?.id) return;
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

function clearLandingDefaults() {
  const whatsapp = document.getElementById("pageWhatsapp");
  if (whatsapp) whatsapp.value = "";
}

function clearLandingForm() {
  [
    "pageTitle",
    "pageSlug",
    "pageHeadline",
    "pageDescription",
    "pageImage",
    "pageWhatsapp"
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });

  document
    .querySelectorAll(".product-check")
    .forEach((input) => {
      input.checked = false;
    });
}

function show(id, text, error = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.className =
    "message " + (error ? "error" : "success");
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}

function escapeAttr(value) {
  return String(value ?? "").replace(/["'\\]/g, "");
}
