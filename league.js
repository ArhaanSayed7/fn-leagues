const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const DateTime = luxon.DateTime;

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
    <section class="league-hero glass hero-reveal" ${league.banner_url ? `style="--league-banner:url('${escAttr(league.banner_url)}')"` : ""}>
      <div class="league-hero-overlay"></div>

      <div class="league-hero-content">
        <div class="league-page-logo logo-float">
          ${
            league.logo_url
              ? `<img src="${escAttr(league.logo_url)}" alt="${esc(league.name)} logo">`
              : `<span>${esc(league.abbreviation || league.name.slice(0, 3).toUpperCase())}</span>`
          }
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
      <article class="glass detail-panel reveal-card">
        <span class="eyebrow">LEAGUE RANKING</span>

        ${
          ranking
            ? `
              <div class="large-position">#${ranking.position}</div>

              <div class="mini-stats">
                <span><strong>${ranking.points}</strong> Points</span>
                <span><strong>${ranking.wins}</strong> Wins</span>
                <span><strong>${ranking.podiums}</strong> Podiums</span>
                <span><strong>${ranking.rating ?? "—"}</strong> Rating</span>
              </div>
            `
            : `<p class="muted">This league has not been ranked yet.</p>`
        }
      </article>

      <article class="glass detail-panel reveal-card">
        <span class="eyebrow">UPCOMING & LIVE</span>

        <div class="viewer-zone-note">
          Times shown in ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}
        </div>

        <div class="league-race-list">
          ${
            races.length
              ? races.map((race) => `
                  <div class="league-race-row">
                    <div>
                      ${race.is_live ? `<span class="live-pill"><span class="live-dot"></span>LIVE</span>` : ""}
                      <strong>${esc(race.event_name || "Race event")}</strong>
                      <small>${formatViewerDateTime(race)} · Your local time</small>
                      <small class="original-time">
                        League time: ${formatOriginalDateTime(race)} (${esc(race.timezone || "UTC")})
                      </small>
                    </div>

                    ${
                      race.is_live && race.stream_url
                        ? `<a class="button primary" target="_blank" rel="noopener" href="${safe(race.stream_url)}">Watch</a>`
                        : race.event_url
                          ? `<a class="button secondary" target="_blank" rel="noopener" href="${safe(race.event_url)}">Open</a>`
                          : ""
                    }
                  </div>
                `).join("")
              : `<p class="muted">No races have been added for this league.</p>`
          }
        </div>
      </article>
    </section>
  `;

  initializeAnimations();
}

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
  return getRaceDateTime(race).toLocal().toFormat("ccc, d LLL yyyy · h:mm a");
}

function formatOriginalDateTime(race) {
  return getRaceDateTime(race).toFormat("ccc, d LLL yyyy · h:mm a");
}

function initializeAnimations() {
  document.querySelector(".hero-reveal")?.classList.add("is-visible");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal-card").forEach((item) => observer.observe(item));
}

function safe(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escAttr(value) {
  return esc(value);
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
