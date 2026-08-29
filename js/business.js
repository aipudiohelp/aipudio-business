let currentUser = null;
let currentBusiness = null;

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();

  if (!session || !window.supabaseClient) return;

  currentUser = session.user;

  await loadBusiness();
  await loadProducts();

  const saveButton = document.getElementById("saveBusiness");
  const addProductButton = document.getElementById("addProductBtn");

  if (saveButton) {
    saveButton.addEventListener("click", saveBusiness);
  }

  if (addProductButton) {
    addProductButton.addEventListener("click", addProduct);
  }
});

async function loadBusiness() {
  const { data, error } = await sb
    .from("businesses")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    show("businessMessage", error.message, true);
    return;
  }

  currentBusiness = data;

  if (!data) return;

  document.getElementById("businessName").value = data.name || "";
  document.getElementById("businessSlug").value = data.slug || "";
  document.getElementById("businessDescription").value =
    data.description || "";

  document.getElementById("businessWhatsapp").value =
    data.whatsapp || data.phone || "";
}

async function saveBusiness() {
  if (!currentUser) {
    show("businessMessage", "لم يتم العثور على حساب المستخدم.", true);
    return;
  }

  const name =
    document.getElementById("businessName")?.value.trim() || "";

  const slug =
    document.getElementById("businessSlug")?.value.trim() || "";

  const description =
    document.getElementById("businessDescription")?.value.trim() || "";

  const whatsapp =
    document.getElementById("businessWhatsapp")?.value.trim() || "";

  if (!name) {
    show("businessMessage", "من فضلك أدخل اسم النشاط.", true);
    return;
  }

  if (!slug) {
    show("businessMessage", "من فضلك أدخل الرابط المختصر للنشاط.", true);
    return;
  }

  const payload = {
    user_id: currentUser.id,
    name: name,
    slug: slug,
    description: description,
    whatsapp: whatsapp,
    is_active: true
  };

  let result;

  if (currentBusiness?.id) {
    result = await sb
      .from("businesses")
      .update(payload)
      .eq("id", currentBusiness.id)
      .eq("user_id", currentUser.id)
      .select()
      .single();
  } else {
    result = await sb
      .from("businesses")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    show("businessMessage", result.error.message, true);
    return;
  }

  currentBusiness = result.data;

  show(
    "businessMessage",
    "تم حفظ بيانات النشاط بنجاح."
  );

  await loadProducts();
}

async function loadProducts() {
  const list = document.getElementById("productsList");

  if (!list) return;

  if (!currentBusiness?.id) {
    list.innerHTML =
      '<div class="empty">احفظ بيانات النشاط أولًا، ثم يمكنك إضافة المنتجات.</div>';

    return;
  }

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("business_id", currentBusiness.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML =
      `<div class="empty">تعذر تحميل المنتجات: ${escapeHtml(
        error.message
      )}</div>`;

    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML =
      '<div class="empty">لا توجد منتجات حتى الآن.</div>';

    return;
  }

  list.innerHTML = data
    .map(
      (product) => `
        <div class="item">

          <div>
            <b>${escapeHtml(product.name || "بدون اسم")}</b>

            <small>
              ${escapeHtml(product.description || "")}
            </small>

            ${
              product.price !== null &&
              product.price !== undefined
                ? `
                  <small>
                    السعر:
                    ${escapeHtml(product.price)}
                    ${escapeHtml(product.currency || "EGP")}
                  </small>
                `
                : ""
            }
          </div>

          <button
            class="btn danger"
            onclick="deleteProduct('${escapeHtml(product.id)}')"
          >
            حذف
          </button>

        </div>
      `
    )
    .join("");
}

async function addProduct() {
  if (!currentBusiness?.id) {
    alert("احفظ بيانات النشاط أولًا.");
    return;
  }

  const name = prompt("اسم المنتج:");

  if (!name || !name.trim()) return;

  const description =
    prompt("وصف المنتج (اختياري):") || "";

  const priceInput =
    prompt("السعر (اختياري):");

  let price = null;

  if (
    priceInput !== null &&
    priceInput.trim() !== ""
  ) {
    const parsedPrice = Number(priceInput);

    if (!Number.isFinite(parsedPrice)) {
      alert("السعر يجب أن يكون رقمًا صحيحًا.");
      return;
    }

    price = parsedPrice;
  }

  const payload = {
    business_id: currentBusiness.id,
    name: name.trim(),
    slug: createSlug(name),
    description: description.trim(),
    price: price,
    currency: "EGP",
    is_active: true
  };

  const { error } = await sb
    .from("products")
    .insert(payload);

  if (error) {
    alert(error.message);
    return;
  }

  await loadProducts();
}

async function deleteProduct(id) {
  if (!currentBusiness?.id) return;

  const confirmed =
    confirm("هل تريد حذف هذا المنتج؟");

  if (!confirmed) return;

  const { error } = await sb
    .from("products")
    .delete()
    .eq("id", id)
    .eq("business_id", currentBusiness.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadProducts();
}

function createSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80)
    || `product-${Date.now()}`;
}

function show(id, text, error = false) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent = text;

  element.className =
    "message " +
    (error ? "error" : "success");
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    }
  );
}
