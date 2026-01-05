// assets/supabaseClient.js
(() => {
  const SUPABASE_URL = "https://zcoqexviygopxosnmzmc.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb3FleHZpeWdvcHhvc25tem1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI1MzEsImV4cCI6MjA4Mjg4ODUzMX0.bUuh1yemk__o1uPj-SMM4sNzH8YEDifa1bSCzfmr9Zc";

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // quick sanity check
  console.log("✅ Supabase initialised:", SUPABASE_URL);
})();
