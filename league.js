const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

document.addEventListener("DOMContentLoaded", loadLeague);

async function loadLeague() {
  const page = document.getElementById("leaguePage");
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    page.innerHTML = `<div class="empty-state">No league was selected.</div>`;
    return;
  }

  const [leagueResult, racesResult, rankingResult] = await Promise.all([
    client.from("leagues").select("*").eq("id", id).single(),
    client.from("races").select("*").eq("league_id", id).order("race_date"),
    client.from("league_rankings").select("*").eq("league_id", id).maybeSingle()
  ]);

  if (leagueResult.error) {
    page.innerHTML = `<div class="empty-state">League not found.</div>`;
    return;
  }

  const league = leagueResult.data;
  const races = racesResult.data || [];
  const ranking = rankingResult.data;
  document.title = `${league.name} | FN Leagues`;

  page.innerHTML = `
    <section class="league-hero glass" ${league.banner_url ? `style="--league-banner:url('${escAttr(league.banner_url)}')"` : ""}>
      <div class="league-hero-overlay"></div>
      <div class="league-hero-content">
        <div class="league-page-logo">
          ${league.logo_url ? `<img src="${escAttr(league.logo_url)}" alt="${esc(league.name)} logo">` : `<span>${esc(league.abbreviation || league.name.slice(0,3).toUpperCase())}</span>`}
        </div>
        <div>
          <span class="eyebrow">${esc(league.category || "RACING LEAGUE")}</span>
          <h1>${esc(league.name)}</h1>
          <p>${esc(league.description || "Fortnite racing league community.")}</p>
          <div class="hero-actions">
            ${league.discord_url ? `<a class="button primary" target="_blank" rel="noopener" href="${safe(league.discord_url)}">Join Discord</a>` : ""}
            ${league.website_url ? `<a class="button secondary" target="_blank" rel="noopener" href="${safe(league.website_url)}">Website</a>` : ""}
          </div>
        </div>
      </div>
    </section>

    <section class="league-detail-grid">
      <article class="glass detail-panel">
        <span class="eyebrow">LEAGUE RANKING</span>
        ${ranking ? `
          <div class="large-position">#${ranking.position}</div>
          <div class="mini-stats">
            <span><strong>${ranking.points}</strong> Points</span>
            <span><strong>${ranking.wins}</strong> Wins</span>
            <span><strong>${ranking.podiums}</strong> Podiums</span>
            <span><strong>${ranking.rating ?? "—"}</strong> Rating</span>
          </div>` : `<p class="muted">This league has not been ranked yet.</p>`}
      </article>

      <article class="glass detail-panel">
        <span class="eyebrow">UPCOMING & LIVE</span>
        <div class="league-race-list">
          ${races.length ? races.map(r => `
            <div class="league-race-row">
              <div>
                ${r.is_live ? `<span class="live-pill">LIVE</span>` : ""}
                <strong>${esc(r.event_name || "Race event")}</strong>
                <small>${formatDate(r.race_date)} · ${formatTime(r.race_time)} ${esc(r.timezone || "")}</small>
              </div>
              ${(r.is_live && r.stream_url) ? `<a class="button primary" target="_blank" rel="noopener" href="${safe(r.stream_url)}">Watch</a>` :
                r.event_url ? `<a class="button secondary" target="_blank" rel="noopener" href="${safe(r.event_url)}">Open</a>` : ""}
            </div>`).join("") : `<p class="muted">No races have been added for this league.</p>`}
        </div>
      </article>
    </section>
  `;
}

function formatDate(v){return new Intl.DateTimeFormat("en",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${v}T12:00:00`));}
function formatTime(v){const [h,m]=String(v).split(":").map(Number);return new Intl.DateTimeFormat("en",{hour:"numeric",minute:"2-digit"}).format(new Date(2000,0,1,h,m));}
function safe(v){try{const u=new URL(v);return ["http:","https:"].includes(u.protocol)?u.href:"#";}catch{return "#";}}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escAttr(v){return esc(v);}
