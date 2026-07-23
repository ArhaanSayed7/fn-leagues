const scheduleClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

const ScheduleDateTime = luxon.DateTime;

let scheduleLeagues = [];
let scheduleRaces = [];
let fullScheduleSearch = "";
let fullScheduleLeague = "all";

document.addEventListener("DOMContentLoaded", initializeSchedulePage);

async function initializeSchedulePage() {
  requestAnimationFrame(() => document.body.classList.add("page-loaded"));

  const [leagueResult, raceResult] = await Promise.all([
    scheduleClient.from("leagues").select("id, name, abbreviation, logo_url"),
    scheduleClient
      .from("races")
      .select("*")
      .eq("is_archived", false)
      .order("race_date", { ascending: true })
      .order("race_time", { ascending: true }),
  ]);

  if (leagueResult.error || raceResult.error) {
    const empty = document.getElementById("fullScheduleEmpty");
    empty.classList.remove("hidden");
    empty.textContent = `Unable to load the schedule: ${
      leagueResult.error?.message || raceResult.error?.message || "Unknown error"
    }`;
    return;
  }

  scheduleLeagues = leagueResult.data || [];
  scheduleRaces = (raceResult.data || []).filter(
    (race) => race.is_archived !== true,
  );

  document.getElementById("scheduleTimezone").textContent =
    `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

  populateFullScheduleFilter();
  setupFullScheduleFilters();
  renderFullSchedule();
  initializeScheduleScrollProgress();
}

function populateFullScheduleFilter() {
  const select = document.getElementById("fullScheduleLeagueFilter");
  select.innerHTML = `
    <option value="all">All leagues</option>
    ${scheduleLeagues
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map(
        (league) =>
          `<option value="${escapeScheduleHtml(league.id)}">${escapeScheduleHtml(league.name)}</option>`,
      )
      .join("")}
  `;
}

function setupFullScheduleFilters() {
  document
    .getElementById("fullScheduleSearch")
    .addEventListener("input", (event) => {
      fullScheduleSearch = event.target.value.toLowerCase().trim();
      renderFullSchedule();
    });

  document
    .getElementById("fullScheduleLeagueFilter")
    .addEventListener("change", (event) => {
      fullScheduleLeague = event.target.value;
      renderFullSchedule();
    });
}

function renderFullSchedule() {
  const now = ScheduleDateTime.now();

  const filtered = scheduleRaces
    .filter((race) => race.is_live !== true && getScheduleRaceDateTime(race) >= now)
    .filter((race) => {
      if (
        fullScheduleLeague !== "all" &&
        String(race.league_id) !== fullScheduleLeague
      ) {
        return false;
      }

      if (!fullScheduleSearch) return true;

      return [race.league_name, race.event_name, race.category, race.circuit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(fullScheduleSearch);
    })
    .sort(
      (a, b) =>
        getScheduleRaceDateTime(a).toMillis() -
        getScheduleRaceDateTime(b).toMillis(),
    );

  document.getElementById("upcomingRaceCount").textContent = filtered.length;
  document.getElementById("scheduledLeagueCount").textContent = new Set(
    filtered.map((race) => race.league_id),
  ).size;

  const list = document.getElementById("fullScheduleList");
  const empty = document.getElementById("fullScheduleEmpty");

  empty.classList.toggle("hidden", filtered.length > 0);
  list.classList.toggle("hidden", filtered.length === 0);

  const groups = filtered.reduce((result, race) => {
    const local = getScheduleRaceDateTime(race).toLocal();
    const key = local.toFormat("yyyy-MM-dd");

    if (!result[key]) {
      result[key] = {
        date: local,
        races: [],
      };
    }

    result[key].races.push(race);
    return result;
  }, {});

  list.innerHTML = Object.values(groups)
    .map(
      (group) => `
        <section class="full-schedule-day">
          <header class="full-schedule-day-heading">
            <div class="full-schedule-day-date">
              <strong>${group.date.toFormat("dd")}</strong>
              <span>${group.date.toFormat("LLL")}</span>
            </div>
            <div>
              <span class="eyebrow">${group.date.toFormat("cccc")}</span>
              <h3>${group.date.toFormat("d LLLL yyyy")}</h3>
            </div>
          </header>

          <div class="full-schedule-day-races">
            ${group.races.map(renderFullScheduleRace).join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderFullScheduleRace(race) {
  const local = getScheduleRaceDateTime(race).toLocal();
  const league = scheduleLeagues.find((item) => item.id === race.league_id);
  const leagueName = race.league_name || league?.name || "Unknown league";
  const initials =
    league?.abbreviation || String(leagueName).slice(0, 3).toUpperCase();

  return `
    <article class="full-schedule-race-row">
      <time class="full-schedule-race-time" datetime="${escapeScheduleHtml(local.toISO())}">
        <strong>${local.toFormat("h:mm")}</strong>
        <span>${local.toFormat("a")}</span>
      </time>

      <div class="full-schedule-race-logo">
        ${
          league?.logo_url
            ? `<img src="${escapeScheduleHtml(league.logo_url)}" alt="${escapeScheduleHtml(leagueName)} logo">`
            : `<span>${escapeScheduleHtml(initials)}</span>`
        }
      </div>

      <div class="full-schedule-race-copy">
        <span class="eyebrow">${escapeScheduleHtml(race.category || "RACE EVENT")}</span>
        <h4>${escapeScheduleHtml(race.event_name || "Race event")}</h4>
        <p>
          ${escapeScheduleHtml(leagueName)}
          ${race.circuit ? ` · ${escapeScheduleHtml(race.circuit)}` : ""}
        </p>
      </div>

      <a
        class="button secondary full-schedule-race-button"
        href="league.html?id=${encodeURIComponent(race.league_id)}"
      >
        View League
        <span aria-hidden="true">→</span>
      </a>
    </article>
  `;
}

function getScheduleRaceDateTime(race) {
  const zone = normalizeScheduleZone(race.timezone);
  const time = String(race.race_time || "00:00").slice(0, 5);
  const value = ScheduleDateTime.fromISO(`${race.race_date}T${time}`, { zone });

  return value.isValid
    ? value
    : ScheduleDateTime.fromISO(`${race.race_date}T${time}`, { zone: "UTC" });
}

function normalizeScheduleZone(value) {
  const raw = String(value || "").trim();
  const aliases = {
    "GMT+4": "Asia/Dubai",
    "UTC+4": "Asia/Dubai",
    GST: "Asia/Dubai",
    GMT: "Europe/London",
    UTC: "UTC",
  };

  return aliases[raw] || raw || "UTC";
}

function initializeScheduleScrollProgress() {
  const progress = document.getElementById("scrollProgress");
  if (!progress) return;

  const update = () => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maximum > 0 ? window.scrollY / maximum : 0;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
}

function escapeScheduleHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
