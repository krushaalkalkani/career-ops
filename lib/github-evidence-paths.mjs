/**
 * lib/github-evidence-paths.mjs — where a github-evidence run is stored (#7006).
 *
 * #6667 keeps deliverables in `output/` and agent working files in
 * `output/diagnostics/`. A github-evidence run has no report number, so the
 * deliverable filename cannot name it, and it is a run log. New runs are
 * written under `dir`. Readers still open `legacyDir`: a scan written before
 * the move is the evidence behind cv.md, and deleting it would make that
 * evidence look missing.
 *
 * One constant, so the writer and the readers cannot drift. The filename is
 * `github-evidence-YYYY-MM-DD.json` (and `.md` beside it). A date that is not
 * a real calendar day is not a scan.
 */

import { readdirSync } from 'fs';
import { join } from 'path';

const SCAN_FILE = /^github-evidence-(\d{4})-(\d{2})-(\d{2})\.json$/;

/** Directory and filename of a github-evidence run, relative to the data root. */
export const GITHUB_EVIDENCE_PATHS = Object.freeze({
  /** New runs are written here. */
  dir: 'output/diagnostics',
  /** Reads fall back here. Runs from before #7006. */
  legacyDir: 'output',
  scanFile: SCAN_FILE,
});

/**
 * `github-evidence-YYYY-MM-DD.{ext}` — the name both the writer and the
 * readers agree on. `ext` is `json` or `md`.
 *
 * @param {string} date - YYYY-MM-DD.
 * @param {string} ext
 * @returns {string}
 */
export function githubEvidenceFileName(date, ext) {
  return `github-evidence-${date}.${ext}`;
}

function isCalendarDate(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * JSON scans in both directories, newest date first. The same date in both
 * places lists the file under `dir` before the one under `legacyDir`, so a
 * tie keeps the copy this version writes.
 *
 * A missing directory is an empty result for that place, not an error.
 *
 * @param {string} dataRoot
 * @returns {{date: string, name: string, absPath: string, relPath: string, legacy: boolean}[]}
 */
export function listGithubEvidenceScans(dataRoot) {
  const places = [
    { relDir: GITHUB_EVIDENCE_PATHS.dir, legacy: false },
    { relDir: GITHUB_EVIDENCE_PATHS.legacyDir, legacy: true },
  ];
  const found = [];
  for (const place of places) {
    let names;
    try {
      names = readdirSync(join(dataRoot, place.relDir));
    } catch {
      continue;
    }
    for (const name of names) {
      const m = GITHUB_EVIDENCE_PATHS.scanFile.exec(name);
      if (!m || !isCalendarDate(+m[1], +m[2], +m[3])) continue;
      found.push({
        date: `${m[1]}-${m[2]}-${m[3]}`,
        name,
        absPath: join(dataRoot, place.relDir, name),
        relPath: `${place.relDir}/${name}`,
        legacy: place.legacy,
      });
    }
  }
  found.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return Number(a.legacy) - Number(b.legacy);
  });
  return found;
}
