const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
const $ = (id) => document.getElementById(id);

let leagueCache = [];
let raceCache = [];
let rankingCache = [];
let activeRaceFilter = "all";
let raceSearchQuery = "";
let leagueAdminSearchQuery = "";
let rankingAdminSearchQuery = "";
let communityDraft = {};
let galleryCache = [];
let galleryLeagueFilter = "all";

document.addEventListener("DOMContentLoaded", initialize);

$("loginForm").addEventListener("submit", login);
$("logoutButton").addEventListener("click", () => client.auth.signOut());

$("leagueForm").addEventListener("submit", saveLeague);
$("clearFormButton").addEventListener("click", () => clearLeagueForm());

$("raceForm").addEventListener("submit", saveRace);
$("clearRaceButton").addEventListener("click", () => clearRaceForm());

$("raceSearch").addEventListener("input", (event) => {
  raceSearchQuery = event.target.value.trim().toLowerCase();
  renderRaceList();
});

$("leagueAdminSearch").addEventListener("input", (event) => {
  leagueAdminSearchQuery = event.target.value.trim().toLowerCase();
  renderLeagueList();
});

$("rankingAdminSearch").addEventListener("input", (event) => {
  rankingAdminSearchQuery = event.target.value.trim().toLowerCase();
  renderRankingList();
});

setupUploadZone("logoUploadZone", "leagueLogo");
setupUploadZone("bannerUploadZone", "leagueBanner");
setupUploadZone("raceBannerUploadZone", "raceBanner");

$("leagueLogo").addEventListener("change", renderSelectedAssetPreviews);
$("leagueBanner").addEventListener("change", renderSelectedAssetPreviews);
$("raceBanner").addEventListener("change", renderRaceBannerPreview);

document.querySelectorAll("[data-race-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeRaceFilter = button.dataset.raceFilter;

    document.querySelectorAll("[data-race-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderRaceList();
  });
});

$("rankingForm").addEventListener("submit", saveRanking);
$("clearRankingButton").addEventListener("click", () => clearRankingForm());

$("saveCommunityDraft").addEventListener("click", saveCommunityDraft);
$("publishCommunity").addEventListener("click", publishCommunity);

$("galleryForm").addEventListener("submit", uploadGalleryImage);
$("galleryLeagueFilter").addEventListener("change", (event) => {
  galleryLeagueFilter = event.target.value;
  renderGalleryList();
});
setupUploadZone("galleryUploadZone", "galleryImage");
$("galleryImage").addEventListener("change", renderGalleryPreview);

[
  "announcementEnabled",
  "announcementTitle",
  "announcementType",
  "announcementText",
  "announcementButtonText",
  "announcementButtonUrl",
  "announcementExpiry",
  "leagueOfWeekSelect",
  "raceOfWeekSelect",
  "streamEnabled",
  "streamTitle",
  "streamUrl",
  "streamDescription",
  "showRecentlyAdded",
  "recentlyAddedLimit",
].forEach((id) => {
  $(id).addEventListener("input", updateCommunityPreview);
  $(id).addEventListener("change", updateCommunityPreview);
});

