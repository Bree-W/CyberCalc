# Third-party notices

CyberCalc does not vendor these trees. Checkouts are pinned and gitignored under `Combined_Repos/`.

## CyberChef

- Name: CyberChef
- License: Apache-2.0, Crown Copyright
- Version: 11.5.0 (`package.json`), tag describe `v11.5.0-27-g11b86fec`
- Git: `11b86fecdb5d8f6244cf931e1f87cec887ec1f1f`
- Source: https://github.com/gchq/CyberChef
- Use: sandboxed iframe on `127.0.0.1:8081`. Recipe and input use the hash format documented in the CyberChef README.

## Aperi'Solve

- Name: Aperi'Solve
- License: MIT, Copyright (c) 2026 Zeecka
- Version: **3.7.12** from `pyproject.toml`, tag describe `3.7.12-14-g9084bad`
- Git: `9084bad5f73eecef6b8f7f1aacdfe7fab0935331`
- Source: https://github.com/Zeecka/AperiSolve
- Note: `.env.example` sets `PROJECT_VERSION=3.1.3`. That value is stale and is not the version. The version is pyproject.toml 3.7.12 plus the git SHA above.
- Use: local Compose stack, reached only through the Next.js proxy. The upstream Compose file is not modified.

Aperi'Solve runs binwalk, exiftool, foremost, steghide, zsteg, and the other analyzers named in its README. Those programs stay inside the Aperi'Solve image. This notice does not assign them separate versions or licenses.

## dCode

- Name: dCode
- License: unverified
- Version: unpinned
- Source: https://www.dcode.fr/
- Use: link-out with attribution. CyberCalc does not copy dCode code and does not scrape the site.
