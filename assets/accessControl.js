/**
 * accessControl.js — The Employee Playbook
 * ------------------------------------------------------------
 * Purpose:
 * - Centralise tier/entitlement logic (Free/Core/Strategic Edge)
 * - Provide route + feature gating helpers
 * - Provide simple UI helpers (locked badges, upgrade CTAs)
 *
 * Works in:
 * - Next.js / React apps
 * - Plain Node/Express (route middleware)
 *
 * Notes:
 * - Keep this file “pure” (no direct DB calls). Pass user + plan
 * - UK spelling & TEP naming
 */

/* =========================
   Canonical Tiers
========================= */
export const TIERS = Object.freeze({
  FREE: "free",
  CORE: "core",
  EDGE: "edge", // Strategic Edge
});

export const TIER_LABELS = Object.freeze({
  [TIERS.FREE]: "Free",
  [TIERS.CORE]: "Core",
  [TIERS.EDGE]: "Strategic Edge",
});

/* =========================
   Category system (your 7 current names)
   (Useful for gating by category tools later)
========================= */
export const CATEGORIES = Object.freeze({
  EXPECTATIONS: "Expectations",
  BURNOUT: "Burnout & Capacity",
  MANAGER: "Manager Relationship & Leadership Style",
  POLITICS: "Workplace Dynamics & Politics",
  HR: "HR & Formal Processes",
  CONFIDENCE: "Confidence, Presence & Influence",
  CAREER: "Career Playbook",
  CLARITY: "Clarity, Priorities & Direction",
});

/* =========================
   Feature Keys (single source of truth)
   Add to this list as your app grows.
========================= */
export const FEATURES = Object.freeze({
  // Core utility
  DOWNLOADS: "downloads",
  SAVE_TO_MY_PLAYBOOK: "save_to_my_playbook",
  SEARCH: "search",
  DARK_MODE: "dark_mode",

  // Premium systems
  TEMPLATE_BANK: "template_bank",
  SCRIPT_LIBRARY: "script_library",
  SITUATION_SIMULATOR: "situation_simulator",
  STRATEGY_JOURNAL: "strategy_journal",
  VOICE_TO_TEXT_JOURNAL: "voice_to_text_journal",

  // Edge exclusives
  EDGE_BRIEFING: "edge_briefing",
  COACH_AI: "coach_ai",
  ADVANCED_TEMPLATE_BANK: "advanced_template_bank",
  OFFICE_POLITICS_MAPPING: "office_politics_mapping",
  EXIT_AND_REPUTATION_PLAN: "exit_and_reputation_plan",
});

/* =========================
   Default Entitlements by Tier
   (Adjust these when your pricing table finalises)
========================= */
const DEFAULT_ENTITLEMENTS = Object.freeze({
  [TIERS.FREE]: new Set([
    FEATURES.DARK_MODE,
    FEATURES.SEARCH,
    FEATURES.DOWNLOADS,
  ]),
  [TIERS.CORE]: new Set([
    FEATURES.DARK_MODE,
    FEATURES.SEARCH,
    FEATURES.DOWNLOADS,
    FEATURES.SAVE_TO_MY_PLAYBOOK,
    FEATURES.TEMPLATE_BANK,
    FEATURES.SCRIPT_LIBRARY,
    FEATURES.STRATEGY_JOURNAL,
  ]),
  [TIERS.EDGE]: new Set([
    FEATURES.DARK_MODE,
    FEATURES.SEARCH,
    FEATURES.DOWNLOADS,
    FEATURES.SAVE_TO_MY_PLAYBOOK,
    FEATURES.TEMPLATE_BANK,
    FEATURES.SCRIPT_LIBRARY,
    FEATURES.SITUATION_SIMULATOR,
    FEATURES.STRATEGY_JOURNAL,
    FEATURES.VOICE_TO_TEXT_JOURNAL,

    // Edge exclusives
    FEATURES.EDGE_BRIEFING,
    FEATURES.COACH_AI,
    FEATURES.ADVANCED_TEMPLATE_BANK,
    FEATURES.OFFICE_POLITICS_MAPPING,
    FEATURES.EXIT_AND_REPUTATION_PLAN,
  ]),
});

/* =========================
   Route Access Policy
   - Map routes (or route prefixes) to minimum tier
   - Keep these aligned with your /toolkit structure
========================= */
export const ROUTE_POLICY = Object.freeze([
  // Public pages
  { match: "/", minTier: null },
  { match: "/start-here", minTier: null },
  { match: "/pricing", minTier: null },
  { match: "/help-centre", minTier: null },
  { match: "/sign-in", minTier: null },
  { match: "/create-account", minTier: null },

  // Authenticated area (any logged-in plan)
  { match: "/dashboard", minTier: TIERS.FREE },
  { match: "/my-playbook", minTier: TIERS.CORE }, // saving is Core+

  // Tooling: examples (adjust to your real routes)
  { match: "/tools/checklist-", minTier: TIERS.FREE },
  { match: "/tools/framework-", minTier: TIERS.CORE },
  { match: "/tools/assessment-", minTier: TIERS.CORE },
  { match: "/tools/form-", minTier: TIERS.CORE },

  // Edge-only areas
  { match: "/edge", minTier: TIERS.EDGE },
  { match: "/coach", minTier: TIERS.EDGE },
]);

/* =========================
   Tier ranking (for comparisons)
========================= */
const TIER_RANK = Object.freeze({
  [TIERS.FREE]: 1,
  [TIERS.CORE]: 2,
  [TIERS.EDGE]: 3,
});