document.querySelectorAll(".admin-nav button[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

async function initialize() {
  try {
    validateConfig();

    const {
      data: { session },
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
    password: $("password").value,
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
    loadRaces(),
    loadRankings(),
    loadCommunitySettings(),
    loadGalleryImages(),
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
  const [leagueResult, raceResult, rankingResult] = await Promise.all([
    client.from("leagues").select("*"),
    client.from("races").select("*"),
    client.from("league_rankings").select("*"),
  ]);

  const leagues = leagueResult.data || [];
  const races = raceResult.data || [];
  const rankings = rankingResult.data || [];
  const now = new Date();

  const upcoming = races.filter(
    (race) =>
      !race.is_archived && !race.is_live && getAdminRaceDate(race) >= now,
  );

  const live = races.filter(
    (race) => !race.is_archived && race.is_live === true,
  );

  const completed = races.filter(
    (race) =>
      !race.is_archived &&
      race.is_live !== true &&
      getAdminRaceDate(race) < now,
  );

  const archived = races.filter((race) => race.is_archived === true);
  const featured = leagues.filter((league) => league.featured === true);

  animateAdminNumber($("adminLeagueCount"), leagues.length);
  animateAdminNumber($("adminRaceCount"), races.length);
  animateAdminNumber($("adminUpcomingCount"), upcoming.length);
  animateAdminNumber($("adminLiveCount"), live.length);
  animateAdminNumber($("adminCompletedCount"), completed.length);
  animateAdminNumber($("adminArchivedCount"), archived.length);
  animateAdminNumber($("adminRankingCount"), rankings.length);
  animateAdminNumber($("adminFeaturedCount"), featured.length);
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
  populateRankingLeagueSelect();
  populateCommunitySelectors();
  populateGallerySelectors();
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
  populateCommunitySelectors();
  $("adminRaceCount").textContent = raceCache.length;
  $("adminLiveCount").textContent = raceCache.filter(
    (race) => race.is_live === true,
  ).length;
}

function populateLeagueSelect() {
  const currentValue = $("raceLeague").value;

  $("raceLeague").innerHTML = `
    <option value="">Choose a league</option>
    ${leagueCache
      .map(
        (league) => `
      <option value="${league.id}">
        ${escapeHtml(league.name)}
      </option>
    `,
      )
      .join("")}
  `;

  if (currentValue) {
    $("raceLeague").value = currentValue;
  }
}

function renderLeagueList() {
  const filteredLeagues = leagueCache.filter((league) =>
    [league.name, league.abbreviation, league.category]
      .join(" ")
      .toLowerCase()
      .includes(leagueAdminSearchQuery),
  );

  $("adminLeagueEmpty").classList.toggle("hidden", filteredLeagues.length > 0);

  $("adminLeagueList").innerHTML = filteredLeagues
    .map(
      (league) => `
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
        <button class="button secondary" onclick="duplicateLeague(${league.id})">Duplicate</button>
        <button class="button secondary" onclick="editLeague(${league.id})">Edit</button>
        <button class="button danger" onclick="deleteLeague(${league.id}, '${escapeJs(league.name)}')">Delete</button>
      </div>
    </article>
  `,
    )
    .join("");
}

function renderRaceList() {
  const now = new Date();

  const filtered = raceCache.filter((race) => {
    const searchText = [
      race.league_name,
      race.event_name,
      race.category,
      race.circuit,
    ]
      .join(" ")
      .toLowerCase();

    if (raceSearchQuery && !searchText.includes(raceSearchQuery)) {
      return false;
    }

    if (activeRaceFilter === "archived") {
      return race.is_archived === true;
    }

    if (race.is_archived === true) {
      return activeRaceFilter === "all";
    }

    if (activeRaceFilter === "live") {
      return race.is_live === true;
    }

    const raceDate = getAdminRaceDate(race);

    if (activeRaceFilter === "upcoming") {
      return race.is_live !== true && raceDate >= now;
    }

    if (activeRaceFilter === "completed") {
      return race.is_live !== true && raceDate < now;
    }

    return true;
  });

  $("adminRaceEmpty").classList.toggle("hidden", filtered.length > 0);

  $("adminRaceList").innerHTML = filtered
    .map((race) => {
      const status = getRaceStatus(race);

      return `
      <article class="admin-list-row race-admin-row ${race.is_archived ? "archived-race-row" : ""}">
        <div class="race-date-badge">
          <strong>${formatShortDate(race.race_date)}</strong>
          <span>${formatTime(race.race_time)}</span>
        </div>

        <div class="admin-list-copy">
          <strong>
            ${status === "live" ? `<span class="live-pill">LIVE</span>` : ""}
            ${escapeHtml(race.league_name)}
          </strong>

          <span>
            ${escapeHtml(race.event_name || "Race event")}
            ${race.circuit ? ` · ${escapeHtml(race.circuit)}` : ""}
          </span>

          <span class="race-status-label status-${status}">
            ${statusLabel(status)}
          </span>
        </div>

        <div class="admin-row-actions race-row-actions">
          ${
            race.is_archived
              ? `
                <button class="button secondary" onclick="restoreRace(${race.id})">Restore</button>
                <button class="button danger" onclick="deleteRace(${race.id}, '${escapeJs(race.event_name || race.league_name)}')">Delete Permanently</button>
              `
              : `
                <button
                  class="button ${race.is_live ? "danger" : "secondary"}"
                  onclick="toggleLive(${race.id}, ${race.is_live === true})"
                >
                  ${race.is_live ? "End Live" : "Go Live"}
                </button>

                <button class="button secondary" onclick="duplicateRace(${race.id})">Duplicate</button>
                <button class="button secondary" onclick="editRace(${race.id})">Edit</button>
                <button class="button secondary" onclick="archiveRace(${race.id})">Archive</button>
                <button class="button danger" onclick="deleteRace(${race.id}, '${escapeJs(race.event_name || race.league_name)}')">Delete</button>
              `
          }
        </div>
      </article>
    `;
    })
    .join("");
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
  $("leagueInstagram").value = league.instagram_url || "";
  $("leagueYoutube").value = league.youtube_url || "";
  $("leagueTwitch").value = league.twitch_url || "";
  $("leagueDescription").value = league.description || "";
  $("leagueTheme").value = league.theme_key || "aurora";
  $("leagueAccentColor").value = league.accent_color || "#9c7ddd";
  $("leagueBadge").value = league.badge_type || "";
  $("leagueOwner").value = league.owner_name || "";
  $("leagueStaff").value = Array.isArray(league.staff_members)
    ? league.staff_members.join("\n")
    : "";
  $("leagueContactUrl").value = league.contact_url || "";
  $("leagueFeatured").checked = league.featured === true;

  $("formTitle").textContent = "Edit League";

  $("assetPreview").innerHTML = `
    ${league.logo_url ? `<img src="${escapeHtml(league.logo_url)}" alt="Current logo">` : ""}
    ${league.banner_url ? `<img src="${escapeHtml(league.banner_url)}" alt="Current banner">` : ""}
  `;

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.duplicateLeague = function (id) {
  const league = leagueCache.find((item) => item.id === id);
  if (!league) return;

  switchTab("leagues");

  $("leagueId").value = "";
  $("leagueName").value = `${league.name} Copy`;
  $("leagueAbbreviation").value = league.abbreviation || "";
  $("leagueCategory").value = league.category || "";
  $("leagueDiscord").value = league.discord_url || "";
  $("leagueWebsite").value = league.website_url || "";
  $("leagueInstagram").value = league.instagram_url || "";
  $("leagueYoutube").value = league.youtube_url || "";
  $("leagueTwitch").value = league.twitch_url || "";
  $("leagueDescription").value = league.description || "";
  $("leagueTheme").value = league.theme_key || "aurora";
  $("leagueAccentColor").value = league.accent_color || "#9c7ddd";
  $("leagueBadge").value = league.badge_type || "";
  $("leagueOwner").value = league.owner_name || "";
  $("leagueStaff").value = Array.isArray(league.staff_members)
    ? league.staff_members.join("\n")
    : "";
  $("leagueContactUrl").value = league.contact_url || "";
  $("leagueFeatured").checked = false;
  $("formTitle").textContent = "Duplicate League";

  $("assetPreview").innerHTML = `
    ${league.logo_url ? `<img src="${escapeHtml(league.logo_url)}" alt="Current logo">` : ""}
    ${league.banner_url ? `<img src="${escapeHtml(league.banner_url)}" alt="Current banner">` : ""}
  `;

  window.scrollTo({ top: 0, behavior: "smooth" });
  showAdminToast("League copied into the editor.");
};

window.deleteLeague = async function (id, name) {
  if (
    !confirm(`Delete ${name}? This also deletes its linked races and ranking.`)
  ) {
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
async function uploadAsset(file, folder, currentUrl = null) {
  // Keep the existing image when no new file is selected.
  if (!file) {
    return currentUrl || null;
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Images must be 8 MB or smaller.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Please upload a PNG, JPG, WebP, or GIF image.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";

  const filePath = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await client.storage
    .from("league-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from("league-assets").getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("The uploaded image URL could not be created.");
  }

  return data.publicUrl;
}
function clearLeagueForm(clearMessage = true) {
  $("leagueForm").reset();

  $("leagueId").value = "";
  $("leagueTheme").value = "aurora";
  $("leagueAccentColor").value = "#9c7ddd";
  $("leagueBadge").value = "";
  $("leagueFeatured").checked = false;

  $("leagueLogo").value = "";
  $("leagueBanner").value = "";
  $("assetPreview").innerHTML = "";

  $("formTitle").textContent = "Add League";

  if (clearMessage) {
    $("leagueMessage").textContent = "";
  }
}
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
      current?.logo_url,
    );

    const bannerUrl = await uploadAsset(
      $("leagueBanner").files[0],
      "banners",
      current?.banner_url,
    );

    const payload = {
      name: $("leagueName").value.trim(),
      abbreviation: $("leagueAbbreviation").value.trim() || null,
      category: $("leagueCategory").value.trim() || null,
      description: $("leagueDescription").value.trim() || null,
      discord_url: $("leagueDiscord").value.trim() || null,
      website_url: $("leagueWebsite").value.trim() || null,
      instagram_url: $("leagueInstagram").value.trim() || null,
      youtube_url: $("leagueYoutube").value.trim() || null,
      twitch_url: $("leagueTwitch").value.trim() || null,
      theme_key: $("leagueTheme").value || "aurora",
      accent_color: $("leagueAccentColor").value || "#9c7ddd",
      badge_type: $("leagueBadge").value || null,
      owner_name: $("leagueOwner").value.trim() || null,
      staff_members: $("leagueStaff")
        .value.split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      contact_url: $("leagueContactUrl").value.trim() || null,
      featured: $("leagueFeatured").checked,
      logo_url: logoUrl,
      banner_url: bannerUrl,
    };

    const result = id
      ? await client.from("leagues").update(payload).eq("id", id)
      : await client.from("leagues").insert(payload);

    if (result.error) throw result.error;

    $("leagueMessage").textContent = id ? "League updated." : "League added.";

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
  $("raceDate").value = race.race_date || "";
  $("raceTime").value = String(race.race_time || "").slice(0, 5);
  $("raceEventUrl").value = race.event_url || "";
  $("raceStreamUrl").value = race.stream_url || "";
  $("raceBannerPreview").innerHTML = race.banner_url
    ? `<img src="${escapeHtml(race.banner_url)}" alt="Current race artwork">`
    : "";
  $("raceIsLive").checked = race.is_live === true;
  $("raceIsArchived").checked = race.is_archived === true;

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

window.archiveRace = async function (id) {
  const race = raceCache.find((item) => item.id === id);
  if (!race) return;

  if (
    !confirm(
      `Archive ${race.event_name || race.league_name}? It will be hidden from public pages.`,
    )
  ) {
    return;
  }

  const { error } = await client
    .from("races")
    .update({
      is_archived: true,
      is_live: false,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await Promise.all([loadRaces(), loadStats()]);
  showAdminToast("Race archived.");
};

window.restoreRace = async function (id) {
  const { error } = await client
    .from("races")
    .update({ is_archived: false })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await Promise.all([loadRaces(), loadStats()]);
  showAdminToast("Race restored.");
};

window.duplicateRace = function (id) {
  const race = raceCache.find((item) => item.id === id);
  if (!race) return;

  switchTab("races");

  $("raceId").value = "";
  $("raceLeague").value = race.league_id || "";
  $("raceEventName").value = `${race.event_name || "Race event"} Copy`;
  $("raceCategory").value = race.category || "";
  $("raceCircuit").value = race.circuit || "";
  $("raceDate").value = race.race_date || "";
  $("raceTime").value = String(race.race_time || "").slice(0, 5);
  $("raceEventUrl").value = race.event_url || "";
  $("raceStreamUrl").value = race.stream_url || "";
  $("raceBannerPreview").innerHTML = race.banner_url
    ? `<img src="${escapeHtml(race.banner_url)}" alt="Copied race artwork">`
    : "";
  $("raceIsLive").checked = false;
  $("raceIsArchived").checked = false;
  $("raceFormTitle").textContent = "Duplicate Race";

  window.scrollTo({ top: 0, behavior: "smooth" });
  showAdminToast("Race copied into the editor.");
};

async function saveRace(event) {
  event.preventDefault();
  $("raceMessage").textContent = "Saving…";

  try {
    const id = $("raceId").value;
    const leagueId = Number($("raceLeague").value);
    const league = leagueCache.find((item) => item.id === leagueId);

    if (!leagueId || !league) {
      throw new Error("Choose a league.");
    }

    let bannerUrl = null;
    let bannerPath = null;

    if (id) {
      const existing = raceCache.find((item) => String(item.id) === String(id));
      bannerUrl = existing?.banner_url || null;
      bannerPath = existing?.banner_storage_path || null;
    }

    const bannerFile = $("raceBanner").files[0];

    if (bannerFile) {
      if (bannerFile.size > 8 * 1024 * 1024) {
        throw new Error("Race artwork must be 8 MB or smaller.");
      }

      const extension = (
        bannerFile.name.split(".").pop() || "jpg"
      ).toLowerCase();
      bannerPath = `races/${leagueId}/${crypto.randomUUID()}.${extension}`;

      const upload = await client.storage
        .from("league-assets")
        .upload(bannerPath, bannerFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (upload.error) throw upload.error;

      bannerUrl = client.storage.from("league-assets").getPublicUrl(bannerPath)
        .data.publicUrl;
    }

    const payload = {
      league_id: leagueId,
      league_name: league.name,
      event_name: $("raceEventName").value.trim() || null,
      category: $("raceCategory").value.trim() || null,
      circuit: $("raceCircuit").value.trim() || null,
      race_date: $("raceDate").value,
      race_time: $("raceTime").value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      event_url: $("raceEventUrl").value.trim() || null,
      stream_url: $("raceStreamUrl").value.trim() || null,
      banner_url: bannerUrl,
      banner_storage_path: bannerPath,
      is_live: $("raceIsLive").checked,
      is_archived: $("raceIsArchived").checked,
    };

    if (!payload.race_date || !payload.race_time) {
      throw new Error("Add the race date and time.");
    }

    const result = id
      ? await client.from("races").update(payload).eq("id", id)
      : await client.from("races").insert(payload);

    if (result.error) throw result.error;

    $("raceMessage").textContent = id ? "Race updated." : "Race added.";

    clearRaceForm(false);
    await Promise.all([loadRaces(), loadStats()]);
    showAdminToast(id ? "Race updated." : "Race added.");
  } catch (error) {
    $("raceMessage").textContent = error.message;
  }
}

function clearRaceForm(clearMessage = true) {
  $("raceForm").reset();
  $("raceId").value = "";
  $("raceIsArchived").checked = false;
  $("raceBanner").value = "";
  $("raceBannerPreview").innerHTML = "";
  $("raceFormTitle").textContent = "Add Race";

  if (clearMessage) {
    $("raceMessage").textContent = "";
  }
}

function switchTab(tab) {
  $("overviewTab").classList.toggle("hidden", tab !== "overview");
  $("leaguesTab").classList.toggle("hidden", tab !== "leagues");
  $("racesTab").classList.toggle("hidden", tab !== "races");
  $("rankingsTab").classList.toggle("hidden", tab !== "rankings");
  $("communityTab").classList.toggle("hidden", tab !== "community");
  $("galleryTab").classList.toggle("hidden", tab !== "gallery");

  const titles = {
    overview: "Dashboard",
    leagues: "Leagues",
    races: "Races",
    rankings: "Rankings",
    community: "Community",
    gallery: "Gallery",
  };

  $("adminTitle").textContent = titles[tab] || "Dashboard";

  document.querySelectorAll(".admin-nav button[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value) {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map(Number);

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
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

function normalizeSavedZone(value) {
  const aliases = {
    "GMT+4": "Asia/Dubai",
    "UTC+4": "Asia/Dubai",
    GST: "Asia/Dubai",
    GMT: "Europe/London",
  };

  return aliases[value] || value || "Asia/Dubai";
}

async function loadRankings() {
  const { data, error } = await client
    .from("league_rankings")
    .select("*, leagues(name, abbreviation, logo_url, banner_url)")
    .order("position", { ascending: true });

  if (error) {
    $("rankingMessage").textContent = error.message;
    return;
  }

  rankingCache = data || [];
  renderRankingList();
  $("adminRankingCount").textContent = rankingCache.length;
}

function populateRankingLeagueSelect() {
  const currentValue = $("rankingLeague")?.value || "";

  if (!$("rankingLeague")) return;

  $("rankingLeague").innerHTML = `
    <option value="">Choose a league</option>
    ${leagueCache
      .map(
        (league) => `
      <option value="${league.id}">${escapeHtml(league.name)}</option>
    `,
      )
      .join("")}
  `;

  if (currentValue) {
    $("rankingLeague").value = currentValue;
  }
}

function renderRankingList() {
  const filteredRankings = rankingCache.filter((ranking) => {
    const searchable = [
      ranking.leagues?.name,
      ranking.leagues?.abbreviation,
      ranking.tier,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(rankingAdminSearchQuery);
  });

  $("adminRankingEmpty").classList.toggle(
    "hidden",
    filteredRankings.length > 0,
  );

  $("adminRankingList").innerHTML = filteredRankings
    .map(
      (ranking, index) => `
    <article
      class="admin-list-row ranking-admin-row smart-ranking-row"
      draggable="true"
      data-ranking-id="${ranking.id}"
      data-ranking-index="${index}"
    >
      <div class="ranking-drag-handle" title="Drag to reorder">⋮⋮</div>

      <div
        class="admin-ranking-logo"
        title="${escapeHtml(ranking.leagues?.name || "Unknown league")}"
      >
        ${
          ranking.leagues?.logo_url
            ? `<img src="${escapeHtml(ranking.leagues.logo_url)}" alt="${escapeHtml(ranking.leagues?.name || "League")} logo" loading="lazy">`
            : `<span>${escapeHtml(
                String(
                  ranking.leagues?.abbreviation ||
                    ranking.leagues?.name ||
                    "LG",
                )
                  .slice(0, 3)
                  .toUpperCase(),
              )}</span>`
        }
      </div>

      <div class="admin-list-copy ranking-admin-copy">
        <strong title="${escapeHtml(ranking.leagues?.name || "Unknown league")}">
          ${escapeHtml(
            String(
              ranking.leagues?.abbreviation ||
                ranking.leagues?.name ||
                "LG",
            ).toUpperCase(),
          )}
        </strong>
        <span>
          <span class="tier-badge tier-${String(ranking.tier || "C").toLowerCase()}">
            ${escapeHtml(String(ranking.tier || "C").toUpperCase())} Tier
          </span>
        </span>
      </div>

      <div class="ranking-move-actions">
        <button
          class="ranking-arrow"
          type="button"
          aria-label="Move up"
          onclick="moveRanking(${ranking.id}, -1)"
          ${index === 0 ? "disabled" : ""}
        >
          ↑
        </button>

        <button
          class="ranking-arrow"
          type="button"
          aria-label="Move down"
          onclick="moveRanking(${ranking.id}, 1)"
          ${index === filteredRankings.length - 1 ? "disabled" : ""}
        >
          ↓
        </button>
      </div>

      <div class="admin-row-actions">
        <button class="button secondary" onclick="editRanking(${ranking.id})">Edit Tier</button>
        <button class="button danger" onclick="deleteRanking(${ranking.id}, '${escapeJs(ranking.leagues?.name || "ranking")}')">Delete</button>
      </div>
    </article>
  `,
    )
    .join("");

  initializeRankingDragAndDrop();
}

window.editRanking = function (id) {
  const ranking = rankingCache.find((item) => item.id === id);
  if (!ranking) return;

  switchTab("rankings");

  $("rankingId").value = ranking.id;
  $("rankingLeague").value = ranking.league_id;
  $("rankingPosition").value = ranking.position;
  $("rankingTier").value = ranking.tier || "C";
  $("rankingFormTitle").textContent = "Edit Ranking";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteRanking = async function (id, name) {
  if (
    !confirm(
      `Delete the ranking for ${name}? Other positions will close the gap automatically.`,
    )
  ) {
    return;
  }

  const { error } = await client.rpc("delete_league_ranking", {
    p_ranking_id: id,
  });

  if (error) {
    alert(error.message);
    return;
  }

  clearRankingForm();
  await Promise.all([loadRankings(), loadStats()]);
  showAdminToast("Ranking deleted and positions updated.");
};

async function saveRanking(event) {
  event.preventDefault();
  $("rankingMessage").textContent = "Saving…";

  try {
    const leagueId = Number($("rankingLeague").value);
    const requestedPosition = Number($("rankingPosition").value);
    const tier = $("rankingTier").value;

    if (!leagueId) {
      throw new Error("Choose a league.");
    }

    const { error } = await client.rpc("set_league_ranking", {
      p_league_id: leagueId,
      p_position: requestedPosition,
      p_tier: tier,
    });

    if (error) throw error;

    $("rankingMessage").textContent =
      "Ranking saved and all positions adjusted.";
    clearRankingForm(false);
    await Promise.all([loadRankings(), loadStats()]);
  } catch (error) {
    $("rankingMessage").textContent = error.message;
  }
}

function clearRankingForm(clearMessage = true) {
  $("rankingForm").reset();
  $("rankingId").value = "";
  $("rankingTier").value = "S";
  $("rankingFormTitle").textContent = "Add Ranking";

  if (clearMessage) {
    $("rankingMessage").textContent = "";
  }
}

function initializeScrollExperience() {
  const progress = document.getElementById("scrollProgress");
  const navLinks = [
    ...document.querySelectorAll(".site-header nav a[href^='#']"),
  ];
  const sections = [...document.querySelectorAll("main section[id]")];

  function updateProgress() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const ratio = maxScroll > 0 ? scrollY / maxScroll : 0;
    if (progress)
      progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;

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
      link.classList.toggle(
        "active-section",
        link.getAttribute("href") === `#${activeId}`,
      );
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
    { threshold: 0.22 },
  );

  document
    .querySelectorAll(".scroll-scene")
    .forEach((scene) => sceneObserver.observe(scene));
}

window.addEventListener("load", initializeScrollExperience);

function getAdminRaceDate(race) {
  const time = String(race.race_time || "00:00").slice(0, 5);
  return new Date(`${race.race_date}T${time}:00`);
}

function getRaceStatus(race) {
  if (race.is_archived) return "archived";
  if (race.is_live) return "live";
  return getAdminRaceDate(race) < new Date() ? "completed" : "upcoming";
}

function statusLabel(status) {
  const labels = {
    upcoming: "Upcoming",
    live: "Live now",
    completed: "Completed",
    archived: "Archived",
  };

  return labels[status] || status;
}

function animateAdminNumber(element, target) {
  if (!element) return;

  const startValue = Number(element.textContent) || 0;
  const duration = 500;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    element.textContent = Math.round(
      startValue + (target - startValue) * eased,
    );

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function showAdminToast(message) {
  let toast = document.getElementById("adminToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.adminToastTimer);

  window.adminToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function setupUploadZone(zoneId, inputId) {
  const zone = $(zoneId);
  const input = $(inputId);

  if (!zone || !input) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    });
  });

  zone.addEventListener("drop", (event) => {
    const files = event.dataTransfer.files;

    if (!files.length) return;

    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    input.files = transfer.files;

    renderSelectedAssetPreviews();
  });
}

function renderSelectedAssetPreviews() {
  const preview = $("assetPreview");
  const files = [$("leagueLogo").files[0], $("leagueBanner").files[0]].filter(
    Boolean,
  );

  if (!files.length) return;

  preview.innerHTML = "";

  files.forEach((file) => {
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    preview.appendChild(image);
  });
}

async function loadCommunitySettings() {
  const { data, error } = await client
    .from("community_settings")
    .select("draft, published, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    $("communityMessage").textContent = error.message;
    return;
  }

  communityDraft = data?.draft || data?.published || defaultCommunitySettings();
  fillCommunityForm(communityDraft);
  updateCommunityPreview();

  $("communitySaveState").textContent = data?.updated_at
    ? `Last saved ${new Date(data.updated_at).toLocaleString()}`
    : "New draft";
}

function defaultCommunitySettings() {
  return {
    announcement: {
      enabled: false,
      title: "",
      text: "",
      type: "info",
      button_text: "",
      button_url: "",
      expires_at: "",
    },
    league_of_week_id: "",
    race_of_week_id: "",
    featured_stream: {
      enabled: false,
      title: "",
      url: "",
      description: "",
    },
    trending_league_ids: [],
    show_recently_added: true,
    recently_added_limit: 6,
  };
}

function populateCommunitySelectors() {
  if (!$("leagueOfWeekSelect") || !$("raceOfWeekSelect")) return;

  const currentLeague = $("leagueOfWeekSelect").value;
  const currentRace = $("raceOfWeekSelect").value;

  $("leagueOfWeekSelect").innerHTML = `
    <option value="">None</option>
    ${leagueCache
      .map(
        (league) => `
      <option value="${league.id}">${escapeHtml(league.name)}</option>
    `,
      )
      .join("")}
  `;

  $("raceOfWeekSelect").innerHTML = `
    <option value="">None</option>
    ${raceCache
      .filter((race) => !race.is_archived)
      .map(
        (race) => `
        <option value="${race.id}">
          ${escapeHtml(race.league_name)} — ${escapeHtml(race.event_name || "Race")}
        </option>
      `,
      )
      .join("")}
  `;

  if (currentLeague) $("leagueOfWeekSelect").value = currentLeague;
  if (currentRace) $("raceOfWeekSelect").value = currentRace;

  renderTrendingSelector();
}

function renderTrendingSelector() {
  if (!$("trendingLeagueSelector")) return;

  const selected = new Set(
    Array.isArray(communityDraft.trending_league_ids)
      ? communityDraft.trending_league_ids.map(String)
      : [],
  );

  $("trendingLeagueSelector").innerHTML = leagueCache
    .map(
      (league) => `
    <label class="trending-option">
      <input
        type="checkbox"
        value="${league.id}"
        ${selected.has(String(league.id)) ? "checked" : ""}
      >
      <span class="trending-option-logo">
        ${
          league.logo_url
            ? `<img src="${escapeHtml(league.logo_url)}" alt="">`
            : escapeHtml(
                league.abbreviation || league.name.slice(0, 3).toUpperCase(),
              )
        }
      </span>
      <strong>${escapeHtml(league.name)}</strong>
    </label>
  `,
    )
    .join("");

  $("trendingLeagueSelector")
    .querySelectorAll("input")
    .forEach((input) => {
      input.addEventListener("change", updateCommunityPreview);
    });
}

function fillCommunityForm(settings) {
  const announcement = settings.announcement || {};
  const stream = settings.featured_stream || {};

  $("announcementEnabled").checked = announcement.enabled === true;
  $("announcementTitle").value = announcement.title || "";
  $("announcementType").value = announcement.type || "info";
  $("announcementText").value = announcement.text || "";
  $("announcementButtonText").value = announcement.button_text || "";
  $("announcementButtonUrl").value = announcement.button_url || "";
  $("announcementExpiry").value = toDateTimeLocal(announcement.expires_at);

  $("leagueOfWeekSelect").value = settings.league_of_week_id || "";
  $("raceOfWeekSelect").value = settings.race_of_week_id || "";

  $("streamEnabled").checked = stream.enabled === true;
  $("streamTitle").value = stream.title || "";
  $("streamUrl").value = stream.url || "";
  $("streamDescription").value = stream.description || "";

  $("showRecentlyAdded").checked = settings.show_recently_added !== false;
  $("recentlyAddedLimit").value = settings.recently_added_limit || 6;

  renderTrendingSelector();
}

function collectCommunityForm() {
  const trendingIds = [
    ...$("trendingLeagueSelector").querySelectorAll("input:checked"),
  ].map((input) => Number(input.value));

  return {
    announcement: {
      enabled: $("announcementEnabled").checked,
      title: $("announcementTitle").value.trim(),
      text: $("announcementText").value.trim(),
      type: $("announcementType").value,
      button_text: $("announcementButtonText").value.trim(),
      button_url: $("announcementButtonUrl").value.trim(),
      expires_at: $("announcementExpiry").value
        ? new Date($("announcementExpiry").value).toISOString()
        : "",
    },
    league_of_week_id: $("leagueOfWeekSelect").value
      ? Number($("leagueOfWeekSelect").value)
      : "",
    race_of_week_id: $("raceOfWeekSelect").value
      ? Number($("raceOfWeekSelect").value)
      : "",
    featured_stream: {
      enabled: $("streamEnabled").checked,
      title: $("streamTitle").value.trim(),
      url: $("streamUrl").value.trim(),
      description: $("streamDescription").value.trim(),
    },
    trending_league_ids: trendingIds.slice(0, 6),
    show_recently_added: $("showRecentlyAdded").checked,
    recently_added_limit: Math.min(
      12,
      Math.max(1, Number($("recentlyAddedLimit").value || 6)),
    ),
  };
}

async function saveCommunityDraft() {
  const draft = collectCommunityForm();
  $("communityMessage").textContent = "Saving draft…";

  const { error } = await client.from("community_settings").upsert({
    id: 1,
    draft,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    $("communityMessage").textContent = error.message;
    return;
  }

  communityDraft = draft;
  $("communityMessage").textContent =
    "Draft saved. Visitors cannot see it yet.";
  $("communitySaveState").textContent = "Draft saved just now";
  updateCommunityPreview();
}

async function publishCommunity() {
  const published = collectCommunityForm();
  $("communityMessage").textContent = "Publishing…";

  const { error } = await client.from("community_settings").upsert({
    id: 1,
    draft: published,
    published,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    $("communityMessage").textContent = error.message;
    return;
  }

  communityDraft = published;
  $("communityMessage").textContent = "Community Hub published successfully.";
  $("communitySaveState").textContent = "Published just now";
  showAdminToast("Homepage content published.");
  updateCommunityPreview();
}

function updateCommunityPreview() {
  if (!$("communityDraftPreview")) return;

  const settings = collectCommunityForm();
  const league = leagueCache.find(
    (item) => String(item.id) === String(settings.league_of_week_id),
  );
  const race = raceCache.find(
    (item) => String(item.id) === String(settings.race_of_week_id),
  );

  $("communityDraftPreview").innerHTML = `
    <div class="draft-preview-item">
      <span>Announcement</span>
      <strong>${settings.announcement.enabled ? escapeHtml(settings.announcement.title || "Enabled") : "Hidden"}</strong>
    </div>

    <div class="draft-preview-item">
      <span>League of the Week</span>
      <strong>${escapeHtml(league?.name || "None")}</strong>
    </div>

    <div class="draft-preview-item">
      <span>Race of the Week</span>
      <strong>${escapeHtml(race?.event_name || "None")}</strong>
    </div>

    <div class="draft-preview-item">
      <span>Featured Stream</span>
      <strong>${settings.featured_stream.enabled ? escapeHtml(settings.featured_stream.title || "Enabled") : "Hidden"}</strong>
    </div>

    <div class="draft-preview-item">
      <span>Trending</span>
      <strong>${settings.trending_league_ids.length} leagues</strong>
    </div>

    <div class="draft-preview-item">
      <span>Recently Added</span>
      <strong>${settings.show_recently_added ? `${settings.recently_added_limit} shown` : "Hidden"}</strong>
    </div>
  `;
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

window.moveRanking = async function (rankingId, direction) {
  const currentIndex = rankingCache.findIndex((item) => item.id === rankingId);
  const newIndex = currentIndex + direction;

  if (currentIndex < 0 || newIndex < 0 || newIndex >= rankingCache.length) {
    return;
  }

  const reordered = [...rankingCache];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(newIndex, 0, moved);

  await saveRankingOrder(reordered.map((item) => item.id));
};

function initializeRankingDragAndDrop() {
  let draggedId = null;

  document.querySelectorAll(".smart-ranking-row").forEach((row) => {
    row.addEventListener("dragstart", () => {
      draggedId = Number(row.dataset.rankingId);
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      draggedId = null;
      row.classList.remove("dragging");
      document
        .querySelectorAll(".smart-ranking-row")
        .forEach((item) => item.classList.remove("drag-over"));
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();

      document
        .querySelectorAll(".smart-ranking-row")
        .forEach((item) => item.classList.remove("drag-over"));

      row.classList.add("drag-over");
    });

    row.addEventListener("drop", async (event) => {
      event.preventDefault();

      const targetId = Number(row.dataset.rankingId);

      if (!draggedId || draggedId === targetId) return;

      const reordered = [...rankingCache];
      const from = reordered.findIndex((item) => item.id === draggedId);
      const to = reordered.findIndex((item) => item.id === targetId);
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);

      await saveRankingOrder(reordered.map((item) => item.id));
    });
  });
}

async function saveRankingOrder(rankingIds) {
  const { error } = await client.rpc("reorder_league_rankings", {
    p_ranking_ids: rankingIds,
  });

  if (error) {
    alert(error.message);
    return;
  }

  await loadRankings();
  showAdminToast("Ranking order updated.");
}

async function loadGalleryImages() {
  const { data, error } = await client
    .from("league_gallery")
    .select("*, leagues(name)")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if ($("galleryMessage")) {
      $("galleryMessage").textContent = error.message;
    }
    return;
  }

  galleryCache = data || [];
  renderGalleryList();
}

function populateGallerySelectors() {
  if (!$("galleryLeague") || !$("galleryLeagueFilter")) return;

  const uploadValue = $("galleryLeague").value;
  const filterValue = $("galleryLeagueFilter").value;

  const options = leagueCache
    .map(
      (league) => `
    <option value="${league.id}">${escapeHtml(league.name)}</option>
  `,
    )
    .join("");

  $("galleryLeague").innerHTML = `
    <option value="">Choose a league</option>
    ${options}
  `;

  $("galleryLeagueFilter").innerHTML = `
    <option value="all">All leagues</option>
    ${options}
  `;

  if (uploadValue) $("galleryLeague").value = uploadValue;
  if (filterValue) $("galleryLeagueFilter").value = filterValue;
}

function renderGalleryList() {
  if (!$("adminGalleryList")) return;

  const filtered = galleryCache.filter(
    (item) =>
      galleryLeagueFilter === "all" ||
      String(item.league_id) === String(galleryLeagueFilter),
  );

  $("adminGalleryEmpty").classList.toggle("hidden", filtered.length > 0);

  $("adminGalleryList").innerHTML = filtered
    .map(
      (item) => `
    <article class="admin-gallery-card ${item.is_featured ? "featured-gallery-item" : ""}">
      <div class="admin-gallery-image">
        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.caption || "Gallery image")}">
        ${item.is_featured ? `<span class="featured-pill">FEATURED</span>` : ""}
      </div>

      <div class="admin-gallery-copy">
        <strong>${escapeHtml(item.leagues?.name || "Unknown league")}</strong>
        <span>${escapeHtml(item.caption || "No caption")}</span>
      </div>

      <div class="admin-row-actions">
        ${
          item.is_featured
            ? `<button class="button secondary" onclick="setGalleryFeatured(${item.id}, false)">Unfeature</button>`
            : `<button class="button secondary" onclick="setGalleryFeatured(${item.id}, true)">Feature</button>`
        }

        <button
          class="button danger"
          onclick="deleteGalleryImage(${item.id}, '${escapeJs(item.storage_path)}')"
        >
          Delete
        </button>
      </div>
    </article>
  `,
    )
    .join("");
}

async function uploadGalleryImage(event) {
  event.preventDefault();
  $("galleryMessage").textContent = "Uploading…";

  try {
    const leagueId = Number($("galleryLeague").value);
    const file = $("galleryImage").files[0];

    if (!leagueId) {
      throw new Error("Choose a league.");
    }

    if (!file) {
      throw new Error("Choose an image.");
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Gallery images must be 8 MB or smaller.");
    }

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `gallery/${leagueId}/${crypto.randomUUID()}.${extension}`;

    const uploadResult = await client.storage
      .from("league-assets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) throw uploadResult.error;

    const publicUrl = client.storage.from("league-assets").getPublicUrl(path)
      .data.publicUrl;

    const featured = $("galleryFeatured").checked;

    if (featured) {
      const clearResult = await client
        .from("league_gallery")
        .update({ is_featured: false })
        .eq("league_id", leagueId);

      if (clearResult.error) throw clearResult.error;
    }

    const insertResult = await client.from("league_gallery").insert({
      league_id: leagueId,
      image_url: publicUrl,
      storage_path: path,
      caption: $("galleryCaption").value.trim() || null,
      is_featured: featured,
    });

    if (insertResult.error) throw insertResult.error;

    $("galleryMessage").textContent = "Gallery image uploaded.";
    $("galleryForm").reset();
    $("galleryPreview").innerHTML = "";

    await loadGalleryImages();
    showAdminToast("Gallery image uploaded.");
  } catch (error) {
    $("galleryMessage").textContent = error.message;
  }
}

window.setGalleryFeatured = async function (id, featured) {
  const item = galleryCache.find((entry) => entry.id === id);
  if (!item) return;

  if (featured) {
    const clearResult = await client
      .from("league_gallery")
      .update({ is_featured: false })
      .eq("league_id", item.league_id);

    if (clearResult.error) {
      alert(clearResult.error.message);
      return;
    }
  }

  const result = await client
    .from("league_gallery")
    .update({ is_featured: featured })
    .eq("id", id);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  await loadGalleryImages();
  showAdminToast(featured ? "Featured image updated." : "Image unfeatured.");
};

window.deleteGalleryImage = async function (id, storagePath) {
  if (!confirm("Delete this gallery image permanently?")) return;

  if (storagePath) {
    const storageResult = await client.storage
      .from("league-assets")
      .remove([storagePath]);

    if (storageResult.error) {
      alert(storageResult.error.message);
      return;
    }
  }

  const result = await client.from("league_gallery").delete().eq("id", id);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  await loadGalleryImages();
  showAdminToast("Gallery image deleted.");
};

function renderGalleryPreview() {
  const file = $("galleryImage").files[0];

  if (!file) {
    $("galleryPreview").innerHTML = "";
    return;
  }

  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  image.alt = file.name;

  $("galleryPreview").innerHTML = "";
  $("galleryPreview").appendChild(image);
}

function renderRaceBannerPreview() {
  const file = $("raceBanner").files[0];

  if (!file) return;

  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  image.alt = file.name;

  $("raceBannerPreview").innerHTML = "";
  $("raceBannerPreview").appendChild(image);
}
