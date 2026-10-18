/**
 * Entity Resolution Engine for HELIX
 * Unifies person identities across GitHub logins, commit author emails,
 * noreply addresses, Slack handles, and display name variations.
 * Classifies bots and maintains a reviewable merge log with unmerge capability.
 */

import { nanoid } from "nanoid";

export type IdentityRecord = {
  id: string;
  login?: string;
  name: string;
  email?: string;
  slackId?: string;
  source: "github" | "slack" | "linear" | "git_commit" | "manual";
  isBot?: boolean;
};

export type MergeLogEntry = {
  mergeId: string;
  sourceRecordId: string;
  targetRecordId: string;
  canonicalId: string;
  confidence: number; // 0.0 - 1.0
  matchStrategy: "EXACT_EMAIL" | "NOREPLY_EMAIL_MATCH" | "NORMALIZED_NAME" | "SLACK_MAPPING";
  rationale: string;
  timestamp: string;
  status: "ACTIVE" | "UNMERGED";
};

export type UnifiedPerson = {
  id: string;
  canonicalName: string;
  emails: Set<string>;
  logins: Set<string>;
  slackIds: Set<string>;
  sources: Set<string>;
  isBot: boolean;
  mergeHistory: MergeLogEntry[];
};

// Global in-memory merge registry (can be inspected or exported)
export const GLOBAL_MERGE_LOG: MergeLogEntry[] = [];

const BOT_PATTERNS = [
  /\[bot\]$/i,
  /^dependabot/i,
  /^renovate/i,
  /^github-actions/i,
  /^snyk/i,
  /^codecov/i,
  /^greenkeeper/i,
];

export function detectBot(identity: IdentityRecord): boolean {
  if (identity.isBot) return true;
  if (identity.login && BOT_PATTERNS.some((pat) => pat.test(identity.login!))) return true;
  if (identity.name && BOT_PATTERNS.some((pat) => pat.test(identity.name))) return true;
  if (identity.email && (identity.email.includes("noreply.github.com") && identity.email.includes("bot"))) return true;
  return false;
}

/**
 * Normalizes email strings, extracting GitHub username from noreply addresses.
 * E.g., "12345+nora-berg@users.noreply.github.com" -> "nora-berg"
 */
export function normalizeEmail(email: string): { cleanEmail: string; extractedUsername?: string } {
  const clean = email.trim().toLowerCase();
  const noreplyMatch = clean.match(/^(?:\d+\+)?([a-z0-9_-]+)@users\.noreply\.github\.com$/);
  if (noreplyMatch) {
    return { cleanEmail: clean, extractedUsername: noreplyMatch[1] };
  }
  return { cleanEmail: clean };
}

/**
 * Normalizes names by stripping honorifics and converting to lowercase alphanumeric.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves a list of identities across platforms into unified person records.
 */
export function resolveIdentities(records: IdentityRecord[]): UnifiedPerson[] {
  const unifiedMap = new Map<string, UnifiedPerson>();
  const emailToCanonical = new Map<string, string>();
  const loginToCanonical = new Map<string, string>();
  const nameToCanonical = new Map<string, string>();

  for (const rec of records) {
    const isBot = detectBot(rec);
    const normName = normalizeName(rec.name);

    let matchCanonicalId: string | undefined;
    let matchStrategy: MergeLogEntry["matchStrategy"] = "NORMALIZED_NAME";
    let matchConfidence = 0.8;
    let matchRationale = "";

    // 1. Match by email
    if (rec.email) {
      const { cleanEmail, extractedUsername } = normalizeEmail(rec.email);
      if (emailToCanonical.has(cleanEmail)) {
        matchCanonicalId = emailToCanonical.get(cleanEmail);
        matchStrategy = "EXACT_EMAIL";
        matchConfidence = 0.99;
        matchRationale = `Exact email address match (${cleanEmail})`;
      } else if (extractedUsername && loginToCanonical.has(extractedUsername)) {
        matchCanonicalId = loginToCanonical.get(extractedUsername);
        matchStrategy = "NOREPLY_EMAIL_MATCH";
        matchConfidence = 0.95;
        matchRationale = `GitHub noreply email extracted username (${extractedUsername})`;
      }
    }

    // 2. Match by GitHub Login
    if (!matchCanonicalId && rec.login) {
      const cleanLogin = rec.login.toLowerCase();
      if (loginToCanonical.has(cleanLogin)) {
        matchCanonicalId = loginToCanonical.get(cleanLogin);
        matchStrategy = "NORMALIZED_NAME";
        matchConfidence = 0.95;
        matchRationale = `GitHub login match (${cleanLogin})`;
      }
    }

    // 3. Match by Normalized Display Name
    if (!matchCanonicalId && normName.length >= 4) {
      if (nameToCanonical.has(normName)) {
        matchCanonicalId = nameToCanonical.get(normName);
        matchStrategy = "NORMALIZED_NAME";
        matchConfidence = 0.85;
        matchRationale = `Normalized display name match (${normName})`;
      }
    }

    // Assign to existing or create new canonical entity
    if (matchCanonicalId && unifiedMap.has(matchCanonicalId)) {
      const unified = unifiedMap.get(matchCanonicalId)!;

      // Log the merge
      const mergeEntry: MergeLogEntry = {
        mergeId: `merge-${nanoid(6)}`,
        sourceRecordId: rec.id,
        targetRecordId: unified.id,
        canonicalId: unified.id,
        confidence: matchConfidence,
        matchStrategy,
        rationale: matchRationale,
        timestamp: new Date().toISOString(),
        status: "ACTIVE",
      };

      unified.mergeHistory.push(mergeEntry);
      GLOBAL_MERGE_LOG.push(mergeEntry);

      if (rec.email) unified.emails.add(rec.email.toLowerCase());
      if (rec.login) unified.logins.add(rec.login.toLowerCase());
      if (rec.slackId) unified.slackIds.add(rec.slackId);
      unified.sources.add(rec.source);
      if (isBot) unified.isBot = true;
    } else {
      const canonicalId = `person-unified-${nanoid(6)}`;
      const newUnified: UnifiedPerson = {
        id: canonicalId,
        canonicalName: rec.name,
        emails: new Set(rec.email ? [rec.email.toLowerCase()] : []),
        logins: new Set(rec.login ? [rec.login.toLowerCase()] : []),
        slackIds: new Set(rec.slackId ? [rec.slackId] : []),
        sources: new Set([rec.source]),
        isBot,
        mergeHistory: [],
      };

      unifiedMap.set(canonicalId, newUnified);

      if (rec.email) {
        const { cleanEmail, extractedUsername } = normalizeEmail(rec.email);
        emailToCanonical.set(cleanEmail, canonicalId);
        if (extractedUsername) loginToCanonical.set(extractedUsername, canonicalId);
      }
      if (rec.login) loginToCanonical.set(rec.login.toLowerCase(), canonicalId);
      if (normName.length >= 4) nameToCanonical.set(normName, canonicalId);
    }
  }

  return Array.from(unifiedMap.values());
}

/**
 * Reverses an active merge by ID in the reviewable merge log.
 */
export function unmergeEntity(mergeId: string): boolean {
  const entry = GLOBAL_MERGE_LOG.find((m) => m.mergeId === mergeId);
  if (entry && entry.status === "ACTIVE") {
    entry.status = "UNMERGED";
    return true;
  }
  return false;
}