/* =========================
   Normalise user context
========================= */
/**
 * Expected user shape (flexible):
 * {
 *   id: "123",
 *   email: "x@x.com",
 *   planTier: "free" | "core" | "edge",
 *   entitlements?: string[]  // optional override list
 * }
 */
export function getUserTier(user) {
  const tier = user?.planTier || user?.tier || user?.plan || TIERS.FREE;
  if (tier === "strategic_edge" || tier === "strategic-edge") return TIERS.EDGE;
  if (!Object.values(TIERS).includes(tier)) return TIERS.FREE;
  return tier;
}

export function isLoggedIn(user) {
  return Boolean(user?.id || user?.userId || user?.email);
}

/* =========================
   Entitlements helpers
========================= */
export function getEntitlements(user) {
  const tier = getUserTier(user);

  // If user has explicit entitlements (e.g., from Stripe product metadata), use them.
  const explicit = user?.entitlements;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return new Set(explicit);
  }

  // Otherwise fall back to defaults for their tier.
  return new Set(DEFAULT_ENTITLEMENTS[tier] || []);
}

export function hasFeature(user, featureKey) {
  if (!featureKey) return false;
  const ent = getEntitlements(user);
  return ent.has(featureKey);
}

/* =========================
   Tier gating helpers
========================= */
export function meetsTier(user, minTier) {
  if (!minTier) return true; // public
  if (!isLoggedIn(user)) return false;

  const userTier = getUserTier(user);
  return (TIER_RANK[userTier] || 0) >= (TIER_RANK[minTier] || 0);
}

export function getRoutePolicy(pathname) {
  if (!pathname) return null;

  // Find the most specific match (longest match string)
  const matches = ROUTE_POLICY
    .filter((p) => pathname === p.match || pathname.startsWith(p.match))
    .sort((a, b) => (b.match?.length || 0) - (a.match?.length || 0));

  return matches[0] || null;
}

export function canAccessRoute(user, pathname) {
  const policy = getRoutePolicy(pathname);
  if (!policy) return true; // default allow if not specified
  return meetsTier(user, policy.minTier);
}

/* =========================
   UX helpers (for locked overlays / badges)
========================= */
export function getLockStateForFeature(user, featureKey, minTier = null) {
  // minTier allows you to gate by tier even if entitlement set changes later.
  const loggedIn = isLoggedIn(user);

  if (!loggedIn) {
    return {
      locked: true,
      reason: "sign_in_required",
      cta: { label: "Sign in to continue", href: "/sign-in" },
    };
  }

  if (minTier && !meetsTier(user, minTier)) {
    return {
      locked: true,
      reason: "upgrade_required",
      cta: { label: "Upgrade to unlock", href: "/pricing" },
      requiredTier: minTier,
      currentTier: getUserTier(user),
    };
  }

  if (featureKey && !hasFeature(user, featureKey)) {
    // User is logged in, but not entitled (e.g., Free user trying an Edge exclusive)
    return {
      locked: true,
      reason: "not_entitled",
      cta: { label: "Upgrade to unlock", href: "/pricing" },
      requiredTier: guessRequiredTier(featureKey),
      currentTier: getUserTier(user),
    };
  }

  return { locked: false };
}

function guessRequiredTier(featureKey) {
  // Light heuristic for UI messaging only (safe defaults)
  const edgeKeys = new Set([
    FEATURES.EDGE_BRIEFING,
    FEATURES.COACH_AI,
    FEATURES.ADVANCED_TEMPLATE_BANK,
    FEATURES.OFFICE_POLITICS_MAPPING,
    FEATURES.EXIT_AND_REPUTATION_PLAN,
    FEATURES.VOICE_TO_TEXT_JOURNAL,
    FEATURES.SITUATION_SIMULATOR,
  ]);
  if (edgeKeys.has(featureKey)) return TIERS.EDGE;

  const coreKeys = new Set([
    FEATURES.SAVE_TO_MY_PLAYBOOK,
    FEATURES.TEMPLATE_BANK,
    FEATURES.SCRIPT_LIBRARY,
    FEATURES.STRATEGY_JOURNAL,
  ]);
  if (coreKeys.has(featureKey)) return TIERS.CORE;

  return TIERS.FREE;
}

/* =========================
   Server middleware examples (optional)
   - Use these in Express or Next.js middleware
========================= */

/**
 * Express middleware:
 * app.use("/edge", requireTier(TIERS.EDGE))
 */
export function requireTier(minTier) {
  return function tierMiddleware(req, res, next) {
    const user = req.user || req.session?.user; // adapt to your auth
    if (meetsTier(user, minTier)) return next();

    const loggedIn = isLoggedIn(user);
    const redirectTo = loggedIn ? "/pricing" : "/sign-in";
    return res.redirect(302, redirectTo);
  };
}

/**
 * Next.js middleware helper:
 * - call inside middleware.ts
 * - return { allowed, redirectTo }
 */
export function checkAccessForPath({ user, pathname }) {
  const allowed = canAccessRoute(user, pathname);
  if (allowed) return { allowed: true, redirectTo: null };

  const loggedIn = isLoggedIn(user);
  return {
    allowed: false,
    redirectTo: loggedIn ? "/pricing" : "/sign-in",
    requiredTier: getRoutePolicy(pathname)?.minTier || null,
    currentTier: getUserTier(user),
  };
}

/* =========================
   Debug / telemetry helpers
========================= */
export function describeUserAccess(user) {
  const tier = getUserTier(user);
  const ent = Array.from(getEntitlements(user));
  return {
    loggedIn: isLoggedIn(user),
    tier,
    tierLabel: TIER_LABELS[tier],
    entitlements: ent.sort(),
  };
}


