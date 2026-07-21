const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let leagueCache = [];

document.addEventListener("DOMContentLoaded", initialize);
$("loginForm").addEventListener("submit", login);
$("logoutButton").addEventListener("click", () => client.auth.signOut());
$("leagueForm").addEventListener("submit", saveLeague);
$("clearFormButton").addEventListener("click", clearForm);
document.querySelectorAll(".admin-nav button[data-tab]").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

async function initialize() {
  try {
    validateConfig();
    const { data: { session } } = await client.auth.getSession();
    session ? await showDashboard(session.user) : showLogin();
    client.auth.onAuthStateChange(async (_e, session) => session ? await showDashboard(session.user) : showLogin());
  } catch (e) { $("loginMessage").textContent = e.message; }
}

async function login(e) {
  e.preventDefault();
  $("loginMessage").textContent = "Signing in…";
  const { error } = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  $("loginMessage").textContent = error ? error.message : "";
}

function showLogin() { $("loginView").classList.remove("hidden"); $("dashboardView").classList.add("hidden"); }
async function showDashboard(user) {
  $("loginView").classList.add("hidden"); $("dashboardView").classList.remove("hidden"); $("adminEmail").textContent = user.email || "Admin";
  await Promise.all([loadStats(), loadLeagues()]);
}
function validateConfig(){if(SUPABASE_URL.includes("PASTE_")||SUPABASE_PUBLISHABLE_KEY.includes("PASTE_"))throw new Error("Complete config.js first.");}

async function loadStats() {
  const [a,b,c,d] = await Promise.all([
    client.from("leagues").select("*",{count:"exact",head:true}),
    client.from("races").select("*",{count:"exact",head:true}),
    client.from("races").select("*",{count:"exact",head:true}).eq("is_live",true),
    client.from("league_rankings").select("*",{count:"exact",head:true})
  ]);
  $("adminLeagueCount").textContent=a.count??0; $("adminRaceCount").textContent=b.count??0;
  $("adminLiveCount").textContent=c.count??0; $("adminRankingCount").textContent=d.count??0;
}

async function loadLeagues() {
  const { data, error } = await client.from("leagues").select("*").order("created_at",{ascending:false});
  if(error){$("leagueMessage").textContent=error.message;return;}
  leagueCache=data||[]; renderLeagueList(); $("adminLeagueCount").textContent=leagueCache.length;
}

function renderLeagueList() {
  $("adminLeagueEmpty").classList.toggle("hidden",leagueCache.length>0);
  $("adminLeagueList").innerHTML=leagueCache.map(l=>`
    <article class="admin-list-row">
      <div class="admin-list-logo">${l.logo_url?`<img src="${esc(l.logo_url)}" alt="">`:`<span>${esc(l.abbreviation||l.name.slice(0,3).toUpperCase())}</span>`}</div>
      <div class="admin-list-copy"><strong>${esc(l.name)}</strong><span>${esc(l.category||"Racing League")}${l.featured?" · Featured":""}</span></div>
      <div class="admin-row-actions">
        <button class="button secondary" onclick="editLeague(${l.id})">Edit</button>
        <button class="button danger" onclick="deleteLeague(${l.id},'${escJs(l.name)}')">Delete</button>
      </div>
    </article>`).join("");
}

window.editLeague = function(id) {
  const l=leagueCache.find(x=>x.id===id); if(!l)return;
  switchTab("leagues");
  $("leagueId").value=l.id; $("leagueName").value=l.name||""; $("leagueAbbreviation").value=l.abbreviation||"";
  $("leagueCategory").value=l.category||""; $("leagueDiscord").value=l.discord_url||""; $("leagueWebsite").value=l.website_url||"";
  $("leagueDescription").value=l.description||""; $("leagueFeatured").checked=l.featured===true;
  $("formTitle").textContent="Edit League";
  $("assetPreview").innerHTML=`${l.logo_url?`<img src="${esc(l.logo_url)}" alt="Current logo">`:""}${l.banner_url?`<img src="${esc(l.banner_url)}" alt="Current banner">`:""}`;
  window.scrollTo({top:0,behavior:"smooth"});
}

window.deleteLeague = async function(id,name) {
  if(!confirm(`Delete ${name}? This will also remove its linked races and ranking.`))return;
  const { error }=await client.from("leagues").delete().eq("id",id);
  if(error){alert(error.message);return;} clearForm(); await Promise.all([loadLeagues(),loadStats()]);
}

async function saveLeague(e) {
  e.preventDefault(); $("leagueMessage").textContent="Saving…";
  try {
    const id=$("leagueId").value;
    const current=id?leagueCache.find(x=>String(x.id)===String(id)):null;
    const logoUrl=await uploadAsset($("leagueLogo").files[0],"logos",current?.logo_url);
    const bannerUrl=await uploadAsset($("leagueBanner").files[0],"banners",current?.banner_url);
    const payload={
      name:$("leagueName").value.trim(), abbreviation:$("leagueAbbreviation").value.trim()||null,
      category:$("leagueCategory").value.trim()||null, description:$("leagueDescription").value.trim()||null,
      discord_url:$("leagueDiscord").value.trim()||null, website_url:$("leagueWebsite").value.trim()||null,
      featured:$("leagueFeatured").checked, logo_url:logoUrl, banner_url:bannerUrl
    };
    const result=id?await client.from("leagues").update(payload).eq("id",id):await client.from("leagues").insert(payload);
    if(result.error)throw result.error;
    $("leagueMessage").textContent=id?"League updated.":"League added.";
    clearForm(false); await Promise.all([loadLeagues(),loadStats()]);
  } catch(e){$("leagueMessage").textContent=e.message;}
}

async function uploadAsset(file,folder,existingUrl) {
  if(!file)return existingUrl||null;
  if(file.size>5*1024*1024)throw new Error("Images must be 5 MB or smaller.");
  const ext=(file.name.split(".").pop()||"png").toLowerCase();
  const path=`${folder}/${crypto.randomUUID()}.${ext}`;
  const { error }=await client.storage.from("league-assets").upload(path,file,{cacheControl:"3600",upsert:false});
  if(error)throw error;
  return client.storage.from("league-assets").getPublicUrl(path).data.publicUrl;
}

function clearForm(clearMessage=true) {
  $("leagueForm").reset(); $("leagueId").value=""; $("formTitle").textContent="Add League"; $("assetPreview").innerHTML="";
  if(clearMessage)$("leagueMessage").textContent="";
}

function switchTab(tab) {
  $("overviewTab").classList.toggle("hidden",tab!=="overview"); $("leaguesTab").classList.toggle("hidden",tab!=="leagues");
  $("adminTitle").textContent=tab==="overview"?"Dashboard":"Leagues";
  document.querySelectorAll(".admin-nav button[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escJs(v){return String(v??"").replaceAll("\\","\\\\").replaceAll("'","\\'").replaceAll("\n"," ");}
