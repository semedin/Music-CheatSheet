# Repository security

GitHub already prevents people without write access from pushing to the repository. Public visibility lets people read and fork it; it does not grant them permission to change this repository. This change does not alter visibility or revoke existing collaborators.

## Protections included in the repository

- CODEOWNERS routes every pull request to `@semedin`, including edits to workflows and ownership rules.
- Repository checks validates committed Orbit/Pocket builds and all ten documented engine/link suites.
- The workflow grants only `contents: read`, does not retain checkout credentials, and runs no privileged `pull_request_target` jobs. No secrets are passed to pull-request code.
- Third-party actions are pinned to full commit SHAs verified against their official release tags. Update pins only after reviewing the upstream change.

CODEOWNERS and passing tests alone do not prevent merges. The following GitHub server-side policy must also be enabled.

## Activate main branch protection

From a trusted local clone, authenticate the GitHub CLI with repository-admin access. After **Repository checks** has passed on the current `main` commit, review and apply:

```sh
node .github/scripts/protect-main.mjs
node .github/scripts/protect-main.mjs --apply
```

The first command is a dry run. The second applies and re-reads GitHub's settings to verify:

- Read-only default workflow tokens, no GitHub Actions PR creation/approval, and workflow approval required for all outside contributors.
- One approving review, required code-owner review, stale approvals dismissed, and approval of the latest push.
- Successful **Repository checks** from the actual GitHub Actions app, with the branch up to date before merging. Existing required checks and higher approval counts are preserved.
- Resolved review conversations.
- Protection applies to administrators too; force pushes and deleting `main` are forbidden.
- Only `@semedin` bypasses the PR-review requirement, so a sole maintainer can merge their own work. That exception does not bypass the required checks or other protections. Existing non-owner PR bypass allowances are removed.

The script preserves existing push/dismissal restrictions and additional branch protection flags. It does not remove collaborators, change visibility, grant permissions or remove rulesets. Existing rulesets can add further restrictions.

Review Settings → Collaborators periodically; give write/admin access only to trusted accounts. Protect the owner account with two-factor authentication or passkeys. These account/access settings are not configured by repository files.

## Report a vulnerability

Do not publish credentials or exploit instructions in public issues. Use GitHub's private vulnerability reporting feature when available, or contact the repository owner privately. Enable private vulnerability reporting under Settings → Security if it is not already enabled.
