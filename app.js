const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let leagues = [];

document.addEventListener("DOMContentLoaded", loadPublicSite);

async function loadPublicSite() {
  try {
    validateConfiguration();

    const [leagueResult, raceResult, rankingResult] = await Promise.all([
      supabaseClient.from("leagues").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("races").select("*").order("race_date", { ascending: true }),
      supabaseClient
        .from("league_rankings")
        .select("*, leagues(name, abbreviation, logo_url)")
        .order("position", { ascending: true })
    ]);

    throwIfError(leagueResult.error);
    throwIfError(raceResult.error);
    throwIfError(rankingResult.error);

    leagues = leagueResult.data || [];
    const races = raceResult.data || [];
    const rankings = rankingResult.data || [];

    renderStats(leagues, races);
    renderLiveRaces(races);
    renderSchedule(races);
    renderRankings(rankings);
    renderLeagues(leagues);

    document.getElementById("connectionStatus").textContent = "Connected to Supabase";
  } catch (error) {
    console.error(error);
    document.getElementById("connectionStatus").textContent =
      `Connection problem: ${error.message}`;
  }
}

function validateConfiguration() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    throw new Error("Add your Supabase URL and publishable key in config.js");
  }
}

function throwIfError(error) {
  if (error) throw error;
}

function renderStats(allLeagues, races) {
  const now = new Date();
  const upcoming = races.filter((race) => getRaceDate(race) >= now);
  const live = races.filter((race) => race.is_live === true);

  document.getElementById("leagueCount").textContent = allLeagues.length;
  document.getElementById("upcomingCount").textContent = upcoming.length;
  document.getElementById("liveCount").textContent = live.length;
}

function renderLiveRaces(races) {
  const live = races.filter((race) => race.is_live === true);
  const grid = document.getElementById("liveGrid");
  const empty = document.getElementById("liveEmpty");

  empty.classList.toggle("hidden", live.length > 0);

  grid.innerHTML = live.map((race) => `
    <article class="content-card live-card">
      <span class="live-pill">LIVE</span>
      <h3>${escapeHtml(race.league_name)}</h3>
      <p>${escapeHtml(race.event_name || "Live race")}${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}</p>
      ${race.stream_url ? `<a class="button primary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Watch Live</a>` : ""}
    </article>
  `).join("");
}

function renderSchedule(races) {
  const now = new Date();
  const upcoming = races
    .filter((race) => getRaceDate(race) >= now)
    .sort((a, b) => getRaceDate(a) - getRaceDate(b));

  const list = document.getElementById("scheduleList");
  const empty = document.getElementById("scheduleEmpty");

  empty.classList.toggle("hidden", upcoming.length > 0);

  list.innerHTML = upcoming.map((race) => `
    <article class="schedule-card">
      <div>
        <strong>${formatDate(race.race_date)}</strong>
        <span>${formatTime(race.race_time)} ${escapeHtml(race.timezone || "")}</span>
      </div>
      <div>
        <h3>${escapeHtml(race.league_name)}</h3>
        <p>${escapeHtml(race.event_name || "Race event")}${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}</p>
      </div>
      ${race.event_url ? `<a class="button secondary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Open</a>` : ""}
    </article>
  `).join("");
}

function renderRankings(rankings) {
  const body = document.getElementById("rankingBody");
  const empty = document.getElementById("rankingEmpty");
  const wrap = document.querySelector(".ranking-wrap");

  empty.classList.toggle("hidden", rankings.length > 0);
  wrap.classList.toggle("hidden", rankings.length === 0);

  body.innerHTML = rankings.map((ranking) => `
    <tr>
      <td><strong>#${ranking.position}</strong></td>
      <td>${escapeHtml(ranking.leagues?.name || "Unknown league")}</td>
      <td>${ranking.points}</td>
      <td>${ranking.wins}</td>
      <td>${ranking.podiums}</td>
      <td>${ranking.rating ?? "—"}</td>
    </tr>
  `).join("");
}

function renderLeagues(items) {
  const grid = document.getElementById("leagueGrid");
  const empty = document.getElementById("leagueEmpty");

  empty.classList.toggle("hidden", items.length > 0);

  grid.innerHTML = items.map((league) => `
    <article class="content-card">
      <div class="logo-frame">
        ${
          league.logo_url
            ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo">`
            : `<span>${escapeHtml(league.abbreviation || league.name.slice(0, 3).toUpperCase())}</span>`
        }
      </div>
      <span class="eyebrow">${escapeHtml(league.category || "RACING LEAGUE")}</span>
      <h3>${escapeHtml(league.name)}</h3>
      <p>${escapeHtml(league.description || "Fortnite racing league community.")}</p>
      <div class="card-actions">
        <a class="button secondary" href="league.html?id=${league.id}">View League</a>
        ${league.discord_url ? `<a class="button primary" href="${safeUrl(league.discord_url)}" target="_blank" rel="noopener">Discord</a>` : ""}
      </div>
    </article>
  `).join("");
}

document.getElementById("leagueSearch").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  renderLeagues(
    leagues.filter((league) =>
      [league.name, league.category, league.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  );
});

function getRaceDate(race) {
  const time = String(race.race_time || "00:00").slice(0, 5);
  return new Date(`${race.race_date}T${time}:00`);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
