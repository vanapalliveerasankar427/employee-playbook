// assets/accessControl.js — TEP (static HTML compatible)
// Redirects logged-out users away from protected pages

(function () {
  const client = window.supabaseClient;

  if (!client) {
    console.error("[TEP] supabaseClient missing. Check script order.");
    return;
  }

  // Save attempted URL then redirect to sign in
  function redirectToSignIn() {
    const returnTo = window.location.pathname + window.location.search;
    localStorage.setItem("returnTo", returnTo);
    window.location.href = "sign-in.html";
  }

  // Run immediately on protected pages
  (async () => {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error(error);
      redirectToSignIn();
      return;
    }

    const session = data?.session;
    if (!session) {
      redirectToSignIn();
    }
  })();
})();
