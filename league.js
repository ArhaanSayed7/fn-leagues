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

  const [leagueResult, racesResult, rankingResult, galleryResult] = await Promise.all([
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
      .maybeSingle(),

    client
      .from("league_gallery")
      .select("*")
      .eq("league_id", id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  if (leagueResult.error) {
    page.innerHTML = `<div class="empty-state">League not found.</div>`;
    return;
  }

  const league = leagueResult.data;
  const ranking = rankingResult.data;
  const gallery = galleryResult.data || [];
  const races = (racesResult.data || []).filter(
    (race) => race.is_archived !== true
  );

  const now = DateTime.now();
  const liveRaces = races.filter((race) => race.is_live === true);
  const upcomingRaces = races
    .filter((race) => getRaceDateTime(race) >= now && race.is_live !== true)
    .sort((a, b) => getRaceDateTime(a).toMillis() - getRaceDateTime(b).toMillis());

  const nextRace = upcomingRaces[0] || null;
  const theme = getTheme(league.theme_key);
  const accent = league.accent_color || theme.accent;

  document.title = `${league.name} | FN Leagues`;

  document.documentElement.style.setProperty("--league-accent", accent);
  document.documentElement.style.setProperty("--league-gradient", theme.gradient);
  document.body.classList.add(`league-theme-${league.theme_key || "aurora"}`);

  page.innerHTML = `
    <section
      class="league-showcase-hero hero-reveal"
      ${
        league.banner_url
          ? `style="--league-banner:url('${escapeHtml(league.banner_url)}')"`
          : ""
      }
    >
      <div class="league-theme-wash"></div>
      <div class="league-hero-particles"></div>
      <div class="league-hero-grid"></div>

      <div class="league-showcase-content">
        <div class="league-showcase-logo logo-float">
          ${
            league.logo_url
              ? `<img src="${escapeHtml(league.logo_url)}" alt="${escapeHtml(league.name)} logo">`
              : `<span>${escapeHtml(getLeagueInitials(league))}</span>`
          }
        </div>

        <div class="league-showcase-copy">
          <div class="league-showcase-labels">
            <span class="eyebrow">${escapeHtml(league.category || "RACING LEAGUE")}</span>
            ${renderLeagueBadge(league.badge_type)}
            ${league.featured ? `<span class="featured-pill">FEATURED</span>` : ""}
          </div>

          <h1>${escapeHtml(league.name)}</h1>

          <p>
            ${escapeHtml(
              league.description ||
              "Fortnite racing league community."
            )}
          </p>

          <div class="league-showcase-actions">
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

            ${
              league.contact_url
                ? `<a class="button secondary" href="${safeUrl(league.contact_url)}" target="_blank" rel="noopener">Contact</a>`
                : ""
            }
          </div>

          ${renderSocialLinks(league)}
        </div>
      </div>

      <div class="league-showcase-meta">
        <article>
          <span>Ranking</span>
          <strong>${ranking ? `#${ranking.position}` : "—"}</strong>
        </article>

        <article>
          <span>Tier</span>
          ${
            ranking
              ? `<strong class="summary-tier tier-${String(ranking.tier || "C").toLowerCase()}">${escapeHtml(String(ranking.tier || "C"))}</strong>`
              : `<strong>—</strong>`
          }
        </article>

        <article>
          <span>Owner</span>
          <strong>${escapeHtml(league.owner_name || "—")}</strong>
        </article>

        <article>
          <span>Theme</span>
          <strong>${escapeHtml(theme.label)}</strong>
        </article>
      </div>
    </section>

    <section class="league-identity-grid scroll-scene">
      <article class="glass league-about-card reveal-card">
        <span class="eyebrow">ABOUT THE LEAGUE</span>
        <h2>${escapeHtml(league.name)}</h2>

        <p>
          ${escapeHtml(
            league.description ||
            "No detailed league description has been added yet."
          )}
        </p>

        <div class="league-about-details">
          <div>
            <span>Owner</span>
            <strong>${escapeHtml(league.owner_name || "Not listed")}</strong>
          </div>

          <div>
            <span>Category</span>
            <strong>${escapeHtml(league.category || "Racing League")}</strong>
          </div>

          <div>
            <span>Abbreviation</span>
            <strong>${escapeHtml(league.abbreviation || "—")}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              ${renderBadgeText(league.badge_type)}
            </strong>
          </div>
        </div>
      </article>

      <article class="glass league-staff-card reveal-card">
        <span class="eyebrow">LEAGUE TEAM</span>
        <h2>Staff</h2>

        ${
          Array.isArray(league.staff_members) && league.staff_members.length
            ? `
              <div class="league-staff-list">
                ${league.staff_members
                  .map((name, index) => `
                    <div class="league-staff-member">
                      <span>${index + 1}</span>
                      <strong>${escapeHtml(name)}</strong>
                    </div>
                  `)
                  .join("")}
              </div>
            `
            : `<div class="empty-state compact-empty">No staff members have been listed.</div>`
        }
      </article>
    </section>

    <section class="league-gallery-section scroll-scene">
      <div class="section-heading">
        <div>
          <span class="eyebrow">LEAGUE MEDIA</span>
          <h2>Gallery</h2>
        </div>

        ${
          gallery.length
            ? `<span class="section-note">${gallery.length} image${gallery.length === 1 ? "" : "s"}</span>`
            : ""
        }
      </div>

      ${
        gallery.length
          ? `
            <div class="league-gallery-grid">
              ${gallery.map((item, index) => renderGalleryItem(item, index)).join("")}
            </div>
          `
          : `<div class="empty-state">No gallery images have been added.</div>`
      }
    </section>

    <div id="galleryLightbox" class="gallery-lightbox hidden" aria-hidden="true">
      <button id="lightboxClose" class="lightbox-close" type="button" aria-label="Close gallery">×</button>
      <button id="lightboxPrevious" class="lightbox-nav lightbox-previous" type="button" aria-label="Previous image">←</button>

      <figure>
        <img id="lightboxImage" alt="">
        <figcaption id="lightboxCaption"></figcaption>
      </figure>

      <button id="lightboxNext" class="lightbox-nav lightbox-next" type="button" aria-label="Next image">→</button>
    </div>

    <section class="league-next-race-section scroll-scene">
      <div class="section-heading">
        <div>
          <span class="eyebrow">NEXT ON TRACK</span>
          <h2>Next Race</h2>
        </div>
      </div>

      ${
        nextRace
          ? renderNextRace(nextRace, league)
          : `<div class="empty-state">No upcoming race has been scheduled.</div>`
      }
    </section>

    ${
      liveRaces.length
        ? `
          <section class="league-live-section scroll-scene">
            <div class="section-heading">
              <div>
                <span class="eyebrow">LIVE NOW</span>
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
  `;

  initializeGalleryLightbox(gallery);
  initializeCountdowns();
  initializeAnimations();
  initializeScrollExperience();
}

function getTheme(themeKey) {
  const themes = {
    aurora: {
      label: "Aurora",
      accent: "#9c7ddd",
      gradient: "linear-gradient(135deg,#f2a8d0,#a78be8,#8fc6ff)"
    },
    velocity: {
      label: "Velocity",
      accent: "#4e8cff",
      gradient: "linear-gradient(135deg,#2f63ff,#6cb7ff,#b2ddff)"
    },
    inferno: {
      label: "Inferno",
      accent: "#ff6a3d",
      gradient: "linear-gradient(135deg,#ff3d3d,#ff7a32,#ffc06a)"
    },
    nebula: {
      label: "Nebula",
      accent: "#8f62ff",
      gradient: "linear-gradient(135deg,#5a3ac8,#8f62ff,#d7a8ff)"
    },
    monochrome: {
      label: "Monochrome",
      accent: "#5f6570",
      gradient: "linear-gradient(135deg,#252932,#6f7682,#d7d9df)"
    },
    neon: {
      label: "Neon",
      accent: "#16d4b5",
      gradient: "linear-gradient(135deg,#00d4ff,#16d4b5,#9aff62)"
    }
  };

  return themes[themeKey] || themes.aurora;
}

function renderLeagueBadge(type) {
  if (!type) return "";

  const badges = {
    verified: { label: "VERIFIED", icon: "✓" },
    featured: { label: "FEATURED", icon: "★" },
    partner: { label: "OFFICIAL PARTNER", icon: "◆" }
  };

  const badge = badges[type];
  if (!badge) return "";

  return `
    <span class="league-badge badge-${type}">
      <span>${badge.icon}</span>
      ${badge.label}
    </span>
  `;
}

function renderBadgeText(type) {
  const labels = {
    verified: "Verified",
    featured: "Featured",
    partner: "Official Partner"
  };

  return labels[type] || "Standard";
}

function renderSocialLinks(league) {
  const links = [
    { label: "Instagram", url: league.instagram_url, icon: "IG" },
    { label: "YouTube", url: league.youtube_url, icon: "YT" },
    { label: "Twitch", url: league.twitch_url, icon: "TW" }
  ].filter((item) => item.url);

  if (!links.length) return "";

  return `
    <div class="league-social-links">
      ${links.map((link) => `
        <a href="${safeUrl(link.url)}" target="_blank" rel="noopener">
          <span>${link.icon}</span>
          ${escapeHtml(link.label)}
        </a>
      `).join("")}
    </div>
  `;
}


function renderGalleryItem(item, index) {
  return `
    <button
      class="league-gallery-item reveal-card ${item.is_featured ? "gallery-featured" : ""}"
      type="button"
      data-gallery-index="${index}"
      aria-label="Open gallery image"
    >
      <img
        src="${escapeHtml(item.image_url)}"
        alt="${escapeHtml(item.caption || "League gallery image")}"
        loading="lazy"
      >

      <div class="gallery-item-overlay">
        ${item.is_featured ? `<span class="featured-pill">FEATURED</span>` : ""}
        <strong>${escapeHtml(item.caption || "View image")}</strong>
      </div>
    </button>
  `;
}

function initializeGalleryLightbox(gallery) {
  if (!gallery.length) return;

  const lightbox = document.getElementById("galleryLightbox");
  const image = document.getElementById("lightboxImage");
  const caption = document.getElementById("lightboxCaption");
  let activeIndex = 0;

  function show(index) {
    activeIndex = (index + gallery.length) % gallery.length;
    const item = gallery[activeIndex];

    image.src = item.image_url;
    image.alt = item.caption || "League gallery image";
    caption.textContent = item.caption || "";

    lightbox.classList.remove("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  }

  function close() {
    lightbox.classList.add("hidden");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
  }

  document.querySelectorAll("[data-gallery-index]").forEach((button) => {
    button.addEventListener("click", () => {
      show(Number(button.dataset.galleryIndex));
    });
  });

  document.getElementById("lightboxClose").addEventListener("click", close);
  document.getElementById("lightboxPrevious").addEventListener("click", () => show(activeIndex - 1));
  document.getElementById("lightboxNext").addEventListener("click", () => show(activeIndex + 1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.classList.contains("hidden")) return;

    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(activeIndex - 1);
    if (event.key === "ArrowRight") show(activeIndex + 1);
  });
}

function renderNextRace(race, league) {
  const local = getRaceDateTime(race).toLocal();

  return `
    <article class="league-premium-race-card glass reveal-card">
      <div class="league-premium-race-visual">
        ${
          league.banner_url
            ? `<img src="${escapeHtml(league.banner_url)}" alt="">`
            : ""
        }
        <div class="league-premium-race-overlay"></div>
      </div>

      <div class="league-premium-race-content">
        <span class="eyebrow">${escapeHtml(race.category || "RACE EVENT")}</span>
        <h3>${escapeHtml(race.event_name || "Race Event")}</h3>

        <p>
          ${race.circuit ? `${escapeHtml(race.circuit)} · ` : ""}
          ${local.toFormat("cccc, d LLL yyyy · h:mm a")}
        </p>

        <div
          class="event-countdown"
          data-race-countdown
          data-race-date="${escapeHtml(race.race_date)}"
          data-race-time="${escapeHtml(String(race.race_time || "00:00").slice(0, 5))}"
          data-race-zone="${escapeHtml(race.timezone || "UTC")}"
        >
          <div><strong data-days>0</strong><span>Days</span></div>
          <div><strong data-hours>0</strong><span>Hours</span></div>
          <div><strong data-minutes>0</strong><span>Minutes</span></div>
          <div><strong data-seconds>0</strong><span>Seconds</span></div>
        </div>

        <div class="card-actions">
          ${
            race.event_url
              ? `<a class="button primary" href="${safeUrl(race.event_url)}" target="_blank" rel="noopener">Open Event</a>`
              : ""
          }

          ${
            league.discord_url
              ? `<a class="button secondary" href="${safeUrl(league.discord_url)}" target="_blank" rel="noopener">Join Discord</a>`
              : ""
          }

          ${
            race.stream_url
              ? `<a class="button secondary" href="${safeUrl(race.stream_url)}" target="_blank" rel="noopener">Watch Stream</a>`
              : ""
          }
        </div>
      </div>
    </article>
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
      <p>${race.circuit ? escapeHtml(race.circuit) : "Live racing event"}</p>

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

      const values =
        distance > 0
          ? luxon.Duration.fromMillis(distance).shiftTo(
              "days",
              "hours",
              "minutes",
              "seconds"
            )
          : { days: 0, hours: 0, minutes: 0, seconds: 0 };

      setValue(countdown, "[data-days]", values.days);
      setValue(countdown, "[data-hours]", values.hours);
      setValue(countdown, "[data-minutes]", values.minutes);
      setValue(countdown, "[data-seconds]", values.seconds);
    });
  }

  update();
  setInterval(update, 1000);
}

function setValue(container, selector, value) {
  const element = container.querySelector(selector);
  if (element) element.textContent = Math.max(0, Math.floor(value || 0));
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

function getLeagueInitials(league) {
  return (
    league.abbreviation ||
    String(league.name || "LG").slice(0, 3).toUpperCase()
  );
}

function initializeAnimations() {
  const hero = document.querySelector(".hero-reveal");

  requestAnimationFrame(() => {
    hero?.classList.add("is-visible");
  });

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

  document
    .querySelectorAll(".reveal-card, .section-heading")
    .forEach((item) => observer.observe(item));
}

function initializeScrollExperience() {
  const progress = document.getElementById("scrollProgress");

  function update() {
    const max =
      document.documentElement.scrollHeight -
      window.innerHeight;

    const ratio = max > 0 ? window.scrollY / max : 0;
    progress.style.transform =
      `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
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
