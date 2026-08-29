let landingUser = null;
let selectedBusiness = null;
let businessProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();

  if (!session || !window.supabaseClient) {
    console.error("لا توجد جلسة دخول أو Supabase غير متاح.");
    return;
  }

  landingUser = session.user;

  const saveButton = document.getElementById("saveLanding");

  if (saveButton) {
    saveButton.addEventListener("click", saveLanding);
  }

  // تحميل النشاط تلقائياً
  await loadBusinesses();

  // تحميل صفحات الهبوط السابقة
  await loadLandings();
});


/* =========================================================
   1) تحميل أنشطة المستخدم
========================================================= */

async function loadBusinesses() {
  const select = document.getElementById("businessSelect");

  if (!select) {
    console.error("العنصر businessSelect غير موجود في landing.html");
    return;
  }

  select.innerHTML = `<option value="">جاري تحميل الأنشطة...</option>`;

  const { data, error } = await sb
    .from("businesses")
    .select("id, name, slug, description, whatsapp")
    .eq("user_id", landingUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ تحميل الأنشطة:", error);

    select.innerHTML = `
      <option value="">
        تعذر تحميل النشاط
      </option>
    `;

    show(
      "landingMessage",
      "تعذر تحميل النشاط: " + error.message,
      true
    );

    return;
  }

  if (!data || data.length === 0) {
    select.innerHTML = `
      <option value="">
        لا يوجد نشاط مسجل
      </option>
    `;

    show(
      "landingMessage",
      "لم يتم العثور على نشاط مرتبط بحسابك.",
      true
    );

    return;
  }

  // عرض الأنشطة
  select.innerHTML = `
    <option value="">اختر النشاط</option>
    ${data.map(b => `
      <option value="${escapeAttr(b.id)}">
        ${escapeHtml(b.name || "نشاط بدون اسم")}
      </option>
    `).join("")}
  `;

  // لو عند المستخدم نشاط واحد نختاره تلقائياً
  if (data.length === 1) {
    selectedBusiness = data[0];

    select.value = data[0].id;

    await loadProducts(data[0].id);

    fillBusinessData(data[0]);
  }

  // تغيير النشاط
  select.addEventListener("change", async function () {
    const businessId = this.value;

    if (!businessId) {
      selectedBusiness = null;
      businessProducts = [];

      clearBusinessData();
      renderProducts([]);

      return;
    }

    selectedBusiness = data.find(b => b.id === businessId) || null;

    if (!selectedBusiness) return;

    fillBusinessData(selectedBusiness);

    await loadProducts(businessId);
  });
}


/* =========================================================
   2) تعبئة بيانات النشاط تلقائياً
========================================================= */

function fillBusinessData(business) {
  const whatsapp = document.getElementById("pageWhatsapp");

  if (whatsapp && business.whatsapp) {
    whatsapp.value = business.whatsapp;
  }
}


function clearBusinessData() {
  const whatsapp = document.getElementById("pageWhatsapp");

  if (whatsapp) {
    whatsapp.value = "";
  }
}


/* =========================================================
   3) تحميل منتجات النشاط
========================================================= */

async function loadProducts(businessId) {
  const container = document.getElementById("productList");

  if (!container) {
    console.error("العنصر productList غير موجود في landing.html");
    return;
  }

  container.innerHTML = `
    <div class="empty">
      جاري تحميل المنتجات...
    </div>
  `;

  const { data, error } = await sb
    .from("products")
    .select(`
      id,
      business_id,
      name,
      slug,
      description,
      price,
      currency,
      image_url,
      whatsapp_message,
      is_active,
      sort_order
    `)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ تحميل المنتجات:", error);

    container.innerHTML = `
      <div class="empty">
        تعذر تحميل المنتجات
      </div>
    `;

    show(
      "landingMessage",
      "تعذر تحميل المنتجات: " + error.message,
      true
    );

    return;
  }

  businessProducts = data || [];

  renderProducts(businessProducts);
}


/* =========================================================
   4) عرض المنتجات كاختيارات
========================================================= */

