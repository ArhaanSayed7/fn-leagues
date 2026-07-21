const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let leagueCache = [];
let raceCache = [];

document.addEventListener("DOMContentLoaded", initialize);

$("loginForm").addEventListener("submit", login);
$("logoutButton").addEventListener("click", () => client.auth.signOut());

$("leagueForm").addEventListener("submit", saveLeague);
$("clearFormButton").addEventListener("click", () => clearLeagueForm());

$("raceForm").addEventListener("submit", saveRace);
$("clearRaceButton").addEventListener("click", () => clearRaceForm());

document.querySelectorAll(".admin-nav button[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

async function initialize() {
  try {
    validateConfig();

    const {
      data: { session }
    } = await client.auth.getSession();

    if (session) {
      await showDashboard(session.user);
    } else {
      showLogin();
    }

    client.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await showDashboard(session.user);
      } else {
        showLogin();
      }
    });
  } catch (error) {
    $("loginMessage").textContent = error.message;
  }
}

async function login(event) {
  event.preventDefault();
  $("loginMessage").textContent = "Signing in…";

  const { error } = await client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  $("loginMessage").textContent = error ? error.message : "";
}

function showLogin() {
  $("loginView").classList.remove("hidden");
  $("dashboardView").classList.add("hidden");
}

async function showDashboard(user) {
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("adminEmail").textContent = user.email || "Admin";

  await Promise.all([
    loadStats(),
    loadLeagues(),
    loadRaces()
  ]);
}

function validateConfig() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    throw new Error("Complete config.js first.");
  }
}

async function loadStats() {
  const [leagues, races, liveRaces, rankings] = await Promise.all([
    client.from("leagues").select("*", { count: "exact", head: true }),
    client.from("races").select("*", { count: "exact", head: true }),
    client.from("races").select("*", { count: "exact", head: true }).eq("is_live", true),
    client.from("league_rankings").select("*", { count: "exact", head: true })
  ]);

  $("adminLeagueCount").textContent = leagues.count ?? 0;
  $("adminRaceCount").textContent = races.count ?? 0;
  $("adminLiveCount").textContent = liveRaces.count ?? 0;
  $("adminRankingCount").textContent = rankings.count ?? 0;
}

async function loadLeagues() {
  const { data, error } = await client
    .from("leagues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    $("leagueMessage").textContent = error.message;
    return;
  }

  leagueCache = data || [];
  renderLeagueList();
  populateLeagueSelect();
  $("adminLeagueCount").textContent = leagueCache.length;
}

async function loadRaces() {
  const { data, error } = await client
    .from("races")
    .select("*")
    .order("race_date", { ascending: true })
    .order("race_time", { ascending: true });

  if (error) {
    $("raceMessage").textContent = error.message;
    return;
  }

  raceCache = data || [];
  renderRaceList();
  $("adminRaceCount").textContent = raceCache.length;
  $("adminLiveCount").textContent = raceCache.filter((race) => race.is_live === true).length;
}

function populateLeagueSelect() {
  const currentValue = $("raceLeague").value;

  $("raceLeague").innerHTML = `
    <option value="">Choose a league</option>
    ${leagueCache.map((league) => `
      <option value="${league.id}">
        ${escapeHtml(league.name)}
      </option>
    `).join("")}
  `;

  if (currentValue) {
    $("raceLeague").value = currentValue;
  }
}

function renderLeagueList() {
  $("adminLeagueEmpty").classList.toggle("hidden", leagueCache.length > 0);

  $("adminLeagueList").innerHTML = leagueCache.map((league) => `
    <article class="admin-list-row">
      <div class="admin-list-logo">
        ${
          league.logo_url
            ? `<img src="${escapeHtml(league.logo_url)}" alt="">`
            : `<span>${escapeHtml(league.abbreviation || league.name.slice(0, 3).toUpperCase())}</span>`
        }
      </div>

      <div class="admin-list-copy">
        <strong>${escapeHtml(league.name)}</strong>
        <span>
          ${escapeHtml(league.category || "Racing League")}
          ${league.featured ? " · Featured" : ""}
        </span>
      </div>

      <div class="admin-row-actions">
        <button class="button secondary" onclick="editLeague(${league.id})">Edit</button>
        <button class="button danger" onclick="deleteLeague(${league.id}, '${escapeJs(league.name)}')">Delete</button>
      </div>
    </article>
  `).join("");
}

