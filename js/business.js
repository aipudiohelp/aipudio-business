let currentUser = null;
let currentBusiness = null;

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !sb) return;
  currentUser = session.user;
  await loadBusiness();
  await loadProducts();
  document.getElementById("saveBusiness").addEventListener("click", saveBusiness);
  document.getElementById("addProductBtn").addEventListener("click", addProduct);
});

async function loadBusiness() {
  const { data, error } = await sb.from("businesses").select("*").eq("owner_id", currentUser.id).limit(1).maybeSingle();
  if (error) { show("businessMessage", error.message, true); return; }
  currentBusiness = data;
  if (data) {
    document.getElementById("businessName").value = data.name || "";
    document.getElementById("businessSlug").value = data.slug || "";
    document.getElementById("businessDescription").value = data.description || "";
    document.getElementById("businessWhatsapp").value = data.whatsapp || data.phone || "";
  }
}

async function saveBusiness() {
  const payload = {
    owner_id: currentUser.id,
    name: document.getElementById("businessName").value.trim(),
    slug: document.getElementById("businessSlug").value.trim(),
    description: document.getElementById("businessDescription").value.trim(),
    whatsapp: document.getElementById("businessWhatsapp").value.trim()
  };
  const result = currentBusiness
    ? await sb.from("businesses").update(payload).eq("id", currentBusiness.id).select().single()
    : await sb.from("businesses").insert(payload).select().single();
  if (result.error) show("businessMessage", result.error.message, true);
  else { currentBusiness = result.data; show("businessMessage","تم حفظ بيانات النشاط بنجاح."); }
}

async function loadProducts() {
  const list = document.getElementById("productsList");
  if (!currentUser) return;
  const { data, error } = await sb.from("products").select("*").eq("owner_id", currentUser.id).order("created_at",{ascending:false});
  if (error) { list.innerHTML = `<div class="empty">تعذر تحميل المنتجات: ${escapeHtml(error.message)}</div>`; return; }
  if (!data?.length) { list.innerHTML = '<div class="empty">لا توجد منتجات حتى الآن.</div>'; return; }
  list.innerHTML = data.map(p => `<div class="item"><div><b>${escapeHtml(p.name || "بدون اسم")}</b><small>${escapeHtml(p.description || "")}</small></div><button class="btn danger" onclick="deleteProduct('${p.id}')">حذف</button></div>`).join("");
}

async function addProduct() {
  const name = prompt("اسم المنتج:");
  if (!name) return;
  const description = prompt("وصف المنتج (اختياري):") || "";
  const { error } = await sb.from("products").insert({owner_id:currentUser.id,name,description});
  if (error) alert(error.message); else loadProducts();
}

async function deleteProduct(id) {
  if (!confirm("حذف المنتج؟")) return;
  const { error } = await sb.from("products").delete().eq("id",id).eq("owner_id",currentUser.id);
  if (error) alert(error.message); else loadProducts();
}

function show(id,text,error=false){const el=document.getElementById(id);el.textContent=text;el.className="message "+(error?"error":"success")}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}