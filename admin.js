const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

document.addEventListener("DOMContentLoaded", initializeAdmin);

async function initializeAdmin() {
  try {
    validateConfiguration();

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
      await showDashboard(session.user);
    } else {
      showLogin();
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await showDashboard(session.user);
      } else {
        showLogin();
      }
    });
  } catch (error) {
    loginMessage.textContent = error.message;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in…";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  loginMessage.textContent = "";
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

function validateConfiguration() {
  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    throw new Error("Add your Supabase URL and publishable key in config.js");
  }
}

function showLogin() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
}

async function showDashboard(user) {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  document.getElementById("adminEmail").textContent = user.email || "Admin";

  const [leagues, races, liveRaces, rankings] = await Promise.all([
    supabaseClient.from("leagues").select("*", { count: "exact", head: true }),
    supabaseClient.from("races").select("*", { count: "exact", head: true }),
    supabaseClient.from("races").select("*", { count: "exact", head: true }).eq("is_live", true),
    supabaseClient.from("league_rankings").select("*", { count: "exact", head: true })
  ]);

  document.getElementById("adminLeagueCount").textContent = leagues.count ?? 0;
  document.getElementById("adminRaceCount").textContent = races.count ?? 0;
  document.getElementById("adminLiveCount").textContent = liveRaces.count ?? 0;
  document.getElementById("adminRankingCount").textContent = rankings.count ?? 0;
}
