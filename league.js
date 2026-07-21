const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

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
    client
      .from("races")
      .select("*")
      .eq("league_id", id)
      .order("race_date", { ascending: true })
      .order("race_time", { ascending: true }),
    client
      .from("league_rankings")
      .select("*")
      .eq("league_id", id)
      .maybeSingle()
  ]);

  if (leagueResult.error) {
    page.innerHTML = `<div class="empty-state">League not found.</div>`;
    return;
  }

  const league = leagueResult.data;
  const ranking = rankingResult.data;
  const races = (racesResult.data || []).filter((race) => race.is_archived !== true);
  const now = DateTime.now();

  const liveRaces = races.filter((race) => race.is_live === true);
  const upcomingRaces = races
    .filter((race) => getRaceDateTime(race) >= now && race.is_live !== true)
    .sort((a, b) => getRaceDateTime(a).toMillis() - getRaceDateTime(b).toMillis());

  const historyRaces = races
    .filter((race) => getRaceDateTime(race) < now && race.is_live !== true)
    .sort((a, b) => getRaceDateTime(b).toMillis() - getRaceDateTime(a).toMillis());

  const nextRace = upcomingRaces[0] || null;

  document.title = `${league.name} | FN Leagues`;

  page.innerHTML = `
    <section
      class="league-profile-hero glass hero-reveal"
      ${league.banner_url ? `style="--league-banner:url('${escapeAttribute(league.banner_url)}')"` : ""}
    >
      <div class="league-profile-shade"></div>
      <div class="league-profile-glow"></div>

      <div class="league-profile-main">
        <div class="league-page-logo logo-float">
          ${
            league.logo_url
              ? `<img src="${escapeAttribute(league.logo_url)}" alt="${escapeHtml(league.name)} logo">`
              : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
          }
        </div>

        <div class="league-profile-copy">
          <div class="league-profile-labels">
            <span class="eyebrow">${escapeHtml(league.category || "RACING LEAGUE")}</span>
            ${league.featured ? `<span class="featured-pill">FEATURED</span>` : ""}
          </div>

          <h1>${escapeHtml(league.name)}</h1>
          <p>${escapeHtml(league.description || "Fortnite racing league community.")}</p>

          <div class="league-profile-actions">
            ${
              league.discord_url
                ? `<a class="button primary" href="${safeUrl(league.discord_url)}" target="_blank" rel="noopener">Join Discord</a>`
                : ""
            }

            ${
              league.website_url
                ? `<a class="button secondary" href="${safeUrl(league.website_url)}" target="_blank" rel="noopener">Website</a>`
                : ""
            }
          </div>

          ${renderSocialLinks(league)}
        </div>
      </div>

      <div class="league-summary-grid">
        <article>
          <span>Ranking</span>
          <strong>${ranking ? `#${ranking.position}` : "—"}</strong>
        </article>

        <article>
          <span>Tier</span>
          ${
            ranking
              ? `<strong class="summary-tier tier-${String(ranking.tier || "C").toLowerCase()}">${escapeHtml(String(ranking.tier || "C").toUpperCase())}</strong>`
              : `<strong>—</strong>`
          }
        </article>

        <article>
          <span>Upcoming</span>
          <strong>${upcomingRaces.length}</strong>
        </article>

        <article>
          <span>Sessions held</span>
          <strong>${historyRaces.length}</strong>
        </article>
      </div>
    </section>

    ${
      liveRaces.length
        ? `
          <section class="league-live-section scroll-scene" id="league-live">
            <div class="section-heading">
              <div>
                <span class="eyebrow">RACING NOW</span>
                <h2>Live Events</h2>
              </div>
            </div>

            <div class="league-live-grid">
              ${liveRaces.map(renderLiveRace).join("")}
            </div>
          </section>
        `
        : ""
    }

    <section class="league-overview-grid scroll-scene">
      <article class="glass league-info-panel reveal-card">
        <span class="eyebrow">LEAGUE STATUS</span>
        <h2>${ranking ? `Ranked #${ranking.position}` : "Not ranked yet"}</h2>

        ${
          ranking
            ? `
              <div class="league-tier-showcase tier-${String(ranking.tier || "C").toLowerCase()}">
                <span>${escapeHtml(String(ranking.tier || "C").toUpperCase())}</span>
                <strong>Tier</strong>
              </div>
            `
            : `<p class="muted">A ranking has not been assigned to this league yet.</p>`
        }

        <div class="league-information-list">
          <div>
            <span>Category</span>
            <strong>${escapeHtml(league.category || "Racing League")}</strong>
          </div>

          <div>
            <span>Abbreviation</span>
            <strong>${escapeHtml(league.abbreviation || "—")}</strong>
          </div>

          <div>
            <span>Featured</span>
            <strong>${league.featured ? "Yes" : "No"}</strong>
          </div>

          <div>
            <span>Recorded sessions</span>
            <strong>${historyRaces.length}</strong>
          </div>
        </div>
      </article>

      <article class="glass next-event-panel reveal-card">
        <span class="eyebrow">NEXT EVENT</span>

        ${
          nextRace
            ? `
              <div class="next-event-date">
                <strong>${getRaceDateTime(nextRace).toLocal().toFormat("d")}</strong>
                <span>${getRaceDateTime(nextRace).toLocal().toFormat("LLL")}</span>
              </div>

              <h2>${escapeHtml(nextRace.event_name || "Race event")}</h2>

              <p>
                ${nextRace.circuit ? `${escapeHtml(nextRace.circuit)} · ` : ""}
                ${getRaceDateTime(nextRace).toLocal().toFormat("cccc, h:mm a")}
              </p>

              <div class="viewer-zone-note">
                Shown in ${escapeHtml(Intl.DateTimeFormat().resolvedOptions().timeZone)}
              </div>

              <div
                class="event-countdown"
                data-race-countdown
                data-race-date="${escapeAttribute(nextRace.race_date)}"
                data-race-time="${escapeAttribute(String(nextRace.race_time || "00:00").slice(0, 5))}"
                data-race-zone="${escapeAttribute(nextRace.timezone || "UTC")}"
              >
                <div><strong data-days>0</strong><span>Days</span></div>
                <div><strong data-hours>0</strong><span>Hours</span></div>
                <div><strong data-minutes>0</strong><span>Minutes</span></div>
                <div><strong data-seconds>0</strong><span>Seconds</span></div>
              </div>

              ${
                nextRace.event_url
                  ? `<a class="button secondary" href="${safeUrl(nextRace.event_url)}" target="_blank" rel="noopener">Open Event</a>`
                  : ""
              }
            `
            : `<div class="empty-state compact-empty">No upcoming races have been scheduled.</div>`
        }
      </article>
    </section>

    <section class="league-events-section scroll-scene" id="league-events">
      <div class="section-heading">
        <div>
          <span class="eyebrow">UPCOMING SESSIONS</span>
          <h2>Race Schedule</h2>
        </div>

        <span class="viewer-timezone-chip">
          ${escapeHtml(Intl.DateTimeFormat().resolvedOptions().timeZone)}
        </span>
      </div>

      ${
        upcomingRaces.length
          ? `<div class="league-event-timeline">${upcomingRaces.map((race, index) => renderUpcomingRace(race, index)).join("")}</div>`
          : `<div class="empty-state">No upcoming races have been added.</div>`
      }
    </section>

    <section class="league-history-section scroll-scene" id="league-history">
      <div class="section-heading">
        <div>
          <span class="eyebrow">ARCHIVE</span>
          <h2>Session History</h2>
        </div>

        <span class="history-count">${historyRaces.length} recorded</span>
      </div>

      ${
        historyRaces.length
          ? `<div class="league-history-list">${historyRaces.map((race, index) => renderHistoryRace(race, index)).join("")}</div>`
          : `<div class="empty-state">No completed sessions have been recorded yet.</div>`
      }
    </section>
  `;

  initializeCountdowns();
  initializeAnimations();
  initializeScrollExperience();
}

function renderSocialLinks(league) {
  const links = [
    {
      label: "Instagram",
      url: league.instagram_url,
      icon: "IG"
    },
    {
      label: "YouTube",
      url: league.youtube_url,
      icon: "YT"
    },
    {
      label: "Twitch",
      url: league.twitch_url,
      icon: "TW"
    }
  ].filter((item) => item.url);

  if (!links.length) return "";

  return `
    <div class="league-social-links">
      ${links.map((link) => `
        <a href="${safeUrl(link.url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(link.label)}">
          <span>${link.icon}</span>
          ${escapeHtml(link.label)}
        </a>
      `).join("")}
    </div>
  `;
}

function renderLiveRace(race) {
  return `
    <article class="league-live-card reveal-card">
      <div class="live-card-topline">
        <span class="live-pill"><span class="live-dot"></span>LIVE</span>
        <span>${formatViewerDateTime(race)}</span>
      </div>

      <h3>${escapeHtml(race.event_name || "Live race")}</h3>

      <p>
        ${race.circuit ? escapeHtml(race.circuit) : "Live racing event"}
      </p>

      <div class="live-card-actions">
        ${
          race.stream_url
            ? `<a class="button primary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Watch Live</a>`
            : ""
        }

        ${
          race.event_url
            ? `<a class="button secondary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Event Link</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderUpcomingRace(race, index) {
  const local = getRaceDateTime(race).toLocal();

  return `
    <article class="league-event-row reveal-card" style="--timeline-delay:${index * 70}ms">
      <div class="timeline-marker">
        <span></span>
      </div>

      <div class="timeline-date">
        <strong>${local.toFormat("d")}</strong>
        <span>${local.toFormat("LLL")}</span>
      </div>

      <div class="timeline-content">
        <span class="eyebrow">${escapeHtml(race.category || "RACE EVENT")}</span>
        <h3>${escapeHtml(race.event_name || "Race event")}</h3>

        <p>
          ${race.circuit ? `${escapeHtml(race.circuit)} · ` : ""}
          ${local.toFormat("cccc, h:mm a")}
        </p>

        <small>
          League time: ${formatOriginalDateTime(race)}
          (${escapeHtml(race.timezone || "UTC")})
        </small>

        <div
          class="inline-race-countdown"
          data-race-countdown
          data-race-date="${escapeAttribute(race.race_date)}"
          data-race-time="${escapeAttribute(String(race.race_time || "00:00").slice(0, 5))}"
          data-race-zone="${escapeAttribute(race.timezone || "UTC")}"
        >
          <span><strong data-days>0</strong>d</span>
          <span><strong data-hours>0</strong>h</span>
          <span><strong data-minutes>0</strong>m</span>
          <span><strong data-seconds>0</strong>s</span>
        </div>
      </div>

      ${
        race.event_url
          ? `<a class="button secondary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Open</a>`
          : ""
      }
    </article>
  `;
}

function renderHistoryRace(race, index) {
  const local = getRaceDateTime(race).toLocal();

  return `
    <article class="history-race-card reveal-card" style="--history-delay:${index * 55}ms">
      <div class="history-race-date">
        <strong>${local.toFormat("d")}</strong>
        <span>${local.toFormat("LLL yyyy")}</span>
      </div>

      <div class="history-race-main">
        <div class="history-race-labels">
          <span class="session-complete-pill">COMPLETED</span>
          <span>${escapeHtml(race.category || "Race Session")}</span>
        </div>

        <h3>${escapeHtml(race.event_name || "Race session")}</h3>

        <p>
          ${race.circuit ? escapeHtml(race.circuit) : "Circuit not specified"}
          · ${local.toFormat("h:mm a")}
        </p>
      </div>

      <div class="history-race-actions">
        ${
          race.event_url
            ? `<a class="button secondary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Event Link</a>`
            : ""
        }

        ${
          race.stream_url
            ? `<a class="button secondary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Replay / Stream</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function initializeCountdowns() {
  const countdowns = [...document.querySelectorAll("[data-race-countdown]")];

  if (!countdowns.length) return;

  function update() {
    countdowns.forEach((countdown) => {
      const race = {
        race_date: countdown.dataset.raceDate,
        race_time: countdown.dataset.raceTime,
        timezone: countdown.dataset.raceZone
      };

      const distance =
        getRaceDateTime(race).toMillis() -
        DateTime.now().toMillis();

      const values = distance > 0
        ? luxon.Duration.fromMillis(distance).shiftTo(
            "days",
            "hours",
            "minutes",
            "seconds"
          )
        : {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
          };

      countdown.querySelector("[data-days]").textContent =
        Math.max(0, Math.floor(values.days || 0));

      countdown.querySelector("[data-hours]").textContent =
        Math.max(0, Math.floor(values.hours || 0));

      countdown.querySelector("[data-minutes]").textContent =
        Math.max(0, Math.floor(values.minutes || 0));

      countdown.querySelector("[data-seconds]").textContent =
        Math.max(0, Math.floor(values.seconds || 0));

      countdown.classList.toggle("countdown-complete", distance <= 0);
    });
  }

  update();
  setInterval(update, 1000);
}

function getLeagueInitials(league) {
  return (
    league.abbreviation ||
    String(league.name || "LG").slice(0, 3).toUpperCase()
  );
}

function getRaceDateTime(race) {
  const zone = normalizeZone(race.timezone);
  const time = String(race.race_time || "00:00").slice(0, 5);

  const value = DateTime.fromISO(
    `${race.race_date}T${time}`,
    { zone }
  );

  return value.isValid
    ? value
    : DateTime.fromISO(
        `${race.race_date}T${time}`,
        { zone: "UTC" }
      );
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
  return getRaceDateTime(race)
    .toLocal()
    .toFormat("ccc, d LLL · h:mm a");
}

function formatOriginalDateTime(race) {
  return getRaceDateTime(race)
    .toFormat("ccc, d LLL · h:mm a");
}

function initializeAnimations() {
  const hero = document.querySelector(".hero-reveal");
  requestAnimationFrame(() => hero?.classList.add("is-visible"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.13
    }
  );

  document.querySelectorAll(".reveal-card, .section-heading").forEach(
    (item, index) => {
      item.style.setProperty(
        "--reveal-delay",
        `${Math.min(index * 50, 280)}ms`
      );

      observer.observe(item);
    }
  );
}

function initializeScrollExperience() {
  const progress = document.getElementById("scrollProgress");
  const scenes = [...document.querySelectorAll(".scroll-scene")];

  function updateProgress() {
    const maximum =
      document.documentElement.scrollHeight - window.innerHeight;

    const amount =
      maximum > 0
        ? window.scrollY / maximum
        : 0;

    progress.style.transform =
      `scaleX(${Math.min(Math.max(amount, 0), 1)})`;
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;

    requestAnimationFrame(() => {
      updateProgress();

      scenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const progress =
          1 -
          Math.min(
            Math.max(
              Math.abs(
                rect.top + rect.height / 2 - window.innerHeight / 2
              ) /
              (window.innerHeight + rect.height),
              0
            ),
            1
          );

        scene.style.setProperty(
          "--scene-progress",
          progress.toFixed(3)
        );
      });

      ticking = false;
    });

    ticking = true;
  }

  window.addEventListener("scroll", onScroll, {
    passive: true
  });

  window.addEventListener("resize", onScroll);
  onScroll();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle(
          "scene-active",
          entry.isIntersecting
        );
      });
    },
    {
      threshold: 0.15
    }
  );

  scenes.forEach((scene) => observer.observe(scene));
}

function safeUrl(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "#";
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

function escapeAttribute(value) {
  return escapeHtml(value);
}
