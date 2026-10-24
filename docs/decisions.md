# Decisions

## Wrap the tools, do not merge them

CyberCalc stays a Next.js app. CyberChef (Apache-2.0, 11.5.0, `11b86fecdb5d8f6244cf931e1f87cec887ec1f1f`) is iframed from port 8081. Port 8080 is not used, because other local apps already bind it. Aperi'Solve (MIT, pyproject.toml 3.7.12, `9084bad5f73eecef6b8f7f1aacdfe7fab0935331`) runs in its own Compose stack. `Combined_Repos/` stays gitignored. Pins live in `THIRD_PARTY_NOTICES.md` and `scripts/bootstrap-tools.sh`.

Aperi'Solve's Compose file is not edited. `deploy/aperisolve.override.yml` publishes `127.0.0.1:5050` so macOS AirPlay can keep port 5000, and it sets `MAX_CONTENT_LENGTH=3145728`. Flask treats an empty value as 1048576, so the override must set that number. The Next route uses the same constant.

The iframe sandbox is `allow-scripts allow-same-origin allow-forms`. Port 8081 is a different origin from port 3000. `allow-same-origin` lets CyberChef keep its own origin so the app can run.

## Proxy

The browser talks only to `/api/aperisolve`. The route allows 10 uploads per minute per client key, rejects bodies over 3145728 bytes, accepts only PNG, JPEG, GIF, WEBP, BMP, and TIFF magic bytes, and stops polling a hash 120 seconds after submit. Each upstream call aborts after 5 seconds. Passwords are not logged or returned. If Compose is down, the route returns a stub error and does not run analyzers on the host.

## Git

Remote: `https://github.com/Bree-W/CyberCalc.git`. Local `jack` and `main` are at `e2bb061`. Do not rewrite that history.

Cut feature branches from current HEAD: `feat/core-converters`, `feat/cyberchef-embed`, `feat/aperisolve-proxy`. One PR per slice. Commit only when asked.

Never commit `Combined_Repos/`, `.env`, the Postgres password, Sentry DSNs, or malware samples.
