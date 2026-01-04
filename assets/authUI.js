/**
 * authUI.js — The Employee Playbook
 * ------------------------------------------------------------
 * Purpose:
 * - UI helpers for authentication + tier gating
 * - Renders locked overlays, badges, and upgrade/sign-in prompts
 * - Keeps copy consistent (executive-grade, UK English)
 *
 * Works in:
 * - Vanilla JS pages (your current HTML tool pages)
 * - Can be used inside React with minimal changes
 *
 * Dependencies:
 * - accessControl.js (for lock state logic)
 *
 * Assumptions:
 * - You store auth state in localStorage under "tep_user"
 *   (adjust keys/functions if you use cookies/session instead)
 */

import {
  TIERS,
  TIER_LABELS,
  FEATURES,
  getUserTier,
  isLoggedIn,
  hasFeature,
  getLockStateForFeature,
  canAccessRoute,
  checkAccessForPath,
  describeUserAccess,
} from "./accessControl.js";

/* =========================
   Local user storage
========================= */

const STORAGE_KEY = "tep_user";

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    // ignore
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

/* =========================
   URL helpers (return path + preserve returnTo)
========================= */

export function buildAuthUrl(path, returnTo = null) {
  const safeReturn = returnTo || window.location.pathname + window.location.search + window.location.hash;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("returnTo", safeReturn);
  return url.pathname + url.search;
}

export function redirectToSignIn(returnTo = null) {
  window.location.href = buildAuthUrl("/sign-in", returnTo);
}

export function redirectToPricing(returnTo = null) {
  window.location.href = buildAuthUrl("/pricing", returnTo);
}

/* =========================
   Guard the current page
   (call early on page load)
========================= */

export function guardPageAccess(options = {}) {
  const {
    pathname = window.location.pathname,
    user = getStoredUser(),
    // If you want to hard enforce route policy on all pages:
    enforceRoutePolicy = true,
  } = options;

  if (!enforceRoutePolicy) return { allowed: true };

  const allowed = canAccessRoute(user, pathname);
  if (allowed) return { allowed: true };

  // Decide redirect
  if (!isLoggedIn(user)) {
    redirectToSignIn(pathname);
    return { allowed: false, redirectedTo: "sign-in" };
  }

  redirectToPricing(pathname);
  return { allowed: false, redirectedTo: "pricing" };
}

/* =========================
   Badges + tier chip
========================= */

export function createTierChip(user = getStoredUser()) {
  const tier = getUserTier(user);
  const label = TIER_LABELS[tier] || "Free";
  const locked = !isLoggedIn(user);

  const el = document.createElement("span");
  el.className = "tep-tier-chip";
  el.setAttribute("data-tier", tier);
  el.textContent = locked ? "Guest" : label;
  return el;
}

export function createLockedBadge(requiredTier = TIERS.CORE) {
  const el = document.createElement("span");
  el.className = "tep-locked-badge";
  el.innerHTML = `<i class="fa-solid fa-lock"></i><span>Locked</span><span class="tep-locked-tier">${TIER_LABELS[requiredTier] || "Core"}+</span>`;
  return el;
}

/* =========================
   Locked overlay (premium look)
========================= */

export function renderLockedOverlay(targetEl, lockState, options = {}) {
  if (!targetEl || !lockState?.locked) return null;

  const {
    title = "This feature is locked",
    subtitle = "Upgrade to unlock the full toolset.",
    compact = false,
  } = options;

  const overlay = document.createElement("div");
  overlay.className = `tep-locked-overlay ${compact ? "is-compact" : ""}`;

  const reason = lockState.reason || "upgrade_required";
  const ctaLabel = lockState.cta?.label || "Upgrade to unlock";
  const ctaHref = lockState.cta?.href || "/pricing";

  const reqTier = lockState.requiredTier || null;
  const currentTier = lockState.currentTier || null;

  overlay.innerHTML = `
    <div class="tep-locked-card" role="dialog" aria-modal="true">
      <div class="tep-locked-icon"><i class="fa-solid fa-lock"></i></div>
      <div class="tep-locked-copy">
        <div class="tep-locked-title">${escapeHtml(title)}</div>
        <div class="tep-locked-subtitle">${escapeHtml(subtitle)}</div>
        ${
          reqTier
            ? `<div class="tep-locked-meta">
                 <span class="tep-pill">Requires: <strong>${escapeHtml(TIER_LABELS[reqTier] || reqTier)}</strong></span>
                 ${currentTier ? `<span class="tep-pill">You have: <strong>${escapeHtml(TIER_LABELS[currentTier] || currentTier)}</strong></span>` : ""}
               </div>`
            : ""
        }
        <div class="tep-locked-actions">
          <a class="tep-btn tep-btn-primary" href="${ctaHref}" data-tep-cta="upgrade">${escapeHtml(ctaLabel)}</a>
          ${
            reason === "sign_in_required"
              ? `<a class="tep-btn tep-btn-ghost" href="${buildAuthUrl("/sign-in")}" data-tep-cta="signin">Sign in</a>`
              : `<a class="tep-btn tep-btn-ghost" href="/help-centre" data-tep-cta="help">Help Centre</a>`
          }
        </div>
      </div>
    </div>
  `;

  // Make sure parent can position overlay
  const style = window.getComputedStyle(targetEl);
  if (style.position === "static") targetEl.style.position = "relative";

  targetEl.classList.add("tep-has-locked-overlay");
  targetEl.appendChild(overlay);

  // Preserve returnTo for CTA
  overlay.querySelectorAll('a[data-tep-cta="upgrade"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      redirectToPricing(window.location.pathname);
    });
  });
  overlay.querySelectorAll('a[data-tep-cta="signin"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      redirectToSignIn(window.location.pathname);
    });
  });

  return overlay;
}

