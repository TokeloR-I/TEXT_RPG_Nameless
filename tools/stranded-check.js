/* Finds merged pull requests whose work never reached main (for example a stacked PR that was merged
 * into its parent branch after the parent had already landed). Needs the GitHub CLI (`gh`), logged in.
 *   node tools/stranded-check.js            all merged PRs
 *   node tools/stranded-check.js --limit 50
 * A PR counts as landed when its head commit is an ancestor of origin/main. If it isn't, the files it
 * changed are compared with main, so work that arrived another way (cherry-picked, re-merged) isn't flagged. */
const { execFileSync } = require('child_process');
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const limit = Number((process.argv.find((a, i) => process.argv[i - 1] === '--limit')) || 100);
// owner/repo from the origin URL (https://github.com/o/r(.git) or git@github.com:o/r(.git), also proxied URLs)
const repo = (/github\.com[/:]([^/]+\/[^/.]+)|\/git\/([^/]+\/[^/.]+)/.exec(run('git', ['remote', 'get-url', 'origin'])) || []).slice(1).find(Boolean);
if (!repo) { console.error("Couldn't tell the GitHub repo from the origin remote."); process.exit(2); }
run('git', ['fetch', '-q', 'origin', 'main']);
const prs = JSON.parse(run('gh', ['api', `repos/${repo}/pulls?state=closed&per_page=${Math.min(limit, 100)}`,
    '--jq', '[.[] | select(.merged_at != null) | { number, title, base: { ref: .base.ref }, head: { sha: .head.sha } }]']));
const stranded = [];
for (const p of prs) {
    try { run('git', ['fetch', '-q', 'origin', p.head.sha]); } catch (e) { /* branch deleted: GitHub keeps the commit */ }
    let landed = false;
    try { run('git', ['merge-base', '--is-ancestor', p.head.sha, 'origin/main']); landed = true; } catch (e) { /* not an ancestor */ }
    if (landed) continue;
    const files = JSON.parse(run('gh', ['api', `repos/${repo}/pulls/${p.number}/files?per_page=100`, '--jq', '[.[] | select(.status != "removed") | .filename]']));
    const differ = files.filter((f) => { try { run('git', ['diff', '--quiet', p.head.sha, 'origin/main', '--', f]); return false; } catch (e) { return true; } });
    if (differ.length) stranded.push({ number: p.number, base: p.base.ref, title: p.title, files: differ });
}
if (!stranded.length) { console.log(`All ${prs.length} merged PRs checked: everything reached main.`); process.exit(0); }
console.log('Merged PRs whose work is NOT on main (some files may also have changed since on main; check each):');
for (const s of stranded) console.log(`  #${s.number} (merged into ${s.base}) ${s.title}\n      ${s.files.join(', ')}`);
process.exit(1);
