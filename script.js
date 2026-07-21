let activeFilter = "all";
let countdownTimer;

const scheduleList = document.getElementById("scheduleList");
const leagueGrid = document.getElementById("leagueGrid");
const featuredGrid = document.getElementById("featuredGrid");
const nextRaceContainer = document.getElementById("nextRace");
const scheduleEmpty = document.getElementById("scheduleEmpty");
const leagueEmpty = document.getElementById("leagueEmpty");
const featuredEmpty = document.getElementById("featuredEmpty");
const leagueSearch = document.getElementById("leagueSearch");
const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");

const visibleLeagues = LEAGUES.filter((league) => league.name.trim() !== "");
const visibleRaces = RACES.filter(
  (race) => race.league.trim() !== "" && race.date.trim() !== "" && race.time.trim() !== ""
);

document.getElementById("leagueCount").textContent = visibleLeagues.length;
document.getElementById("raceCount").textContent = getUpcomingRaces().length;

document.getElementById("todayDate").textContent =
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date());

renderNextRace();
renderFeatured();
renderSchedule();
renderLeagues();

function getUpcomingRaces() {
  const now = new Date();

  return [...visibleRaces]
    .filter((race) => getRaceDate(race) >= now)
    .sort((a, b) => getRaceDate(a) - getRaceDate(b));
}

function renderNextRace() {
  const nextRace = getUpcomingRaces()[0];

  if (!nextRace) {
    nextRaceContainer.innerHTML = `
      <div class="empty-state">
        No upcoming races have been added yet.
      </div>
    `;
    return;
  }

  nextRaceContainer.innerHTML = `
    <article class="next-race-card">
      <span class="eyebrow">${escapeHtml(nextRace.category || "UPCOMING EVENT")}</span>
      <h3>${escapeHtml(nextRace.league)}</h3>
      <p>
        ${escapeHtml(nextRace.event || "Race Event")}
        ${nextRace.circuit ? ` · ${escapeHtml(nextRace.circuit)}` : ""}
      </p>

      <div class="countdown">
        <div class="countdown-item"><strong id="days">0</strong><span>Days</span></div>
        <div class="countdown-item"><strong id="hours">0</strong><span>Hours</span></div>
        <div class="countdown-item"><strong id="minutes">0</strong><span>Minutes</span></div>
        <div class="countdown-item"><strong id="seconds">0</strong><span>Seconds</span></div>
      </div>

      ${
        nextRace.link
          ? `<a class="button primary" href="${safeUrl(nextRace.link)}" target="_blank" rel="noopener noreferrer">Open Event</a>`
          : ""
      }
    </article>
  `;

  updateCountdown(nextRace);
  countdownTimer = setInterval(() => updateCountdown(nextRace), 1000);
}

function updateCountdown(race) {
  const distance = getRaceDate(race) - new Date();

  if (distance <= 0) {
    clearInterval(countdownTimer);
    renderNextRace();
    return;
  }

  document.getElementById("days").textContent = Math.floor(distance / 86400000);
  document.getElementById("hours").textContent = Math.floor((distance % 86400000) / 3600000);
  document.getElementById("minutes").textContent = Math.floor((distance % 3600000) / 60000);
  document.getElementById("seconds").textContent = Math.floor((distance % 60000) / 1000);
}

function renderFeatured() {
  const featuredLeagues = visibleLeagues.filter((league) => league.featured === true);

  featuredEmpty.classList.toggle("hidden", featuredLeagues.length > 0);

  featuredGrid.innerHTML = featuredLeagues
    .map((league) => `
      <article class="featured-card">
        <div class="featured-content">
          ${renderFeaturedLogo(league)}
          <span class="league-category">${escapeHtml(league.category || "Racing League")}</span>
          <h3>${escapeHtml(league.name)}</h3>
          <p>${escapeHtml(league.description || "Fortnite racing league community.")}</p>

          ${
            league.discord
              ? `<a class="button primary" href="${safeUrl(league.discord)}" target="_blank" rel="noopener noreferrer">Join Discord</a>`
              : ""
          }
        </div>
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
        ${renderLeagueLogo(league)}

        <span class="league-category">${escapeHtml(league.category || "Racing League")}</span>
        <h3>${escapeHtml(league.name)}</h3>

        <p>${escapeHtml(league.description || "Fortnite racing league community.")}</p>

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

function renderLeagueLogo(league) {
  if (league.logo && league.logo.trim() !== "") {
    return `
      <div class="league-logo has-image">
        <img
          src="${escapeHtml(league.logo)}"
          alt="${escapeHtml(league.name)} logo"
          onerror="this.parentElement.classList.remove('has-image'); this.parentElement.innerHTML='${escapeHtml(getFallbackAbbreviation(league))}'"
        />
      </div>
    `;
  }

  return `<div class="league-logo">${escapeHtml(getFallbackAbbreviation(league))}</div>`;
}

function renderFeaturedLogo(league) {
  if (league.logo && league.logo.trim() !== "") {
    return `
      <div class="featured-logo">
        <img
          src="${escapeHtml(league.logo)}"
          alt="${escapeHtml(league.name)} logo"
          onerror="this.parentElement.innerHTML='<span>${escapeHtml(getFallbackAbbreviation(league))}</span>'"
        />
      </div>
    `;
  }

  return `<div class="featured-logo"><span>${escapeHtml(getFallbackAbbreviation(league))}</span></div>`;
}

function getFallbackAbbreviation(league) {
  return league.abbreviation || league.name.slice(0, 3).toUpperCase();
}

function getFilteredRaces() {
  const today = getLocalDateString(new Date());

  return [...visibleRaces]
    .filter((race) => {
      if (activeFilter === "today") return race.date === today;
      if (activeFilter === "week") return isWithinNextSevenDays(race.date);
      return true;
    })
    .sort((a, b) => getRaceDate(a) - getRaceDate(b));
}

function getRaceDate(race) {
  return new Date(`${race.date}T${race.time}:00`);
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
