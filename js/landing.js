let landingUser = null;
let businesses = [];
let products = [];


document.addEventListener("DOMContentLoaded", async () => {

  const session = await requireAuth();

  if (!session || !window.sb) return;

  landingUser = session.user;

  const businessSelect = document.getElementById("businessSelect");

  businessSelect.addEventListener("change", async () => {

    const businessId = businessSelect.value;

    if (!businessId) {
      document.getElementById("businessPreview").innerHTML = "";
      document.getElementById("productsSelection").innerHTML =
        '<div class="empty-box">اختر نشاطًا أولًا.</div>';
      return;
    }

    await loadBusinessProducts(businessId);

  });


  document
    .getElementById("saveLanding")
    .addEventListener("click", saveLanding);


  await loadBusinesses();

  await loadLandings();

});


/* =========================================================
   تحميل أنشطة المستخدم
========================================================= */

async function loadBusinesses() {

  const select = document.getElementById("businessSelect");

  const { data, error } = await sb
    .from("businesses")
    .select("*")
    .eq("user_id", landingUser.id)
    .order("created_at", { ascending: false });


  if (error) {

    select.innerHTML =
      `<option value="">${escapeHtml(error.message)}</option>`;

    show(
      "landingMessage",
      error.message,
      true
    );

    return;
  }


  businesses = data || [];


  if (!businesses.length) {

    select.innerHTML =
      '<option value="">لا يوجد نشاط محفوظ</option>';

    document.getElementById("productsSelection").innerHTML =
      '<div class="empty-box">أضف نشاطًا أولًا من إدارة النشاط.</div>';

    return;
  }


  select.innerHTML =
    '<option value="">اختر النشاط...</option>' +

    businesses
      .map(b => `
        <option value="${escapeHtml(b.id)}">
          ${escapeHtml(b.name || "نشاط بدون اسم")}
        </option>
      `)
      .join("");


  /*
    لو المستخدم لديه نشاط واحد فقط،
    نختاره تلقائيًا.
  */

  if (businesses.length === 1) {

    select.value = businesses[0].id;

    await loadBusinessProducts(businesses[0].id);

  }

}


/* =========================================================
   تحميل منتجات النشاط
========================================================= */

async function loadBusinessProducts(businessId) {

  const productContainer =
    document.getElementById("productsSelection");

  const business =
    businesses.find(b => b.id === businessId);


  /* عرض بيانات النشاط */

  if (business) {

    document.getElementById("businessPreview").innerHTML = `

      <div class="business-preview">

        <strong>
          ${escapeHtml(business.name || "بدون اسم")}
        </strong>

        <span>
          ${escapeHtml(business.description || "لا يوجد وصف")}
        </span>

        <small>
          واتساب:
          ${escapeHtml(
            business.whatsapp ||
            business.phone ||
            business.whatsapp_number ||
            "غير محدد"
          )}
        </small>

      </div>

    `;

  }


  /* جلب المنتجات */

  productContainer.innerHTML =
    '<div class="empty-box">جاري تحميل المنتجات...</div>';


  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });


  if (error) {

    productContainer.innerHTML =
      `<div class="empty-box">${escapeHtml(error.message)}</div>`;

    return;
  }


  products = data || [];


  if (!products.length) {

    productContainer.innerHTML = `
      <div class="empty-box">
        لا توجد منتجات نشطة لهذا النشاط.
      </div>
    `;

    return;
  }


  productContainer.innerHTML = products
    .map(product => {

      const price =
        product.price !== null &&
        product.price !== undefined
          ? `${product.price} ${product.currency || "EGP"}`
          : "";


      return `

        <label class="product-option">

          <input
            type="checkbox"
            class="product-checkbox"
            value="${escapeHtml(product.id)}"
          >

          <div class="product-info">

            <span class="product-name">
              ${escapeHtml(product.name || "منتج")}
            </span>

            <span class="product-price">
              ${escapeHtml(price)}
            </span>

          </div>

        </label>

      `;

    })
    .join("");

}


/* =========================================================
   إنشاء صفحة الهبوط
========================================================= */