function renderProducts(products) {
  const container = document.getElementById("productList");

  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <div class="empty">
        لا توجد منتجات نشطة لهذا النشاط.
      </div>
    `;

    return;
  }

  container.innerHTML = products.map(product => `
    <label class="product-option">
      <input
        type="checkbox"
        class="landing-product"
        value="${escapeAttr(product.id)}"
      >

      <div class="product-option-content">
        <strong>
          ${escapeHtml(product.name || "منتج")}
        </strong>

        ${
          product.description
            ? `<small>${escapeHtml(product.description)}</small>`
            : ""
        }

        ${
          product.price !== null && product.price !== undefined
            ? `<small>
                السعر:
                ${escapeHtml(product.price)}
                ${escapeHtml(product.currency || "EGP")}
              </small>`
            : ""
        }
      </div>
    </label>
  `).join("");
}


/* =========================================================
   5) حفظ صفحة الهبوط
========================================================= */

async function saveLanding() {

  if (!selectedBusiness) {
    show(
      "landingMessage",
      "اختر نشاطاً أولاً.",
      true
    );

    return;
  }

  const selectedProductIds = Array.from(
    document.querySelectorAll(".landing-product:checked")
  ).map(input => input.value);


  const title =
    document.getElementById("pageTitle")?.value.trim() || "";

  const headline =
    document.getElementById("pageHeadline")?.value.trim() || "";

  const description =
    document.getElementById("pageDescription")?.value.trim() || "";

  const imageUrl =
    document.getElementById("pageImage")?.value.trim() || "";

  const whatsapp =
    document.getElementById("pageWhatsapp")?.value.trim() || "";


  if (!title) {
    show(
      "landingMessage",
      "اكتب عنوان الصفحة.",
      true
    );

    return;
  }


  if (!selectedProductIds.length) {
    show(
      "landingMessage",
      "اختر منتجاً واحداً على الأقل.",
      true
    );

    return;
  }


  // المنتجات المختارة بالكامل
  const selectedProducts = businessProducts.filter(product =>
    selectedProductIds.includes(product.id)
  );


  /*
    جدول landing_pages لا يحتوي:
    owner_id
    slug
    headline
    description
    image_url
    whatsapp

    لذلك نخزن بيانات الصفحة داخل content JSONB.
  */

  const payload = {
    business_id: selectedBusiness.id,

    title: title,

    subtitle: headline || null,

    page_type: "product",

    content: {
      description: description,

      image_url: imageUrl,

      whatsapp: whatsapp,

      business: {
        id: selectedBusiness.id,
        name: selectedBusiness.name,
        slug: selectedBusiness.slug || null,
        description: selectedBusiness.description || null,
        whatsapp: selectedBusiness.whatsapp || null
      },

      products: selectedProducts
    },

    seo_title: title,

    seo_description: description || headline || null,

    published: false
  };


  const { data, error } = await sb
    .from("landing_pages")
    .insert(payload)
    .select()
    .single();


  if (error) {
    console.error("خطأ حفظ صفحة الهبوط:", error);

    show(
      "landingMessage",
      "تعذر حفظ صفحة الهبوط: " + error.message,
      true
    );

    return;
  }


  show(
    "landingMessage",
    "تم حفظ صفحة الهبوط بنجاح."
  );


  // تنظيف النموذج
  [
    "pageTitle",
    "pageHeadline",
    "pageDescription",
    "pageImage"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });


  // إلغاء اختيار المنتجات
  document
    .querySelectorAll(".landing-product")
    .forEach(input => {
      input.checked = false;
    });


  await loadLandings();
}


/* =========================================================
   6) تحميل صفحات الهبوط السابقة
========================================================= */

async function loadLandings() {
  const list = document.getElementById("landingList");

  if (!list || !landingUser) return;

  list.innerHTML = `
    <div class="empty">
      جاري تحميل الصفحات...
    </div>
  `;


  /*
    لا نستخدم owner_id هنا.

    نبحث عن أنشطة المستخدم أولاً،
    ثم صفحات الهبوط التابعة لها.
  */

  const { data: businesses, error: businessError } = await sb
    .from("businesses")
    .select("id")
    .eq("user_id", landingUser.id);


  if (businessError) {
    list.innerHTML = `
      <div class="empty">
        ${escapeHtml(businessError.message)}
      </div>
    `;

    return;
  }


  if (!businesses || !businesses.length) {
    list.innerHTML = `
      <div class="empty">
        لا توجد أنشطة مرتبطة بالحساب.
      </div>
    `;

    return;
  }


  const businessIds = businesses.map(b => b.id);


  const { data, error } = await sb
    .from("landing_pages")
    .select("*")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });


  if (error) {
    list.innerHTML = `
      <div class="empty">
        ${escapeHtml(error.message)}
      </div>
    `;

    return;
  }


  if (!data || !data.length) {
    list.innerHTML = `
      <div class="empty">
        لا توجد صفحات محفوظة.
      </div>
    `;

    return;
  }


  list.innerHTML = data.map(page => `
    <div class="item">

      <div>
        <b>
          ${escapeHtml(
            page.title ||
            page.subtitle ||
            "صفحة هبوط"
          )}
        </b>

        <small>
          ${escapeHtml(page.page_type || "")}
        </small>
      </div>

      <button
        class="btn danger"
        onclick="deleteLanding('${escapeAttr(page.id)}')"
      >
        حذف
      </button>

    </div>
  `).join("");
}


/* =========================================================
   7) حذف صفحة هبوط
========================================================= */

async function deleteLanding(id) {

  if (!confirm("حذف الصفحة؟")) return;


  const { data: businesses, error: businessError } = await sb
    .from("businesses")
    .select("id")
    .eq("user_id", landingUser.id);


  if (businessError) {
    alert(businessError.message);
    return;
  }


  const businessIds = (businesses || []).map(b => b.id);


  if (!businessIds.length) {
    alert("لا يوجد نشاط مرتبط بالحساب.");
    return;
  }


  const { error } = await sb
    .from("landing_pages")
    .delete()
    .eq("id", id)
    .in("business_id", businessIds);


  if (error) {
    alert(error.message);
    return;
  }


  await loadLandings();
}


/* =========================================================
   Helpers
========================================================= */

function show(id, text, error = false) {
  const el = document.getElementById(id);

  if (!el) return;

  el.textContent = text;

  el.className =
    "message " +
    (error ? "error" : "success");
}


function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


function escapeAttr(value) {
  return String(value ?? "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
    }
