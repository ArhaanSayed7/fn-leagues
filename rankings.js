const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

let rankings = [];
let rankingSearch = "";
let selectedTier = "all";

document.addEventListener("DOMContentLoaded", initializeRankingsPage);

async function initializeRankingsPage() {
  const result = await client
    .from("league_rankings")
    .select(
      "id, league_id, position, previous_position, tier, leagues(name, abbreviation, logo_url, banner_url)",
    )
    .order("position", { ascending: true });

  if (result.error) {
    document.getElementById("fullRankingEmpty").classList.remove("hidden");
    document.getElementById("fullRankingEmpty").textContent =
      `Unable to load rankings: ${result.error.message}`;
    return;
  }

  rankings = result.data || [];

  renderStats();
  renderRankings();
  setupFilters();
  initializeAnimations();
  initializeScrollProgress();
}

function renderStats() {
  animateNumber(document.getElementById("totalRankedCount"), rankings.length);

  animateNumber(
    document.getElementById("sTierCount"),
    rankings.filter((item) => item.tier === "S").length,
  );

  animateNumber(
    document.getElementById("aTierCount"),
    rankings.filter((item) => item.tier === "A").length,
  );

  animateNumber(
    document.getElementById("otherTierCount"),
    rankings.filter((item) => item.tier === "B" || item.tier === "C").length,
  );
}
function getRankingMovement(position, previousPosition) {
  if (previousPosition === null || previousPosition === undefined) {
    return {
      label: "NEW",
      className: "movement-new",
    };
  }

  const difference = previousPosition - position;

  if (difference > 0) {
    return {
      label: `▲ ${difference}`,
      className: "movement-up",
    };
  }

  if (difference < 0) {
    return {
      label: `▼ ${Math.abs(difference)}`,
      className: "movement-down",
    };
  }

  return {
    label: "—",
    className: "movement-same",
  };
}
function renderRankings() {
  const body = document.getElementById("fullRankingBody");
  const empty = document.getElementById("fullRankingEmpty");
  const wrap = document.querySelector(".ranking-wrap");

  const filtered = rankings.filter((ranking) => {
    const leagueName = ranking.leagues?.name?.toLowerCase() || "";

    if (rankingSearch && !leagueName.includes(rankingSearch)) {
      return false;
    }

    if (selectedTier !== "all" && ranking.tier !== selectedTier) {
      return false;
    }

    return true;
  });

  empty.classList.toggle("hidden", filtered.length > 0);
  wrap.classList.toggle("hidden", filtered.length === 0);

  body.innerHTML = filtered
    .map((ranking, index) => {
      const league = ranking.leagues || {};
      const fallback =
        league.abbreviation ||
        String(league.name || "LG")
          .slice(0, 3)
          .toUpperCase();

      const bannerStyle = league.banner_url
        ? `style="--ranking-banner:url('${escapeHtml(league.banner_url)}')"`
        : "";

      const movement = getRankingMovement(
        ranking.position,
        ranking.previous_position,
      );
      return `
      <tr
        class="ranking-row reveal-row tier-${String(ranking.tier || "C").toLowerCase()}"
        style="--row-delay:${index * 45}ms"
      >
        <td class="ranking-position-cell">
          <strong>#${ranking.position}</strong>
        </td>

        <td class="ranking-league-cell" ${bannerStyle}>
          <div class="ranking-league-overlay"></div>

          <a
            class="ranking-league-content"
            href="league.html?id=${ranking.league_id}"
          >
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
          </a>
        </td>
<td class="ranking-movement-cell">
  <span class="ranking-movement ${movement.className}">
    ${movement.label}
  </span>
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
    })
    .join("");

  initializeAnimations();
}

function setupFilters() {
  document
    .getElementById("rankingSearch")
    .addEventListener("input", (event) => {
      rankingSearch = event.target.value.trim().toLowerCase();

      renderRankings();
    });

  document.getElementById("tierFilter").addEventListener("change", (event) => {
    selectedTier = event.target.value;
    renderRankings();
  });
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
    { threshold: 0.1 },
  );

  document
    .querySelectorAll(
      ".reveal-row:not(.is-visible), .section-heading:not(.is-visible)",
    )
    .forEach((item) => observer.observe(item));
}

function initializeScrollProgress() {
  const progress = document.getElementById("scrollProgress");

  function update() {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;

    const amount = maximum > 0 ? window.scrollY / maximum : 0;

    progress.style.transform = `scaleX(${Math.min(Math.max(amount, 0), 1)})`;
  }

  window.addEventListener("scroll", update, {
    passive: true,
  });

  update();
}

function animateNumber(element, target) {
  const duration = 700;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 3);

    element.textContent = Math.round(target * eased);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