async function saveLanding() {

  const businessId =
    document.getElementById("businessSelect").value;


  if (!businessId) {

    show(
      "landingMessage",
      "اختر النشاط أولًا.",
      true
    );

    return;
  }


  const selectedProducts =
    Array.from(
      document.querySelectorAll(".product-checkbox:checked")
    ).map(input => input.value);


  if (!selectedProducts.length) {

    show(
      "landingMessage",
      "اختر منتجًا واحدًا على الأقل لعرضه في الصفحة.",
      true
    );

    return;
  }


  const title =
    document.getElementById("pageTitle").value.trim();


  const slug =
    normalizeSlug(
      document.getElementById("pageSlug").value.trim()
    );


  const headline =
    document.getElementById("pageHeadline").value.trim();


  const subtitle =
    document.getElementById("pageSubtitle").value.trim();


  const seoTitle =
    document.getElementById("seoTitle").value.trim();


  const seoDescription =
    document.getElementById("seoDescription").value.trim();


  if (!title) {

    show(
      "landingMessage",
      "اكتب عنوان صفحة الهبوط.",
      true
    );

    return;
  }


  if (!slug) {

    show(
      "landingMessage",
      "اكتب الرابط المختصر للصفحة.",
      true
    );

    return;
  }


  if (!headline) {

    show(
      "landingMessage",
      "اكتب العنوان الرئيسي للصفحة.",
      true
    );

    return;
  }


  /*
    نحفظ البيانات الخاصة بالصفحة داخل content
    لأن جدول landing_pages لا يحتوي على أعمدة
    headline / description / slug / image...
  */

  const content = {

    slug: slug,

    headline: headline,

    subtitle: subtitle,

    product_ids: selectedProducts,

    business_id: businessId

  };


  const payload = {

    business_id: businessId,

    title: title,

    subtitle: subtitle,

    page_type: "products",

    content: content,

    seo_title: seoTitle || title,

    seo_description:
      seoDescription || subtitle,

    published: false

  };


  const button =
    document.getElementById("saveLanding");


  button.disabled = true;

  button.textContent =
    "جاري إنشاء الصفحة...";


  const { data, error } =
    await sb
      .from("landing_pages")
      .insert(payload)
      .select()
      .single();


  button.disabled = false;

  button.textContent =
    "إنشاء صفحة الهبوط";


  if (error) {

    show(
      "landingMessage",
      error.message,
      true
    );

    return;
  }


  show(
    "landingMessage",
    "تم إنشاء صفحة الهبوط بنجاح."
  );


  /*
    تنظيف حقول الصفحة فقط.
    النشاط والمنتجات لا يتم حذفها.
  */

  document.getElementById("pageTitle").value = "";
  document.getElementById("pageSlug").value = "";
  document.getElementById("pageHeadline").value = "";
  document.getElementById("pageSubtitle").value = "";
  document.getElementById("seoTitle").value = "";
  document.getElementById("seoDescription").value = "";


  document
    .querySelectorAll(".product-checkbox")
    .forEach(input => {
      input.checked = false;
    });


  await loadLandings();

}


/* =========================================================
   تحميل صفحات الهبوط الخاصة بالمستخدم
========================================================= */

async function loadLandings() {

  const list =
    document.getElementById("landingList");


  list.innerHTML =
    '<div class="empty-box">جاري تحميل الصفحات...</div>';


  /*
    لا نستطيع استخدام owner_id
    لأن landing_pages لا يحتوي عليه.

    لذلك نجلب صفحات الأنشطة التي يملكها المستخدم.
  */

  if (!businesses.length) {

    list.innerHTML =
      '<div class="empty-box">لا توجد صفحات محفوظة.</div>';

    return;
  }


  const businessIds =
    businesses.map(b => b.id);


  const { data, error } =
    await sb
      .from("landing_pages")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false });


  if (error) {

    list.innerHTML =
      `<div class="empty-box">${escapeHtml(error.message)}</div>`;

    return;
  }


  if (!data || !data.length) {

    list.innerHTML =
      '<div class="empty-box">لا توجد صفحات محفوظة.</div>';

    return;
  }


  list.innerHTML = data
    .map(page => {

      const business =
        businesses.find(
          b => b.id === page.business_id
        );


      const slug =
        page.content?.slug || "";


      const status =
        page.published
          ? "منشورة"
          : "مسودة";


      return `

        <div class="landing-item">

          <div class="landing-item-info">

            <b>
              ${escapeHtml(
                page.title ||
                page.content?.headline ||
                "صفحة هبوط"
              )}
            </b>

            <small>
              النشاط:
              ${escapeHtml(
                business?.name || "غير معروف"
              )}
            </small>

            <small>
              الرابط:
              ${escapeHtml(slug)}
            </small>

            <small>
              الحالة:
              ${status}
            </small>

          </div>


          <div class="landing-actions">

            <button
              class="btn danger"
              type="button"
              onclick="deleteLanding('${page.id}')"
            >
              حذف
            </button>

          </div>

        </div>

      `;

    })
    .join("");

}


/* =========================================================
   حذف صفحة
========================================================= */

async function deleteLanding(id) {

  if (!confirm("هل تريد حذف صفحة الهبوط؟")) {
    return;
  }


  /*
    نحدد الصفحة من الصفحات التابعة لأنشطة المستخدم
    قبل تنفيذ الحذف.
  */

  const { data: page, error: findError } =
    await sb
      .from("landing_pages")
      .select("id,business_id")
      .eq("id", id)
      .single();


  if (findError || !page) {

    alert(
      findError?.message ||
      "لم يتم العثور على الصفحة."
    );

    return;
  }


  const ownsBusiness =
    businesses.some(
      b => b.id === page.business_id
    );


  if (!ownsBusiness) {

    alert("غير مسموح بحذف هذه الصفحة.");

    return;
  }


  const { error } =
    await sb
      .from("landing_pages")
      .delete()
      .eq("id", id);


  if (error) {

    alert(error.message);

    return;
  }


  await loadLandings();

}


/* =========================================================
   تحويل الرابط إلى Slug
========================================================= */

function normalizeSlug(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

}


/* =========================================================
   رسائل النظام
========================================================= */

function show(id, text, error = false) {

  const el =
    document.getElementById(id);


  if (!el) return;


  el.textContent = text;

  el.className =
    "message " +
    (error ? "error" : "success");

}


/* =========================================================
   حماية النصوص
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      })[character]
    );

                                           }
