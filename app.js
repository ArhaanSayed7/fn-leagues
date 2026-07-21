const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const DateTime = luxon.DateTime;

let leagues = [];
let races = [];
let rankings = [];
let communitySettings = {};
let scheduleSearchQuery = "";
let selectedScheduleLeague = "all";

document.addEventListener("DOMContentLoaded", initializeHomepage);

async function initializeHomepage() {
  try {
    validateConfiguration();

    const [leagueResult, raceResult, rankingResult, communityResult] = await Promise.all([
      supabaseClient
        .from("leagues")
        .select("*")
        .order("created_at", { ascending: false }),

      supabaseClient
        .from("races")
        .select("*")
        .order("race_date", { ascending: true })
        .order("race_time", { ascending: true }),

      supabaseClient
        .from("league_rankings")
        .select("*, leagues(name, abbreviation, logo_url, banner_url)")
        .order("position", { ascending: true }),

      supabaseClient
        .from("community_settings")
        .select("published")
        .eq("id", 1)
        .maybeSingle()
    ]);

    throwIfError(leagueResult.error);
    throwIfError(raceResult.error);
    throwIfError(rankingResult.error);
    throwIfError(communityResult.error);

    leagues = leagueResult.data || [];
    races = (raceResult.data || []).filter(
      (race) => race.is_archived !== true
    );
    rankings = rankingResult.data || [];
    communitySettings = communityResult.data?.published || {};

    renderHomepage();
    setupInteractions();
    initializeScrollExperience();

    document.getElementById("connectionStatus").textContent =
      `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  } catch (error) {
    console.error(error);

    document.getElementById("connectionStatus").textContent =
      `Connection problem: ${error.message}`;
  }
}

function renderHomepage() {
  renderCommunityHub();
  renderStats();
  renderHeroSpotlight();
  renderNextRaceFeature();
  renderLiveRaces();
  renderFeaturedCarousel();
  populateScheduleFilter();
  renderSchedule();
  renderRankings();
  renderLeagues(leagues);

  initializeRevealAnimations();
  initializeCountdowns();
}

function validateConfiguration() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    throw new Error("Add your Supabase details in config.js");
  }
}

function throwIfError(error) {
  if (error) throw error;
}


function renderCommunityHub() {
  renderAnnouncement();
  renderWeeklySpotlights();
  renderFeaturedStream();
  renderTrendingLeagues();
  renderRecentlyAdded();
}

function renderAnnouncement() {
  const container = document.getElementById("announcementBanner");
  const announcement = communitySettings.announcement || {};

  const expired =
    announcement.expires_at &&
    new Date(announcement.expires_at) < new Date();

  if (!announcement.enabled || !announcement.text || expired) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  const type = ["info", "success", "warning"].includes(announcement.type)
    ? announcement.type
    : "info";

  container.className = `community-announcement announcement-${type}`;

  container.innerHTML = `
    <div class="announcement-inner">
      <div>
        <strong>${escapeHtml(announcement.title || "FDH Announcement")}</strong>
        <span>${escapeHtml(announcement.text)}</span>
      </div>

      <div class="announcement-actions">
        ${
          announcement.button_url && announcement.button_text
            ? `
              <a
                class="button secondary"
                href="${safeUrl(announcement.button_url)}"
                target="_blank"
                rel="noopener"
              >
                ${escapeHtml(announcement.button_text)}
              </a>
            `
            : ""
        }

        <button
          class="announcement-close"
          type="button"
          aria-label="Dismiss announcement"
          onclick="this.closest('.community-announcement').classList.add('hidden')"
        >
          ×
        </button>
      </div>
    </div>
  `;
}

function renderWeeklySpotlights() {
  const section = document.getElementById("communitySpotlights");
  const league = leagues.find(
    (item) => String(item.id) === String(communitySettings.league_of_week_id)
  );
  const race = races.find(
    (item) => String(item.id) === String(communitySettings.race_of_week_id)
  );

  if (!league && !race) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  const leagueCard = document.getElementById("leagueOfWeekCard");
  const raceCard = document.getElementById("raceOfWeekCard");

  if (league) {
    const ranking = rankings.find((item) => item.league_id === league.id);

    leagueCard.classList.remove("hidden");
    leagueCard.style.setProperty(
      "--community-banner",
      league.banner_url ? `url('${league.banner_url}')` : "none"
    );

    leagueCard.innerHTML = `
      <div class="community-feature-overlay"></div>

      <div class="community-feature-content">
        <span class="community-feature-label">LEAGUE OF THE WEEK</span>

        <div class="community-feature-identity">
          <div class="community-feature-logo">
            ${
              league.logo_url
                ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo" loading="lazy" decoding="async">`
                : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
            }
          </div>

          <div>
            <span class="eyebrow">${escapeHtml(league.category || "RACING LEAGUE")}</span>
            <h3>${escapeHtml(league.name)}</h3>
          </div>
        </div>

        <p>${escapeHtml(league.description || "Fortnite racing league community.")}</p>

        <div class="community-feature-meta">
          ${
            ranking
              ? `<span class="tier-badge tier-${String(ranking.tier || "C").toLowerCase()}">${escapeHtml(String(ranking.tier || "C"))} Tier</span>`
              : ""
          }
          ${ranking ? `<span>#${ranking.position} Ranked</span>` : ""}
        </div>

        <div class="card-actions">
          <a class="button primary" href="league.html?id=${league.id}">View League</a>
          ${
            league.discord_url
              ? `<a class="button secondary" href="${safeUrl(league.discord_url)}" target="_blank" rel="noopener">Discord</a>`
              : ""
          }
        </div>
      </div>
    `;
  } else {
    leagueCard.classList.add("hidden");
  }

  if (race) {
    const linkedLeague = leagues.find((item) => item.id === race.league_id);
    const local = getRaceDateTime(race).toLocal();

    raceCard.classList.remove("hidden");
    raceCard.style.setProperty(
      "--community-banner",
      linkedLeague?.banner_url ? `url('${linkedLeague.banner_url}')` : "none"
    );

    raceCard.innerHTML = `
      <div class="community-feature-overlay"></div>

      <div class="community-feature-content">
        <span class="community-feature-label">RACE OF THE WEEK</span>

        <span class="eyebrow">${escapeHtml(race.league_name)}</span>
        <h3>${escapeHtml(race.event_name || "Race Event")}</h3>

        <p>
          ${race.circuit ? `${escapeHtml(race.circuit)} · ` : ""}
          ${local.toFormat("cccc, d LLL · h:mm a")}
        </p>

        <div
          class="community-race-countdown"
          data-race-countdown
          data-race-date="${escapeHtml(race.race_date)}"
          data-race-time="${escapeHtml(String(race.race_time || "00:00").slice(0, 5))}"
          data-race-zone="${escapeHtml(race.timezone || "UTC")}"
        >
          <span><strong data-days>0</strong>d</span>
          <span><strong data-hours>0</strong>h</span>
          <span><strong data-minutes>0</strong>m</span>
          <span><strong data-seconds>0</strong>s</span>
        </div>

        <div class="card-actions">
          ${
            race.stream_url
              ? `<a class="button primary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Watch</a>`
              : race.event_url
                ? `<a class="button primary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Open Event</a>`
                : ""
          }

          ${
            linkedLeague
              ? `<a class="button secondary" href="league.html?id=${linkedLeague.id}">League Page</a>`
              : ""
          }
        </div>
      </div>
    `;
  } else {
    raceCard.classList.add("hidden");
  }
}

function renderFeaturedStream() {
  const section = document.getElementById("featuredStreamSection");
  const container = document.getElementById("featuredStreamCard");
  const stream = communitySettings.featured_stream || {};

  if (!stream.enabled || !stream.url) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  const embed = getYouTubeEmbed(stream.url);

  container.innerHTML = `
    <div class="stream-player">
      ${
        embed
          ? `<iframe src="${embed}" title="${escapeHtml(stream.title || "Featured livestream")}" allowfullscreen loading="lazy"></iframe>`
          : `
            <div class="stream-placeholder">
              <span class="live-pill"><span class="live-dot"></span>FEATURED</span>
              <h3>${escapeHtml(stream.title || "Featured Community Stream")}</h3>
              <p>${escapeHtml(stream.description || "Open the featured broadcast in a new tab.")}</p>
              <a class="button primary" href="${safeUrl(stream.url)}" target="_blank" rel="noopener">Open Stream</a>
            </div>
          `
      }
    </div>

    <div class="stream-copy">
      <span class="eyebrow">FEATURED LIVESTREAM</span>
      <h3>${escapeHtml(stream.title || "Community Broadcast")}</h3>
      <p>${escapeHtml(stream.description || "Watch the latest featured FDH broadcast.")}</p>

      <a class="button secondary" href="${safeUrl(stream.url)}" target="_blank" rel="noopener">
        Watch Externally
      </a>
    </div>
  `;
}

function renderTrendingLeagues() {
  const section = document.getElementById("trending");
  const ids = Array.isArray(communitySettings.trending_league_ids)
    ? communitySettings.trending_league_ids
    : [];

  const selected = ids
    .map((id) => leagues.find((league) => String(league.id) === String(id)))
    .filter(Boolean);

  if (!selected.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  document.getElementById("trendingLeagueGrid").innerHTML = selected
    .slice(0, 6)
    .map((league, index) => communityLeagueCard(league, index, "TRENDING"))
    .join("");
}

function renderRecentlyAdded() {
  const section = document.getElementById("recent");

  if (communitySettings.show_recently_added === false || !leagues.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  const recent = [...leagues]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, Number(communitySettings.recently_added_limit || 6));

  document.getElementById("recentLeagueGrid").innerHTML = recent
    .map((league, index) => communityLeagueCard(league, index, "NEW"))
    .join("");
}

function communityLeagueCard(league, index, label) {
  return `
    <a
      class="community-mini-card reveal-card"
      href="league.html?id=${league.id}"
      style="--community-delay:${index * 60}ms"
    >
      <div class="community-mini-logo">
        ${
          league.logo_url
            ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo" loading="lazy" decoding="async">`
            : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
        }
      </div>

      <div>
        <span>${label}</span>
        <strong>${escapeHtml(league.name)}</strong>
        <small>${escapeHtml(league.category || "Racing League")}</small>
      </div>
    </a>
  `;
}

function getYouTubeEmbed(url) {
  try {
    const parsed = new URL(url);
    let id = "";

    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com")) {
      id = parsed.searchParams.get("v") || "";

      if (!id && parsed.pathname.includes("/embed/")) {
        id = parsed.pathname.split("/embed/")[1];
      }

      if (!id && parsed.pathname.includes("/live/")) {
        id = parsed.pathname.split("/live/")[1];
      }
    }

    id = id.split("?")[0].split("&")[0];

    return id
      ? `https://www.youtube.com/embed/${encodeURIComponent(id)}`
      : "";
  } catch {
    return "";
  }
}

