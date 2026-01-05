// assets/auth.js — simple login + signup for static HTML pages (TEP)

(function () {
  const client = window.supabaseClient;

  if (!client) {
    console.error("[TEP] supabaseClient not found. Check script order.");
    return;
  }

  // --- Helpers ---
  function getReturnTo() {
    const url = new URL(window.location.href);
    return (
      url.searchParams.get("returnTo") ||
      localStorage.getItem("returnTo") ||
      "index.html"
    );
  }

  function clearReturnTo() {
    localStorage.removeItem("returnTo");
  }

  function goAfterAuth() {
    const to = getReturnTo();
    clearReturnTo();
    window.location.href = to;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // --- Wire up SIGN IN form ---
  // Expecting IDs: signin-email, signin-password, signin-form OR signin-button
  const signInForm = byId("signin-form");
  const signInBtn = byId("signin-button");

  async function handleSignIn(e) {
    if (e) e.preventDefault();
    const email = (byId("signin-email")?.value || "").trim();
    const password = byId("signin-password")?.value || "";

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      await signIn(email, password);
      goAfterAuth();
    } catch (err) {
      console.error(err);
      alert(err.message || "Sign-in failed.");
    }
  }

  if (signInForm) signInForm.addEventListener("submit", handleSignIn);
  if (signInBtn) signInBtn.addEventListener("click", handleSignIn);

  // --- Wire up CREATE ACCOUNT form ---
  // Expecting IDs: signup-email, signup-password, signup-form OR signup-button
  const signUpForm = byId("signup-form");
  const signUpBtn = byId("signup-button");

  async function handleSignUp(e) {
    if (e) e.preventDefault();
    const email = (byId("signup-email")?.value || "").trim();
    const password = byId("signup-password")?.value || "";

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      await signUp(email, password);
      alert("Account created. You can now sign in.");
      // Optional: redirect straight to sign-in page
      // window.location.href = "sign-in.html";
    } catch (err) {
      console.error(err);
      alert(err.message || "Sign-up failed.");
    }
  }

  if (signUpForm) signUpForm.addEventListener("submit", handleSignUp);
  if (signUpBtn) signUpBtn.addEventListener("click", handleSignUp);
})();
