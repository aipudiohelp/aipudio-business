let landingUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session || !sb) return;
  landingUser = session.user;
  document.getElementById("saveLanding").addEventListener("click", saveLanding);
  await loadLandings();
});

async function saveLanding() {
  const payload = {
    owner_id: landingUser.id,
    title: document.getElementById("pageTitle").value.trim(),
    slug: document.getElementById("pageSlug").value.trim(),
    headline: document.getElementById("pageHeadline").value.trim(),
    description: document.getElementById("pageDescription").value.trim(),
    image_url: document.getElementById("pageImage").value.trim(),
    whatsapp: document.getElementById("pageWhatsapp").value.trim()
  };
  if (!payload.title || !payload.slug) { show("landingMessage","اكتب عنوان الصفحة والرابط المختصر.",true); return; }
  const { error } = await sb.from("landing_pages").insert(payload);
  if (error) show("landingMessage", error.message, true);
  else {
    show("landingMessage","تم حفظ صفحة الهبوط.");
    ["pageTitle","pageSlug","pageHeadline","pageDescription","pageImage","pageWhatsapp"].forEach(id=>document.getElementById(id).value="");
    loadLandings();
  }
}

async function loadLandings() {
  const list = document.getElementById("landingList");
  const { data, error } = await sb.from("landing_pages").select("*").eq("owner_id", landingUser.id).order("created_at",{ascending:false});
  if (error) { list.innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`; return; }
  if (!data?.length) { list.innerHTML='<div class="empty">لا توجد صفحات محفوظة.</div>'; return; }
  list.innerHTML=data.map(p=>`<div class="item"><div><b>${escapeHtml(p.title||p.headline||"صفحة")}</b><small>${escapeHtml(p.slug||"")}</small></div><button class="btn danger" onclick="deleteLanding('${p.id}')">حذف</button></div>`).join("");
}
async function deleteLanding(id){if(!confirm("حذف الصفحة؟"))return;const{error}=await sb.from("landing_pages").delete().eq("id",id).eq("owner_id",landingUser.id);if(error)alert(error.message);else loadLandings()}
function show(id,text,error=false){const el=document.getElementById(id);el.textContent=text;el.className="message "+(error?"error":"success")}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}