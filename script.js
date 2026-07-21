/*
=============================================================
FN LEAGUES WEBSITE LOGIC
You normally do not need to edit this file.
Edit data.js instead.
=============================================================
*/

let activeFilter = "all";

const scheduleList = document.getElementById("scheduleList");
const leagueGrid = document.getElementById("leagueGrid");
const todayEvents = document.getElementById("todayEvents");
const scheduleEmpty = document.getElementById("scheduleEmpty");
const leagueEmpty = document.getElementById("leagueEmpty");
const leagueSearch = document.getElementById("leagueSearch");
const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");

const visibleLeagues = LEAGUES.filter((league) => league.name.trim() !== "");
const visibleRaces = RACES.filter(
  (race) => race.league.trim() !== "" && race.date.trim() !== "" && race.time.trim() !== ""
);

document.getElementById("todayDate").textContent =
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date());

renderToday();
renderSchedule();
renderLeagues();

function renderToday() {
  const today = getLocalDateString(new Date());

  const todaysRaces = [...visibleRaces]
    .filter((race) => race.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todaysRaces.length === 0) {
    todayEvents.innerHTML = `
      <div class="empty-state">
        No races are scheduled today.
      </div>
    `;
    return;
  }

  todayEvents.innerHTML = todaysRaces
    .map((race) => `
      <article class="today-event">
        <div class="today-event-time">${formatTime(race.time)}</div>

        <div>
          <h3>${escapeHtml(race.league)}</h3>
          <p>${escapeHtml(race.event || "Race Event")}${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}</p>
        </div>

        ${
          race.link
            ? `<a class="small-link" href="${safeUrl(race.link)}" target="_blank" rel="noopener noreferrer">↗</a>`
            : ""
        }
      </article>
    `)
    .join("");
}

function renderSchedule() {
  const races = getFilteredRaces();

  scheduleEmpty.classList.toggle("hidden", races.length > 0);

  scheduleList.innerHTML = races
    .map((race) => {
      const formattedDate = formatDate(race.date);

      return `
        <article class="schedule-card">
          <div class="schedule-date">
            <strong>${formattedDate.main}</strong>
            <span>${formattedDate.year} · ${formatTime(race.time)} ${escapeHtml(race.timezone || "")}</span>
          </div>

          <div class="schedule-details">
            <h3>${escapeHtml(race.league)}${race.event ? ` — ${escapeHtml(race.event)}` : ""}</h3>
            <p>
              ${escapeHtml(race.category || "Racing League")}
              ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
            </p>
          </div>

          <div class="schedule-actions">
            <span class="category-chip">${escapeHtml(race.category || "Race")}</span>

            ${
              race.link
                ? `<a class="button secondary" href="${safeUrl(race.link)}" target="_blank" rel="noopener noreferrer">Open</a>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLeagues(searchText = "") {
  const search = searchText.trim().toLowerCase();

  const filteredLeagues = visibleLeagues.filter((league) =>
    [league.name, league.category, league.description]
      .join(" ")
      .toLowerCase()
      .includes(search)
  );

  leagueEmpty.classList.toggle("hidden", filteredLeagues.length > 0);

  leagueGrid.innerHTML = filteredLeagues
    .map((league) => `
      <article class="league-card">
        <div class="league-logo">
          ${escapeHtml(league.abbreviation || league.name.slice(0, 3).toUpperCase())}
        </div>

        <span class="league-category">${escapeHtml(league.category || "Racing League")}</span>
        <h3>${escapeHtml(league.name)}</h3>

        <p>
          ${escapeHtml(league.description || "Fortnite racing league community.")}
        </p>

        <div class="league-links">
          ${
            league.discord
              ? `<a class="button primary" href="${safeUrl(league.discord)}" target="_blank" rel="noopener noreferrer">Join Discord</a>`
              : `<span class="button secondary">Discord link not added</span>`
          }
        </div>
      </article>
    `)
    .join("");
}

function getFilteredRaces() {
  const today = getLocalDateString(new Date());

  return [...visibleRaces]
    .filter((race) => {
      if (activeFilter === "today") {
        return race.date === today;
      }

      if (activeFilter === "week") {
        return isWithinNextSevenDays(race.date);
      }

      return true;
    })
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
}

function isWithinNextSevenDays(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const raceDate = new Date(`${dateString}T00:00:00`);

  return raceDate >= today && raceDate < sevenDaysLater;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return {
    main: new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date),

    year: date.getFullYear()
  };
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch (error) {
    console.warn("Invalid link:", url);
  }

  return "#";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll(".filter-button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderSchedule();
  });
});

leagueSearch.addEventListener("input", (event) => {
  renderLeagues(event.target.value);
});

menuButton.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
  });
});
