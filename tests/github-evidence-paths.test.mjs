// tests/github-evidence-paths.test.mjs — the shared location of a
// github-evidence run (#7006). New runs go under output/diagnostics/.
// Readers still see a run left in output/.
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pass, fail, rmSync } from './helpers.mjs';
import { GITHUB_EVIDENCE_PATHS, githubEvidenceFileName, listGithubEvidenceScans } from '../lib/github-evidence-paths.mjs';

console.log('\ngithub-evidence paths — diagnostics first, output/ as fallback');

const check = (ok, msg) => (ok ? pass(msg) : fail(msg));

check(GITHUB_EVIDENCE_PATHS.dir === 'output/diagnostics' && GITHUB_EVIDENCE_PATHS.legacyDir === 'output',
  'the shared constant names diagnostics for new runs and output/ for old ones');
check(githubEvidenceFileName('2026-10-16', 'json') === 'github-evidence-2026-10-16.json'
  && githubEvidenceFileName('2026-10-16', 'md') === 'github-evidence-2026-10-16.md',
  'the filename is github-evidence-YYYY-MM-DD.{json,md}');

const root = mkdtempSync(join(tmpdir(), 'co-gh-paths-'));
try {
  check(listGithubEvidenceScans(root).length === 0, 'no output directory: no scans');
  const legacy = join(root, 'output');
  const diagnostics = join(legacy, 'diagnostics');
  mkdirSync(diagnostics, { recursive: true });
  writeFileSync(join(legacy, 'github-evidence-2026-10-19.json'), '{}\n');
  writeFileSync(join(legacy, 'github-evidence-2026-13-45.json'), '{}\n');
  writeFileSync(join(legacy, 'github-evidence-2026-10-18.md'), '# report\n');
  writeFileSync(join(diagnostics, 'github-evidence-2026-10-12.json'), '{}\n');
  writeFileSync(join(diagnostics, 'github-evidence-2026-10-19.json'), '{}\n');

  const listed = listGithubEvidenceScans(root);
  check(listed.map((s) => s.relPath).join(',') === [
    'output/diagnostics/github-evidence-2026-10-19.json',
    'output/github-evidence-2026-10-19.json',
    'output/diagnostics/github-evidence-2026-10-12.json',
  ].join(','),
    `newest date first, diagnostics before legacy on a tie, impossible dates and markdown ignored (got ${listed.map((s) => s.relPath)})`);
  check(listed[0].legacy === false && listed[1].legacy === true && listed[1].absPath === join(legacy, 'github-evidence-2026-10-19.json'),
    'each row says which directory it came from and where the file is');
} finally {
  rmSync(root, { recursive: true, force: true });
}