function renderStats() {
  const now = DateTime.now();

  const upcoming = races.filter(
    (race) =>
      race.is_live !== true &&
      getRaceDateTime(race) >= now
  );

  const live = races.filter(
    (race) => race.is_live === true
  );

  animateNumber(
    document.getElementById("leagueCount"),
    leagues.length
  );

  animateNumber(
    document.getElementById("upcomingCount"),
    upcoming.length
  );

  animateNumber(
    document.getElementById("liveCount"),
    live.length
  );

  animateNumber(
    document.getElementById("rankedCount"),
    rankings.length
  );
}

function renderHeroSpotlight() {
  const featured = leagues.filter(
    (league) => league.featured === true
  );

  const spotlight = featured[0] || leagues[0] || null;
  const container = document.getElementById("heroSpotlight");

  if (!spotlight) {
    container.innerHTML = `
      <div class="empty-state">
        Add a league in the admin dashboard to create the spotlight.
      </div>
    `;
    return;
  }

  const ranking = rankings.find(
    (item) => item.league_id === spotlight.id
  );

  container.innerHTML = `
    <article
      class="spotlight-card"
      ${
        spotlight.banner_url
          ? `style="--spotlight-banner:url('${escapeHtml(spotlight.banner_url)}')"`
          : ""
      }
    >
      <div class="spotlight-shade"></div>

      <div class="spotlight-topline">
        <span class="spotlight-label">
          ${spotlight.featured ? "FEATURED LEAGUE" : "LEAGUE SPOTLIGHT"}
        </span>

        ${
          ranking
            ? `
              <span class="tier-badge tier-${String(ranking.tier || "C").toLowerCase()}">
                ${escapeHtml(String(ranking.tier || "C").toUpperCase())} Tier
              </span>
            `
            : ""
        }
      </div>

      <div class="spotlight-content">
        <div class="spotlight-logo">
          ${
            spotlight.logo_url
              ? `<img src="${escapeHtml(spotlight.logo_url)}" alt="${escapeHtml(spotlight.name)} logo" loading="lazy" decoding="async">`
              : `<span>${escapeHtml(getLeagueInitials(spotlight))}</span>`
          }
        </div>

        <div>
          <span class="eyebrow">
            ${escapeHtml(spotlight.category || "RACING LEAGUE")}
          </span>

          <h2>${escapeHtml(spotlight.name)}</h2>

          <p>
            ${escapeHtml(
              spotlight.description ||
              "Fortnite racing league community."
            )}
          </p>
        </div>
      </div>

      <div class="spotlight-actions">
        <a
          class="button primary"
          href="league.html?id=${spotlight.id}"
        >
          Explore League
        </a>

        ${
          spotlight.discord_url
            ? `
              <a
                class="button secondary"
                href="${safeUrl(spotlight.discord_url)}"
                target="_blank"
                rel="noopener"
              >
                Discord
              </a>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderNextRaceFeature() {
  const now = DateTime.now();

  const nextRace = races
    .filter(
      (race) =>
        race.is_live !== true &&
        getRaceDateTime(race) >= now
    )
    .sort(
      (a, b) =>
        getRaceDateTime(a).toMillis() -
        getRaceDateTime(b).toMillis()
    )[0];

  const container = document.getElementById("nextRaceFeature");

  if (!nextRace) {
    container.innerHTML = `
      <div class="empty-state">
        No upcoming races have been scheduled.
      </div>
    `;
    return;
  }

  const league = leagues.find(
    (item) => item.id === nextRace.league_id
  );

  const local = getRaceDateTime(nextRace).toLocal();

  container.innerHTML = `
    <div class="next-race-copy">
      <span class="eyebrow">NEXT ON THE GRID</span>

      <div class="next-race-identity">
        <div class="next-race-logo">
          ${
            league?.logo_url
              ? `<img src="${escapeHtml(league.logo_url)}" alt="" loading="lazy" decoding="async">`
              : `<span>${escapeHtml(league ? getLeagueInitials(league) : "FDH")}</span>`
          }
        </div>

        <div>
          <h2>${escapeHtml(nextRace.event_name || "Race event")}</h2>

          <p>
            ${escapeHtml(nextRace.league_name)}
            ${nextRace.circuit ? ` · ${escapeHtml(nextRace.circuit)}` : ""}
          </p>
        </div>
      </div>

      <div class="next-race-time">
        ${local.toFormat("cccc, d LLL yyyy · h:mm a")}
        <span>Your local time</span>
      </div>
    </div>

    <div
      class="homepage-countdown"
      data-race-countdown
      data-race-date="${escapeHtml(nextRace.race_date)}"
      data-race-time="${escapeHtml(String(nextRace.race_time || "00:00").slice(0, 5))}"
      data-race-zone="${escapeHtml(nextRace.timezone || "UTC")}"
    >
      <div><strong data-days>0</strong><span>Days</span></div>
      <div><strong data-hours>0</strong><span>Hours</span></div>
      <div><strong data-minutes>0</strong><span>Minutes</span></div>
      <div><strong data-seconds>0</strong><span>Seconds</span></div>
    </div>

    <div class="next-race-actions">
      ${
        nextRace.event_url
          ? `
            <a
              class="button primary"
              href="${safeUrl(nextRace.event_url)}"
              target="_blank"
              rel="noopener"
            >
              Open Event
            </a>
          `
          : ""
      }

      ${
        league
          ? `
            <a
              class="button secondary"
              href="league.html?id=${league.id}"
            >
              League Page
            </a>
          `
          : ""
      }
    </div>
  `;
}

function renderLiveRaces() {
  const live = races.filter(
    (race) => race.is_live === true
  );

  const grid = document.getElementById("liveGrid");
  const empty = document.getElementById("liveEmpty");

  empty.classList.toggle("hidden", live.length > 0);

  grid.innerHTML = live.map((race, index) => {
    const league = leagues.find(
      (item) => item.id === race.league_id
    );

    return `
      <article
        class="homepage-live-card reveal-card"
        style="--live-delay:${index * 80}ms"
      >
        <div class="homepage-live-visual">
          ${
            league?.banner_url
              ? `
                <img
                  src="${escapeHtml(league.banner_url)}"
                  alt=""
                >
              `
              : ""
          }

          <div class="homepage-live-overlay"></div>

          <span class="live-pill">
            <span class="live-dot"></span>
            LIVE
          </span>
        </div>

        <div class="homepage-live-content">
          <div class="homepage-live-league">
            <div class="homepage-live-logo">
              ${
                league?.logo_url
                  ? `<img src="${escapeHtml(league.logo_url)}" alt="" loading="lazy" decoding="async">`
                  : `<span>${escapeHtml(league ? getLeagueInitials(league) : "FDH")}</span>`
              }
            </div>

            <div>
              <small>${escapeHtml(race.league_name)}</small>
              <h3>${escapeHtml(race.event_name || "Live race")}</h3>
            </div>
          </div>

          <p>
            ${race.circuit ? escapeHtml(race.circuit) : "Live racing event"}
            · ${formatViewerDateTime(race)}
          </p>

          <div class="card-actions">
            ${
              race.stream_url
                ? `
                  <a
                    class="button primary"
                    href="${safeUrl(race.stream_url)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Watch Live
                  </a>
                `
                : ""
            }

            ${
              league
                ? `
                  <a
                    class="button secondary"
                    href="league.html?id=${league.id}"
                  >
                    League
                  </a>
                `
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderFeaturedCarousel() {
  const featured = leagues.filter(
    (league) => league.featured === true
  );

  const carousel = document.getElementById("featuredCarousel");
  const empty = document.getElementById("featuredEmpty");

  empty.classList.toggle("hidden", featured.length > 0);

  carousel.innerHTML = featured.map((league, index) => {
    const ranking = rankings.find(
      (item) => item.league_id === league.id
    );

    return `
      <article
        class="featured-slide reveal-card"
        style="--featured-delay:${index * 65}ms; ${
          league.banner_url
            ? `--featured-banner:url('${escapeHtml(league.banner_url)}')`
            : ""
        }"
      >
        <div class="featured-slide-overlay"></div>

        <div class="featured-slide-top">
          <div class="featured-slide-logo">
            ${
              league.logo_url
                ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo" loading="lazy" decoding="async">`
                : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
            }
          </div>

          ${
            ranking
              ? `
                <span class="tier-badge tier-${String(ranking.tier || "C").toLowerCase()}">
                  ${escapeHtml(String(ranking.tier || "C").toUpperCase())} Tier
                </span>
              `
              : ""
          }
        </div>

        <div class="featured-slide-content">
          <span class="eyebrow">
            ${escapeHtml(league.category || "RACING LEAGUE")}
          </span>

          <h3>${escapeHtml(league.name)}</h3>

          <p>
            ${escapeHtml(
              league.description ||
              "Fortnite racing league community."
            )}
          </p>

          <a
            class="button primary"
            href="league.html?id=${league.id}"
          >
            View League
          </a>
        </div>
      </article>
    `;
  }).join("");
}

function populateScheduleFilter() {
  const select = document.getElementById(
    "scheduleLeagueFilter"
  );

  select.innerHTML = `
    <option value="all">All leagues</option>
    ${leagues.map((league) => `
      <option value="${league.id}">
        ${escapeHtml(league.name)}
      </option>
    `).join("")}
  `;
}

function renderSchedule() {
  const now = DateTime.now();

  const filtered = races
    .filter(
      (race) =>
        race.is_live !== true &&
        getRaceDateTime(race) >= now
    )
    .filter((race) => {
      if (
        selectedScheduleLeague !== "all" &&
        String(race.league_id) !== selectedScheduleLeague
      ) {
        return false;
      }

      if (!scheduleSearchQuery) return true;

      return [
        race.league_name,
        race.event_name,
        race.category,
        race.circuit
      ]
        .join(" ")
        .toLowerCase()
        .includes(scheduleSearchQuery);
    })
    .sort(
      (a, b) =>
        getRaceDateTime(a).toMillis() -
        getRaceDateTime(b).toMillis()
    );

  const list = document.getElementById("scheduleList");
  const empty = document.getElementById("scheduleEmpty");

  empty.classList.toggle("hidden", filtered.length > 0);

  list.innerHTML = filtered.map((race, index) => {
    const local = getRaceDateTime(race).toLocal();
    const league = leagues.find(
      (item) => item.id === race.league_id
    );

    return `
      <article
        class="homepage-schedule-card reveal-card"
        style="--schedule-delay:${index * 55}ms"
      >
        <div class="homepage-schedule-date">
          <strong>${local.toFormat("d")}</strong>
          <span>${local.toFormat("LLL")}</span>
        </div>

        <div class="homepage-schedule-logo">
          ${
            league?.logo_url
              ? `<img src="${escapeHtml(league.logo_url)}" alt="" loading="lazy" decoding="async">`
              : `<span>${escapeHtml(league ? getLeagueInitials(league) : "FDH")}</span>`
          }
        </div>

        <div class="homepage-schedule-main">
          <span class="eyebrow">
            ${escapeHtml(race.category || "RACE EVENT")}
          </span>

          <h3>${escapeHtml(race.event_name || "Race event")}</h3>

          <p>
            ${escapeHtml(race.league_name)}
            ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
          </p>

          <small>
            ${local.toFormat("cccc · h:mm a")} · Your local time
          </small>
        </div>

        <div
          class="schedule-mini-countdown"
          data-race-countdown
          data-race-date="${escapeHtml(race.race_date)}"
          data-race-time="${escapeHtml(String(race.race_time || "00:00").slice(0, 5))}"
          data-race-zone="${escapeHtml(race.timezone || "UTC")}"
        >
          <span><strong data-days>0</strong>d</span>
          <span><strong data-hours>0</strong>h</span>
          <span><strong data-minutes>0</strong>m</span>
        </div>

        ${
          race.event_url
            ? `
              <a
                class="button secondary"
                href="${safeUrl(race.event_url)}"
                target="_blank"
                rel="noopener"
              >
                Open
              </a>
            `
            : ""
        }
      </article>
    `;
  }).join("");

  initializeRevealAnimations();
  initializeCountdowns();
}

function renderRankings() {
  const body = document.getElementById("rankingBody");
  const empty = document.getElementById("rankingEmpty");
  const wrap = document.querySelector(".ranking-wrap");
  const topRankings = rankings.slice(0, 10);

  empty.classList.toggle("hidden", topRankings.length > 0);
  wrap.classList.toggle("hidden", topRankings.length === 0);

  body.innerHTML = topRankings.map((ranking, index) => {
    const league = ranking.leagues || {};
    const fallback =
      league.abbreviation ||
      String(league.name || "LG")
        .slice(0, 3)
        .toUpperCase();

    const bannerStyle = league.banner_url
      ? `style="--ranking-banner:url('${escapeHtml(league.banner_url)}')"`
      : "";

    return `
      <tr
        class="ranking-row reveal-row tier-${String(ranking.tier || "C").toLowerCase()}"
        style="--row-delay:${index * 55}ms"
      >
        <td class="ranking-position-cell">
          <strong>#${ranking.position}</strong>
        </td>

        <td class="ranking-league-cell" ${bannerStyle}>
          <div class="ranking-league-overlay"></div>

          <div class="ranking-league-content">
            <div class="ranking-league-logo">
              ${
                league.logo_url
                  ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name || "League")} logo">`
                  : `<span>${escapeHtml(fallback)}</span>`
              }
            </div>

            <div>
              <strong>
                ${escapeHtml(league.name || "Unknown league")}
              </strong>

              <small>
                ${escapeHtml(league.abbreviation || "")}
              </small>
            </div>
          </div>
        </td>

        <td class="ranking-tier-cell">
          <span
            class="tier-badge tier-${String(ranking.tier || "C").toLowerCase()}"
          >
            ${escapeHtml(String(ranking.tier || "C").toUpperCase())} Tier
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function renderLeagues(items) {
  const grid = document.getElementById("leagueGrid");
  const empty = document.getElementById("leagueEmpty");

  empty.classList.toggle("hidden", items.length > 0);

  grid.innerHTML = items.map((league, index) => `
    <article
      class="content-card league-card reveal-card"
      style="--league-delay:${index * 45}ms"
    >
      <div class="logo-frame">
        ${
          league.logo_url
            ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo" loading="lazy" decoding="async">`
            : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
        }
      </div>

      <span class="eyebrow">
        ${escapeHtml(league.category || "RACING LEAGUE")}
      </span>

      <h3>${escapeHtml(league.name)}</h3>

      <p>
        ${escapeHtml(
          league.description ||
          "Fortnite racing league community."
        )}
      </p>

      <div class="card-actions">
        <a
          class="button secondary"
          href="league.html?id=${league.id}"
        >
          View League
        </a>

        ${
          league.discord_url
            ? `
              <a
                class="button primary"
                href="${safeUrl(league.discord_url)}"
                target="_blank"
                rel="noopener"
              >
                Discord
              </a>
            `
            : ""
        }
      </div>
    </article>
  `).join("");

  initializeRevealAnimations();
}

function setupInteractions() {
  document
    .getElementById("leagueSearch")
    .addEventListener("input", (event) => {
      const query = event.target.value
        .toLowerCase()
        .trim();

      renderLeagues(
        leagues.filter((league) =>
          [
            league.name,
            league.category,
            league.description
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      );
    });

  document
    .getElementById("scheduleSearch")
    .addEventListener("input", (event) => {
      scheduleSearchQuery = event.target.value
        .toLowerCase()
        .trim();

      renderSchedule();
    });

  document
    .getElementById("scheduleLeagueFilter")
    .addEventListener("change", (event) => {
      selectedScheduleLeague = event.target.value;
      renderSchedule();
    });

  const carousel = document.getElementById(
    "featuredCarousel"
  );

  document
    .getElementById("featuredPrevious")
    .addEventListener("click", () => {
      carousel.scrollBy({
        left: -420,
        behavior: "smooth"
      });
    });

  document
    .getElementById("featuredNext")
    .addEventListener("click", () => {
      carousel.scrollBy({
        left: 420,
        behavior: "smooth"
      });
    });

  document
    .getElementById("mobileMenuButton")
    .addEventListener("click", () => {
      document
        .getElementById("mainNavigation")
        .classList.toggle("open");
    });

  document
    .querySelectorAll("#mainNavigation a")
    .forEach((link) => {
      link.addEventListener("click", () => {
        document
          .getElementById("mainNavigation")
          .classList.remove("open");
      });
    });
}

function initializeCountdowns() {
  const countdowns = [
    ...document.querySelectorAll(
      "[data-race-countdown]"
    )
  ];

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

      const values =
        distance > 0
          ? luxon.Duration
              .fromMillis(distance)
              .shiftTo(
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

      setCountdownValue(
        countdown,
        "[data-days]",
        values.days
      );

      setCountdownValue(
        countdown,
        "[data-hours]",
        values.hours
      );

      setCountdownValue(
        countdown,
        "[data-minutes]",
        values.minutes
      );

      setCountdownValue(
        countdown,
        "[data-seconds]",
        values.seconds
      );
    });
  }

  update();

  clearInterval(window.homepageCountdownTimer);

  window.homepageCountdownTimer =
    setInterval(update, 1000);
}

function setCountdownValue(
  container,
  selector,
  value
) {
  const element = container.querySelector(selector);

  if (element) {
    element.textContent =
      Math.max(0, Math.floor(value || 0));
  }
}

function getRaceDateTime(race) {
  const zone = normalizeZone(race.timezone);

  const time = String(
    race.race_time || "00:00"
  ).slice(0, 5);

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

function getLeagueInitials(league) {
  return (
    league.abbreviation ||
    String(league.name || "LG")
      .slice(0, 3)
      .toUpperCase()
  );
}

function animateNumber(element, target) {
  const duration = 850;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min(
      (now - start) / duration,
      1
    );

    const eased =
      1 - Math.pow(1 - progress, 3);

    element.textContent =
      Math.round(target * eased);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function initializeRevealAnimations() {
  const items = document.querySelectorAll(
    ".reveal-card:not(.is-visible), " +
    ".reveal-row:not(.is-visible), " +
    ".section-heading:not(.is-visible)"
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
    item.style.setProperty(
      "--reveal-delay",
      `${Math.min(index * 45, 320)}ms`
    );

    observer.observe(item);
  });
}

function initializeScrollExperience() {
  const progress = document.getElementById(
    "scrollProgress"
  );

  const sections = [
    ...document.querySelectorAll(
      "main section[id]"
    )
  ];

  const navigationLinks = [
    ...document.querySelectorAll(
      ".site-header nav a[href^='#']"
    )
  ];

  let ticking = false;

  function update() {
    const maximum =
      document.documentElement.scrollHeight -
      window.innerHeight;

    const amount =
      maximum > 0
        ? window.scrollY / maximum
        : 0;

    progress.style.transform =
      `scaleX(${Math.min(Math.max(amount, 0), 1)})`;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();

      const distance =
        Math.abs(
          rect.top +
          rect.height / 2 -
          window.innerHeight / 2
        );

      const sceneProgress =
        1 -
        Math.min(
          distance /
          (window.innerHeight + rect.height),
          1
        );

      section.style.setProperty(
        "--scene-progress",
        sceneProgress.toFixed(3)
      );
    });

    const activeSection = sections.find(
      (section) => {
        const rect =
          section.getBoundingClientRect();

        return (
          rect.top <= window.innerHeight * 0.36 &&
          rect.bottom >= window.innerHeight * 0.36
        );
      }
    );

    navigationLinks.forEach((link) => {
      link.classList.toggle(
        "active-section",
        activeSection &&
        link.getAttribute("href") ===
          `#${activeSection.id}`
      );
    });

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener(
    "scroll",
    requestUpdate,
    { passive: true }
  );

  window.addEventListener(
    "resize",
    requestUpdate
  );

  requestUpdate();

  const sceneObserver =
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle(
            "scene-active",
            entry.isIntersecting
          );
        });
      },
      { threshold: 0.15 }
    );

  document
    .querySelectorAll(".scroll-scene")
    .forEach((scene) => {
      sceneObserver.observe(scene);
    });
}

function safeUrl(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(
      url.protocol
    )
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