/* =========================
   Feature gating (hide/disable/overlay)
========================= */

export function gateFeature(options = {}) {
  const {
    featureKey,
    minTier = null, // optional tier requirement
    user = getStoredUser(),
    // Target element(s)
    selector = null,
    element = null,
    mode = "overlay", // "overlay" | "disable" | "hide"
    overlayTitle = "Locked feature",
    overlaySubtitle = "Upgrade to unlock this part of the tool.",
    compactOverlay = true,
  } = options;

  if (!featureKey && !minTier) return { allowed: true, reason: null };

  const lockState = getLockStateForFeature(user, featureKey, minTier);
  if (!lockState.locked) return { allowed: true, reason: null };

  const els = [];
  if (element) els.push(element);
  if (selector) els.push(...Array.from(document.querySelectorAll(selector)));

  els.forEach((el) => {
    if (!el) return;

    if (mode === "hide") {
      el.style.display = "none";
      return;
    }

    if (mode === "disable") {
      disableElementTree(el);
      el.classList.add("tep-locked-disabled");
      // Add a small badge if desired
      if (!el.querySelector(".tep-locked-badge")) {
        el.prepend(createLockedBadge(lockState.requiredTier || minTier || TIERS.CORE));
      }
      el.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLoggedIn(user)) return redirectToSignIn(window.location.pathname);
          return redirectToPricing(window.location.pathname);
        },
        true
      );
      return;
    }

    // default overlay
    renderLockedOverlay(el, lockState, {
      title: overlayTitle,
      subtitle: overlaySubtitle,
      compact: compactOverlay,
    });
  });

  return { allowed: false, reason: lockState.reason, lockState };
}

/* =========================
   Header mini status (optional)
========================= */

export function mountAuthStatusBadge(containerSelector = "[data-tep-auth-status]") {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  const user = getStoredUser();
  const tier = getUserTier(user);
  const loggedIn = isLoggedIn(user);

  container.innerHTML = "";

  const chip = createTierChip(user);
  container.appendChild(chip);

  const link = document.createElement("a");
  link.className = "tep-auth-link";
  link.href = loggedIn ? "/my-playbook" : "/sign-in";
  link.textContent = loggedIn ? "My Playbook" : "Sign in";
  container.appendChild(link);

  return container;
}

/* =========================
   Minimal CSS injector
   (use if your pages don’t already include styles)
   You can delete this if you are styling centrally.
========================= */

