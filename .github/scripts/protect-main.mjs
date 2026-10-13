// Run without arguments to review the proposed policy. --apply requires repo-admin
// GitHub CLI authentication and a successful Repository checks run on main.
import {execFileSync} from 'node:child_process';

const repo = 'semedin/Music-CheatSheet';
const endpoint = `repos/${repo}/branches/main/protection`;
const owner = 'semedin';
const policy = {
  required_status_checks: {strict: true, contexts: ['Repository checks']},
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    required_approving_review_count: 1,
    require_last_push_approval: true,
    // The sole owner can maintain the repo without trying to approve their own PR.
    // This exception does not bypass the required status check or force-push ban.
    bypass_pull_request_allowances: {users: [owner], teams: [], apps: []},
  },
  restrictions: null,
  required_conversation_resolution: true,
  allow_force_pushes: false,
  allow_deletions: false,
};
const args = process.argv.slice(2);
if (!args.length) {
  console.log(JSON.stringify({repository: repo, branch: 'main', branch_protection: policy, actions: {default_workflow_permissions: 'read', can_approve_pull_request_reviews: false, approval_policy: 'all_external_contributors'}}, null, 2));
  console.log('Review only. Run with --apply after Repository checks passes on main.');
} else if (args.length !== 1 || args[0] !== '--apply') {
  throw Error('Usage: node .github/scripts/protect-main.mjs [--apply]');
} else {
  const api = (route, extra = [], data) => {
    const output = execFileSync('gh', ['api', route, ...extra], {input: data === undefined ? undefined : JSON.stringify(data), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']});
    return output.trim() ? JSON.parse(output) : null;
  };
  const logins = entries => (entries || []).map(e => e.login);
  const slugs = entries => (entries || []).map(e => e.slug);
  try {
    const metadata = api(`repos/${repo}`);
    if (!metadata.permissions?.admin) throw Error('GitHub repo-admin permission is required.');
    if (metadata.default_branch !== 'main') throw Error('The default branch is no longer main; review this policy before applying.');
    let current = {};
    try { current = api(endpoint); } catch (e) {
      if (!String(e.stderr || '').includes('HTTP 404')) throw e;
    }
    const head = api(`repos/${repo}/commits/main`).sha;
    const checks = api(`repos/${repo}/commits/${head}/check-runs?per_page=100`).check_runs;
    const check = checks.filter(c => c.name === 'Repository checks' && c.app?.slug === 'github-actions').sort((a,b) => b.id - a.id)[0];
    if (!check || check.conclusion !== 'success') throw Error('Wait for Repository checks to pass on the current main commit before applying.');
    const existing = current.required_status_checks?.checks || (current.required_status_checks?.contexts || []).map(context => ({context, app_id: -1}));
    policy.required_status_checks = {
      strict: true,
      checks: [...existing.filter(c => c.context !== 'Repository checks').map(c => ({context: c.context, app_id: c.app_id ?? -1})), {context: 'Repository checks', app_id: check.app.id}],
    };
    policy.required_pull_request_reviews.required_approving_review_count = Math.max(1, current.required_pull_request_reviews?.required_approving_review_count || 0);
    const dismissals = current.required_pull_request_reviews?.dismissal_restrictions;
    if (dismissals) policy.required_pull_request_reviews.dismissal_restrictions = {users: logins(dismissals.users), teams: slugs(dismissals.teams), apps: slugs(dismissals.apps)};
    if (current.restrictions) policy.restrictions = {users: logins(current.restrictions.users), teams: slugs(current.restrictions.teams), apps: slugs(current.restrictions.apps)};
    // Retain additional protection options instead of replacing them with defaults.
    for (const key of ['required_linear_history', 'block_creations', 'lock_branch', 'allow_fork_syncing']) {
      if (current[key]?.enabled !== undefined) policy[key] = current[key].enabled;
    }
    const workflowRoute = `repos/${repo}/actions/permissions/workflow`;
    const approvalRoute = `repos/${repo}/actions/permissions/fork-pr-contributor-approval`;
    api(workflowRoute, ['--method', 'PUT', '--input', '-'], {default_workflow_permissions: 'read', can_approve_pull_request_reviews: false});
    api(approvalRoute, ['--method', 'PUT', '--input', '-'], {approval_policy: 'all_external_contributors'});
    const workflowSettings = api(workflowRoute), approvalSettings = api(approvalRoute);
    if (workflowSettings.default_workflow_permissions !== 'read' || workflowSettings.can_approve_pull_request_reviews !== false || approvalSettings.approval_policy !== 'all_external_contributors') {
      throw Error('Workflow permissions/approval settings could not be verified. Inspect Settings → Actions.');
    }
    const result = api(endpoint, ['--method', 'PUT', '--input', '-'], policy);
    const saved = api(endpoint);
    const reviews = saved.required_pull_request_reviews;
    if (!result.url || !saved.enforce_admins?.enabled || !saved.required_status_checks?.strict || !saved.required_status_checks?.checks?.some(c => c.context === 'Repository checks' && c.app_id === check.app.id) || !reviews?.require_code_owner_reviews || !reviews?.dismiss_stale_reviews || !reviews?.require_last_push_approval || reviews.required_approving_review_count < 1 || saved.allow_force_pushes?.enabled || saved.allow_deletions?.enabled || !saved.required_conversation_resolution?.enabled || logins(reviews.bypass_pull_request_allowances?.users).join(',') !== owner || reviews.bypass_pull_request_allowances?.teams?.length || reviews.bypass_pull_request_allowances?.apps?.length) {
      throw Error('GitHub returned unexpected protection settings. Inspect Settings → Branches before treating protection as active.');
    }
    console.log('Verified read-only workflow defaults, no bot PR approvals, approval required for all outside contributors.');
    console.log('Verified main protection: owner review, successful GitHub Actions checks, current branch, resolved conversations, no force pushes or deletion.');
  } catch (e) {
    console.error(String(e.stderr || e.message).trim());
    process.exitCode = 1;
  }
}
