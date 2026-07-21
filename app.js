const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const DateTime = luxon.DateTime;
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

    document.getElementById("connectionStatus").textContent =
      `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

    initializeAnimations();
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
  const now = DateTime.now();
  const upcoming = races.filter((race) => getRaceDateTime(race) >= now);
  const live = races.filter((race) => race.is_live === true);

  animateNumber(document.getElementById("leagueCount"), allLeagues.length);
  animateNumber(document.getElementById("upcomingCount"), upcoming.length);
  animateNumber(document.getElementById("liveCount"), live.length);
}

function renderLiveRaces(races) {
  const live = races.filter((race) => race.is_live === true);
  const grid = document.getElementById("liveGrid");
  const empty = document.getElementById("liveEmpty");

  empty.classList.toggle("hidden", live.length > 0);

  grid.innerHTML = live.map((race) => `
    <article class="content-card live-card reveal-card">
      <span class="live-pill"><span class="live-dot"></span>LIVE</span>
      <h3>${escapeHtml(race.league_name)}</h3>
      <p>
        ${escapeHtml(race.event_name || "Live race")}
        ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
      </p>
      <div class="local-time-line">
        ${formatViewerDateTime(race)}
      </div>
      ${race.stream_url ? `<a class="button primary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Watch Live</a>` : ""}
    </article>
  `).join("");
}

function renderSchedule(races) {
  const now = DateTime.now();

  const upcoming = races
    .filter((race) => getRaceDateTime(race) >= now)
    .sort((a, b) => getRaceDateTime(a).toMillis() - getRaceDateTime(b).toMillis());

  const list = document.getElementById("scheduleList");
  const empty = document.getElementById("scheduleEmpty");

  empty.classList.toggle("hidden", upcoming.length > 0);

  list.innerHTML = upcoming.map((race) => {
    const local = getRaceDateTime(race).toLocal();
    const originalZone = race.timezone || "UTC";

    return `
      <article class="schedule-card reveal-card">
        <div>
          <strong>${local.toFormat("ccc, d LLL yyyy")}</strong>
          <span>${local.toFormat("h:mm a")} · Your local time</span>
        </div>

        <div>
          <h3>${escapeHtml(race.league_name)}</h3>
          <p>
            ${escapeHtml(race.event_name || "Race event")}
            ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
          </p>
          <small class="original-time">
            League time: ${formatOriginalDateTime(race)} (${escapeHtml(originalZone)})
          </small>
        </div>

        ${race.event_url ? `<a class="button secondary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Open</a>` : ""}
      </article>
    `;
  }).join("");
}

function renderRankings(rankings) {
  const body = document.getElementById("rankingBody");
  const empty = document.getElementById("rankingEmpty");
  const wrap = document.querySelector(".ranking-wrap");

  empty.classList.toggle("hidden", rankings.length > 0);
  wrap.classList.toggle("hidden", rankings.length === 0);

  body.innerHTML = rankings.map((ranking, index) => `
    <tr class="ranking-row reveal-row" style="--row-delay:${index * 55}ms">
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
    <article class="content-card league-card reveal-card">
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

  initializeAnimations();
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

function getRaceDateTime(race) {
  const zone = normalizeZone(race.timezone);
  const time = String(race.race_time || "00:00").slice(0, 5);
  const value = DateTime.fromISO(`${race.race_date}T${time}`, { zone });

  return value.isValid
    ? value
    : DateTime.fromISO(`${race.race_date}T${time}`, { zone: "UTC" });
}

function normalizeZone(value) {
  const raw = String(value || "").trim();

  const aliases = {
    "GMT+4": "Asia/Dubai",
    "UTC+4": "Asia/Dubai",
    "GST": "Asia/Dubai",
    "GMT": "Europe/London",
    "UTC": "UTC"
  };

  return aliases[raw] || raw || "UTC";
}

function formatViewerDateTime(race) {
  return getRaceDateTime(race).toLocal().toFormat("ccc, d LLL · h:mm a");
}

function formatOriginalDateTime(race) {
  return getRaceDateTime(race).toFormat("ccc, d LLL · h:mm a");
}

function animateNumber(element, target) {
  const duration = 700;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased);

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function initializeAnimations() {
  const items = document.querySelectorAll(
    ".reveal-card:not(.is-visible), .section-heading:not(.is-visible), .reveal-row:not(.is-visible)"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index * 45, 300)}ms`);
    observer.observe(item);
  });
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


function initializeScrollExperience() {
  const progress = document.getElementById("scrollProgress");
  const navLinks = [...document.querySelectorAll(".site-header nav a[href^='#']")];
  const sections = [...document.querySelectorAll("main section[id]")];

  function updateProgress() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const ratio = maxScroll > 0 ? scrollY / maxScroll : 0;
    if (progress) progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;

    document.documentElement.style.setProperty("--scroll-y", `${scrollY}px`);
  }

  function updateActiveSection() {
    let activeId = "";

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= innerHeight * 0.35 && rect.bottom >= innerHeight * 0.35) {
        activeId = section.id;
        break;
      }
    }

    navLinks.forEach((link) => {
      link.classList.toggle("active-section", link.getAttribute("href") === `#${activeId}`);
    });
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;

    requestAnimationFrame(() => {
      updateProgress();
      updateActiveSection();
      ticking = false;
    });

    ticking = true;
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  document.querySelectorAll("main > section").forEach((section, index) => {
    section.classList.add("scroll-scene");
    section.style.setProperty("--scene-index", index);
  });

  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("scene-active", entry.isIntersecting);
      });
    },
    { threshold: 0.22 }
  );

  document.querySelectorAll(".scroll-scene").forEach((scene) => sceneObserver.observe(scene));
}

window.addEventListener('load', initializeScrollExperience);