export function injectAuthUIStyles() {
  if (document.getElementById("tep-authui-styles")) return;

  const style = document.createElement("style");
  style.id = "tep-authui-styles";
  style.textContent = `
    .tep-tier-chip{
      display:inline-flex; align-items:center; gap:8px;
      padding:8px 12px;
      border-radius:999px;
      font-size:12px; font-weight:700;
      letter-spacing:.2px;
      border:1px solid rgba(123,95,196,.22);
      background: linear-gradient(180deg, rgba(123,95,196,.12), rgba(123,95,196,.06));
      color: rgba(16,24,40,.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(16,24,40,.06);
    }
    .dark-mode .tep-tier-chip{
      border-color: rgba(157,134,233,.25);
      background: linear-gradient(180deg, rgba(157,134,233,.18), rgba(157,134,233,.08));
      color: rgba(255,255,255,.92);
    }

    .tep-locked-badge{
      display:inline-flex; align-items:center; gap:8px;
      padding:8px 10px;
      border-radius:999px;
      font-size:12px; font-weight:700;
      border:1px solid rgba(239,68,68,.22);
      background: linear-gradient(180deg, rgba(239,68,68,.12), rgba(239,68,68,.06));
      color: rgba(127,29,29,.92);
    }
    .dark-mode .tep-locked-badge{
      border-color: rgba(248,113,113,.26);
      background: linear-gradient(180deg, rgba(248,113,113,.18), rgba(248,113,113,.08));
      color: rgba(255,255,255,.92);
    }
    .tep-locked-tier{ opacity:.85; font-weight:800; }

    .tep-has-locked-overlay{ overflow:hidden; }
    .tep-locked-overlay{
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      padding:22px;
      background: rgba(248,250,252,.72);
      backdrop-filter: blur(10px);
      border-radius: 18px;
      z-index: 40;
    }
    .dark-mode .tep-locked-overlay{
      background: rgba(9,12,18,.62);
    }
    .tep-locked-card{
      width:min(560px, 92%);
      display:flex; gap:14px;
      padding:18px 18px;
      border-radius: 18px;
      border: 1px solid rgba(123,95,196,.18);
      background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.78));
      box-shadow: 0 24px 70px rgba(16,24,40,.16);
    }
    .dark-mode .tep-locked-card{
      border-color: rgba(157,134,233,.18);
      background: linear-gradient(180deg, rgba(18,20,28,.92), rgba(18,20,28,.78));
      box-shadow: 0 24px 70px rgba(0,0,0,.42);
    }
    .tep-locked-overlay.is-compact .tep-locked-card{
      width:min(520px, 92%);
      padding:16px 16px;
    }
    .tep-locked-icon{
      width:44px; height:44px;
      border-radius:14px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(123,95,196,.18);
      background: linear-gradient(180deg, rgba(123,95,196,.14), rgba(123,95,196,.06));
      flex:0 0 auto;
    }
    .dark-mode .tep-locked-icon{
      border-color: rgba(157,134,233,.20);
      background: linear-gradient(180deg, rgba(157,134,233,.18), rgba(157,134,233,.08));
    }
    .tep-locked-title{ font-size:16px; font-weight:800; color: inherit; }
    .tep-locked-subtitle{ margin-top:6px; font-size:13px; opacity:.82; line-height:1.4; }
    .tep-locked-meta{ margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }
    .tep-pill{
      display:inline-flex; align-items:center;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      border:1px solid rgba(123,95,196,.16);
      background: rgba(123,95,196,.06);
    }
    .dark-mode .tep-pill{
      border-color: rgba(157,134,233,.18);
      background: rgba(157,134,233,.08);
    }
    .tep-locked-actions{ margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; }
    .tep-btn{
      display:inline-flex; align-items:center; justify-content:center;
      padding:10px 14px;
      border-radius: 12px;
      font-size:13px;
      font-weight:800;
      text-decoration:none;
      cursor:pointer;
      border:1px solid transparent;
    }
    .tep-btn-primary{
      background: linear-gradient(90deg, rgba(123,95,196,1), rgba(157,134,233,1));
      color:#fff;
      box-shadow: 0 16px 40px rgba(123,95,196,.24);
    }
    .tep-btn-ghost{
      background: transparent;
      border-color: rgba(123,95,196,.22);
      color: inherit;
    }
    .tep-btn:hover{ transform: translateY(-1px); }
    .tep-auth-link{ margin-left:10px; font-weight:800; font-size:12px; text-decoration:none; opacity:.9; }
    .tep-locked-disabled{ opacity:.55; filter:saturate(.9); pointer-events:auto; }
  `;
  document.head.appendChild(style);
}

/* =========================
   Utilities
========================= */

function disableElementTree(root) {
  // Disable inputs/buttons/links inside container
  const focusables = root.querySelectorAll("button, a, input, select, textarea");
  focusables.forEach((el) => {
    if (el.tagName === "A") {
      el.setAttribute("data-tep-href", el.getAttribute("href") || "");
      el.removeAttribute("href");
      el.style.pointerEvents = "none";
    } else {
      el.disabled = true;
    }
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Quick start (vanilla pages)
   ------------------------------------------------------------
   import { injectAuthUIStyles, guardPageAccess, gateFeature } from "./authUI.js";
   injectAuthUIStyles();
   guardPageAccess();
   gateFeature({ featureKey: FEATURES.SAVE_TO_MY_PLAYBOOK, selector: "[data-save]" });
========================= */

export { TIERS, TIER_LABELS, FEATURES };
