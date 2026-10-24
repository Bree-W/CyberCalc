#!/usr/bin/env bash
# Run the pinned CyberChef checkout on port 8081.
# Adds the CyberCalc colour theme. Does not edit the Gruntfile or remove operations.
# Port 8080 is left alone because macOS tools and other local apps often use it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/Combined_Repos/CyberChef"

if [[ ! -f "$APP/package.json" ]]; then
  echo "CyberChef checkout is missing. Run scripts/bootstrap-tools.sh first." >&2
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$node_major" -lt 24 || "$node_major" -ge 27 ]]; then
  echo "CyberChef needs Node >=24 and <27. This shell has $(node -v)." >&2
  exit 1
fi

cd "$APP"
if [[ ! -d node_modules ]]; then
  npm install
fi

# Colour theme only. The checkout stays the full CyberChef app.
ln -sfn "$ROOT/deploy/cyberchef/cybercalc.css" "$APP/src/web/stylesheets/themes/_cybercalc.css"
python3 - "$APP" <<'PY'
import pathlib, sys
app = pathlib.Path(sys.argv[1])
css = app / "src/web/stylesheets/index.css"
text = css.read_text()
if "_cybercalc.css" not in text:
    needle = '@import "./themes/_dark.css";\n'
    if needle not in text:
        raise SystemExit("CyberChef dark theme import was not found")
    css.write_text(text.replace(needle, needle + '@import "./themes/_cybercalc.css";\n', 1))
html = app / "src/web/html/index.html"
page = html.read_text()
if 'value="cybercalc"' not in page:
    needle = '<option value="dark">Dark</option>\n'
    if needle not in page:
        raise SystemExit("CyberChef theme select was not found")
    option = needle + '                                <option value="cybercalc">CyberCalc</option>\n'
    html.write_text(page.replace(needle, option, 1))
PY

# This Node binds host "localhost" to ::1 only, and CyberChef sends
# Cross-Origin-Resource-Policy: same-origin. The iframe origin is
# 127.0.0.1:8081, so forward that port and allow the frame to load.
python3 -u "$ROOT/scripts/cyberchef-ipv4-proxy.py" &

exec npx grunt dev --port=8081
