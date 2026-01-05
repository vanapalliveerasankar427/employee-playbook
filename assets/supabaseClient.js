// assets/supabaseClient.js (Browser / static HTML version)

(function () {
  // ✅ Replace these two with your real values
  const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
  const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

  if (!window.supabase) {
    throw new Error("[TEP] Supabase CDN not loaded. Add the supabase-js script BEFORE supabaseClient.js");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("PASTE_")) {
    throw new Error("[TEP] Supabase keys missing in assets/supabaseClient.js");
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        "x-application-name": "the-employee-playbook",
      },
    },
  });
})();
