# Preview run doc

Thread workspace: `C:\Users\iuser\Desktop\aws-anomally-detection`
App directory: `frontend/` (Next.js 15 App Router)
Preview URL: http://localhost:4028

## 1. Reproduce the uncommitted artifacts

A fresh checkout needs two things before the dev server will boot.

**Environment file.** The app reads `frontend/.env` (and `.env.example` documents
the minimal shape: `NEXT_PUBLIC_API_BASE_URL`). Copy it from the main checkout —
it is git-ignored and will not be present in a clean clone:

```bash
cp "<main-checkout>/frontend/.env" frontend/.env
```

Never paste the file's contents into this doc; only the procedure. This thread's
workspace *is* the main checkout, so in this case the file was already in place
and no copy was needed.

**Dependencies.** `frontend/` has no lockfile of its own (no `bun.lock`,
`yarn.lock` or `pnpm-lock.yaml`, and the root-level `package-lock.json` does not
cover it), so the install is resolved fresh each time. `npm`/`node` are **not** on
`PATH` on this machine. The Freebuff desktop app ships its own Bun and a `node`
shim, which works:

```bash
BUN="C:/Users/iuser/AppData/Local/Programs/@codebufffreebuff-desktop/resources/bun/bun.exe"
cd frontend && "$BUN" install
```

Known snag: Bun 1.4.2's package-cache rename is intermittently blocked on this
machine (antivirus), so an install can report extraction failures for a random
subset of packages. It is not fatal — re-run the same command until it converges.
The transitive `vite` package is not needed by the dev server and may be left
un-extracted.

## 2. Run the server

The port is **not** Next.js's usual 3000 — `package.json` pins it: `"dev": "next dev -p 4028"`
(and `"start": "next start -p 4028"`). So plain `npm run dev` already binds
**4028**, and no `-p` flag is needed. Start it detached so it outlives the
conversation:

```bash
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput 'C:/Users/iuser/Desktop/aws-anomally-detection/.freebuff/preview-<thread-id>.log' -RedirectStandardError 'C:/Users/iuser/Desktop/aws-anomally-detection/.freebuff/preview-<thread-id>.log.err' -WindowStyle Hidden -PassThru).Id"
```

If 4028 is already taken by another thread, add `'--','-p','<free-port>'` to the
argument list and adapt the URLs below.

`npm.cmd` must be named exactly with its extension: `Start-Process` does not
resolve shims, and `npm` alone fails. stdout and stderr must go to *different*
files or PowerShell errors out. npm resolves to the app's bundled Node shim, so
no system Node install is required.

Confirm the start:

```bash
powershell -NoProfile -Command "Get-Process -Id <pid>"
netstat -ano | grep ":4028"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4028/
```

(Substitute the port actually in use.)

Expect `HTTP 200`. Then warm every route once so the first compile cost is paid
before registering the preview (`/`, `/how-model-works`, `/root-cause`,
`/explanations`, `/history`).

## 3. The backend (needed for live data)

The frontend reads `NEXT_PUBLIC_API_BASE_URL` and falls back to
`http://localhost:8000`. **That variable is not set in `frontend/.env`** (which is
tracked), so the fallback is what is in use — it works locally, but a production
build must set it explicitly or it will also point at localhost.

This machine ships **no Python at all** — `python` resolves to the Microsoft
Store alias (a stub), and there is no `uv`, `conda`, `docker` or WSL. The
backend is therefore run from a **project-local Python** in `.runtime/`
(git-ignored), installed once:

```bash
# 1. Standalone CPython 3.11 (matches render.yaml's PYTHON_VERSION), no admin:
#    https://github.com/astral-sh/python-build-standalone/releases
#    asset: cpython-3.11.16+<tag>-x86_64-pc-windows-msvc-install_only.tar.gz
mkdir -p .runtime && curl -L -o .runtime/python.tar.gz "<asset-url>"
tar -xzf .runtime/python.tar.gz -C .runtime/          # -> .runtime/python/python.exe

# 2. Dependencies (the API's own list, with production's scikit-learn pin):
./.runtime/python/python.exe -m pip install -r api/requirements.txt "scikit-learn==1.7.2"
```

Run it detached, from `api/` — `main.py` resolves its data and model paths from
`__file__`, so the working directory does not matter, but `from detector import …`
and `from anomaly_classifier import …` do need `api/` importable:

```bash
powershell -NoProfile -Command "(Start-Process -FilePath '<abs>\.runtime\python\python.exe' -ArgumentList '-m','uvicorn','main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory '<abs>\api' -RedirectStandardOutput '<abs>\.freebuff\api.log' -RedirectStandardError '<abs>\.freebuff\api.log.err' -WindowStyle Hidden -PassThru).Id"
```

`Start-Process` makes the calling terminal wait because the child inherits its
handles, so expect this tool call to time out — that is normal. Confirm with
`netstat -ano | grep :8000` and `curl http://127.0.0.1:8000/api/live`.

Checks that matter: `Application startup complete` in `api.log.err` (a
`joblib.load` failure or a bad `detector` import shows up there instead), and
`GEMINI_API_KEY not set — Gemini classifier disabled` is expected and harmless —
the deep classifier is optional and the API degrades to the heuristic one.
CORS needs no configuration: `main.py` defaults to
`http://localhost:4028,http://127.0.0.1:4028,http://localhost:3000` and appends
`*` whenever `ENVIRONMENT != production`.

The lifespan pre-seeds the 24-reading buffer from `data/demo_data.csv`, so the
app starts **fully warmed up** and the dashboard's warm-up banner never appears
against a real backend.

### Caveats

- `html` sets `scroll-behavior: smooth` (`styles/tailwind.css`). A probe that
  scrolls and reads the position in the same tick measures a **mid-animation**
  value, which makes scroll-driven UI look broken when it is not. Use
  `window.scrollTo({ top, behavior: 'instant' })` and wait a tick.
- `next.config.mjs` sets `typescript.ignoreBuildErrors` and
  `eslint.ignoreDuringBuilds`, so a running server proves nothing about types or
  lint. Run `npm run type-check` and `npm run lint` separately.
- The desktop preview webview never receives OS focus and is not composited, so
  `focus`/`blur`-driven UI must be driven with a real click, and anything that
  depends on `requestAnimationFrame` may never fire.