function renderRaceList() {
  $("adminRaceEmpty").classList.toggle("hidden", raceCache.length > 0);

  $("adminRaceList").innerHTML = raceCache.map((race) => `
    <article class="admin-list-row race-admin-row">
      <div class="race-date-badge">
        <strong>${formatShortDate(race.race_date)}</strong>
        <span>${formatTime(race.race_time)}</span>
      </div>

      <div class="admin-list-copy">
        <strong>
          ${race.is_live ? `<span class="live-pill">LIVE</span>` : ""}
          ${escapeHtml(race.league_name)}
        </strong>
        <span>
          ${escapeHtml(race.event_name || "Race event")}
          ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
        </span>
      </div>

      <div class="admin-row-actions">
        <button
          class="button ${race.is_live ? "danger" : "secondary"}"
          onclick="toggleLive(${race.id}, ${race.is_live === true})"
        >
          ${race.is_live ? "End Live" : "Go Live"}
        </button>

        <button class="button secondary" onclick="editRace(${race.id})">Edit</button>
        <button class="button danger" onclick="deleteRace(${race.id}, '${escapeJs(race.event_name || race.league_name)}')">Delete</button>
      </div>
    </article>
  `).join("");
}

window.editLeague = function (id) {
  const league = leagueCache.find((item) => item.id === id);
  if (!league) return;

  switchTab("leagues");

  $("leagueId").value = league.id;
  $("leagueName").value = league.name || "";
  $("leagueAbbreviation").value = league.abbreviation || "";
  $("leagueCategory").value = league.category || "";
  $("leagueDiscord").value = league.discord_url || "";
  $("leagueWebsite").value = league.website_url || "";
  $("leagueDescription").value = league.description || "";
  $("leagueFeatured").checked = league.featured === true;

  $("formTitle").textContent = "Edit League";

  $("assetPreview").innerHTML = `
    ${league.logo_url ? `<img src="${escapeHtml(league.logo_url)}" alt="Current logo">` : ""}
    ${league.banner_url ? `<img src="${escapeHtml(league.banner_url)}" alt="Current banner">` : ""}
  `;

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteLeague = async function (id, name) {
  if (!confirm(`Delete ${name}? This also deletes its linked races and ranking.`)) {
    return;
  }

  const { error } = await client.from("leagues").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  clearLeagueForm();
  await Promise.all([loadLeagues(), loadRaces(), loadStats()]);
};

async function saveLeague(event) {
  event.preventDefault();
  $("leagueMessage").textContent = "Saving…";

  try {
    const id = $("leagueId").value;
    const current = id
      ? leagueCache.find((item) => String(item.id) === String(id))
      : null;

    const logoUrl = await uploadAsset(
      $("leagueLogo").files[0],
      "logos",
      current?.logo_url
    );

    const bannerUrl = await uploadAsset(
      $("leagueBanner").files[0],
      "banners",
      current?.banner_url
    );

    const payload = {
      name: $("leagueName").value.trim(),
      abbreviation: $("leagueAbbreviation").value.trim() || null,
      category: $("leagueCategory").value.trim() || null,
      description: $("leagueDescription").value.trim() || null,
      discord_url: $("leagueDiscord").value.trim() || null,
      website_url: $("leagueWebsite").value.trim() || null,
      featured: $("leagueFeatured").checked,
      logo_url: logoUrl,
      banner_url: bannerUrl
    };

    const result = id
      ? await client.from("leagues").update(payload).eq("id", id)
      : await client.from("leagues").insert(payload);

    if (result.error) throw result.error;

    $("leagueMessage").textContent = id
      ? "League updated."
      : "League added.";

    clearLeagueForm(false);
    await Promise.all([loadLeagues(), loadStats()]);
  } catch (error) {
    $("leagueMessage").textContent = error.message;
  }
}

window.editRace = function (id) {
  const race = raceCache.find((item) => item.id === id);
  if (!race) return;

  switchTab("races");

  $("raceId").value = race.id;
  $("raceLeague").value = race.league_id || "";
  $("raceEventName").value = race.event_name || "";
  $("raceCategory").value = race.category || "";
  $("raceCircuit").value = race.circuit || "";
  $("raceTimezone").value = race.timezone || "GMT+4";
  $("raceDate").value = race.race_date || "";
  $("raceTime").value = String(race.race_time || "").slice(0, 5);
  $("raceEventUrl").value = race.event_url || "";
  $("raceStreamUrl").value = race.stream_url || "";
  $("raceIsLive").checked = race.is_live === true;

  $("raceFormTitle").textContent = "Edit Race";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteRace = async function (id, name) {
  if (!confirm(`Delete ${name}?`)) return;

  const { error } = await client.from("races").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  clearRaceForm();
  await Promise.all([loadRaces(), loadStats()]);
};

window.toggleLive = async function (id, currentlyLive) {
  const { error } = await client
    .from("races")
    .update({ is_live: !currentlyLive })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await Promise.all([loadRaces(), loadStats()]);
};

async function saveRace(event) {
  event.preventDefault();
  $("raceMessage").textContent = "Saving…";

  try {
    const id = $("raceId").value;
    const leagueId = Number($("raceLeague").value);
    const league = leagueCache.find((item) => item.id === leagueId);

    if (!league) {
      throw new Error("Choose a valid league.");
    }

    const payload = {
      league_id: league.id,
      league_name: league.name,
      event_name: $("raceEventName").value.trim(),
      category: $("raceCategory").value.trim() || league.category || null,
      circuit: $("raceCircuit").value.trim() || null,
      race_date: $("raceDate").value,
      race_time: $("raceTime").value,
      timezone: $("raceTimezone").value.trim() || "GMT+4",
      event_url: $("raceEventUrl").value.trim() || null,
      stream_url: $("raceStreamUrl").value.trim() || null,
      is_live: $("raceIsLive").checked
    };

    const result = id
      ? await client.from("races").update(payload).eq("id", id)
      : await client.from("races").insert(payload);

    if (result.error) throw result.error;

    $("raceMessage").textContent = id
      ? "Race updated."
      : "Race added.";

    clearRaceForm(false);
    await Promise.all([loadRaces(), loadStats()]);
  } catch (error) {
    $("raceMessage").textContent = error.message;
  }
}

async function uploadAsset(file, folder, existingUrl) {
  if (!file) return existingUrl || null;

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const extension = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await client.storage
    .from("league-assets")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  return client.storage
    .from("league-assets")
    .getPublicUrl(path)
    .data.publicUrl;
}

function clearLeagueForm(clearMessage = true) {
  $("leagueForm").reset();
  $("leagueId").value = "";
  $("formTitle").textContent = "Add League";
  $("assetPreview").innerHTML = "";

  if (clearMessage) {
    $("leagueMessage").textContent = "";
  }
}

function clearRaceForm(clearMessage = true) {
  $("raceForm").reset();
  $("raceId").value = "";
  $("raceTimezone").value = "GMT+4";
  $("raceFormTitle").textContent = "Add Race";

  if (clearMessage) {
    $("raceMessage").textContent = "";
  }
}

function switchTab(tab) {
  $("overviewTab").classList.toggle("hidden", tab !== "overview");
  $("leaguesTab").classList.toggle("hidden", tab !== "leagues");
  $("racesTab").classList.toggle("hidden", tab !== "races");

  const titles = {
    overview: "Dashboard",
    leagues: "Leagues",
    races: "Races"
  };

  $("adminTitle").textContent = titles[tab] || "Dashboard";

  document.querySelectorAll(".admin-nav button[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", " ");
}
