#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: tldraw_api.sh COMMAND [ARGS]

Commands:
  docs                              List open documents
  focused                           Show the most recently focused document
  shapes DOC_ID                     Read current-page shapes
  bindings DOC_ID                   Read document bindings
  exec DOC_ID JS_FILE               Execute a JavaScript file against the editor
  lint DOC_ID                       Run the canvas linter
  screenshot DOC_ID [SIZE] [MODE]   Capture canvas/window; defaults large canvas
  serialize DOC_ID                  Print the current document as legacy JSON
  new-file HOST_DOC_ID              Create a blank untitled document
  open-file HOST_DOC_ID ABS_PATH    Open a .tldraw path in a new window
  save DOC_ID                       Save a file-backed document
  help                              Show this help
USAGE
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command curl
require_command jq
require_command python3

if [[ -n "${TLDRAW_STATE_FILE:-}" ]]; then
  tldraw_state_file="$TLDRAW_STATE_FILE"
else
  tldraw_user_root="$(python3 -c 'from pathlib import Path; print(Path.home())')"
  case "$(uname -s)" in
    Darwin) tldraw_state_file="$tldraw_user_root/Library/Application Support/tldraw/server.json" ;;
    Linux) tldraw_state_file="$tldraw_user_root/.config/tldraw/server.json" ;;
    *)
      echo "Unsupported platform. Set TLDRAW_STATE_FILE to server.json." >&2
      exit 1
      ;;
  esac
fi

if [[ ! -f "$tldraw_state_file" ]]; then
  echo "tldraw server state not found: $tldraw_state_file" >&2
  echo "Start tldraw Desktop and open a document." >&2
  exit 1
fi

tldraw_port="$(jq -er '.port' "$tldraw_state_file")"
tldraw_token="$(jq -er '.token' "$tldraw_state_file")"
tldraw_base_url="http://127.0.0.1:$tldraw_port"

post_search() {
  local code="$1"
  jq -n --arg code "$code" '{code:$code}' |
    curl -fsS -X POST "$tldraw_base_url/api/search" \
      -H "Authorization: Bearer $tldraw_token" \
      -H 'Content-Type: application/json' \
      --data-binary @-
}

post_exec_inline() {
  local doc_id="$1"
  local code="$2"
  jq -n --arg code "$code" '{code:$code}' |
    curl -fsS -X POST "$tldraw_base_url/api/doc/$doc_id/exec" \
      -H "Authorization: Bearer $tldraw_token" \
      -H 'Content-Type: application/json' \
      --data-binary @-
}

require_arg() {
  local value="${1:-}"
  local label="$2"
  if [[ -z "$value" ]]; then
    echo "Missing $label" >&2
    usage >&2
    exit 2
  fi
}

desktop_bridge_prefix='const src=Array.from(globalThis.document.scripts).map(s=>s.src).find(s=>/\/index-[^/]+\.js$/.test(s)); if(!src) throw new Error("renderer entry module not found"); const mod=await import(src); const desktop=Object.values(mod).find(v=>v?.files?.newFile&&v?.files?.openRecent&&v?.files?.save); if(!desktop) throw new Error("desktop file bridge not found");'

command_name="${1:-help}"
case "$command_name" in
  docs)
    post_search 'return await api.getDocs()'
    ;;
  focused)
    post_search 'return await api.getFocusedDoc()'
    ;;
  shapes)
    require_arg "${2:-}" DOC_ID
    quoted_doc="$(jq -Rn --arg value "$2" '$value')"
    post_search "return await api.getShapes($quoted_doc)"
    ;;
  bindings)
    require_arg "${2:-}" DOC_ID
    quoted_doc="$(jq -Rn --arg value "$2" '$value')"
    post_search "return await api.getBindings($quoted_doc)"
    ;;
  exec)
    require_arg "${2:-}" DOC_ID
    require_arg "${3:-}" JS_FILE
    [[ -f "$3" ]] || { echo "JavaScript file not found: $3" >&2; exit 1; }
    curl -fsS -X POST "$tldraw_base_url/api/doc/$2/exec" \
      -H "Authorization: Bearer $tldraw_token" \
      -H 'Content-Type: text/plain' \
      --data-binary "@$3"
    ;;
  lint)
    require_arg "${2:-}" DOC_ID
    post_exec_inline "$2" 'return helpers.getLints()'
    ;;
  screenshot)
    require_arg "${2:-}" DOC_ID
    screenshot_size="${3:-large}"
    screenshot_mode="${4:-canvas}"
    case "$screenshot_size" in small|medium|large|full) ;; *) echo "Invalid size: $screenshot_size" >&2; exit 2 ;; esac
    case "$screenshot_mode" in canvas|window) ;; *) echo "Invalid mode: $screenshot_mode" >&2; exit 2 ;; esac
    quoted_doc="$(jq -Rn --arg value "$2" '$value')"
    quoted_size="$(jq -Rn --arg value "$screenshot_size" '$value')"
    quoted_mode="$(jq -Rn --arg value "$screenshot_mode" '$value')"
    post_search "return await api.getScreenshot($quoted_doc,{size:$quoted_size,mode:$quoted_mode})"
    ;;
  serialize)
    require_arg "${2:-}" DOC_ID
    post_exec_inline "$2" 'const { serializeTldrawJson } = await import("tldraw"); return await serializeTldrawJson(editor)' | jq -er '.result'
    ;;
  new-file)
    require_arg "${2:-}" HOST_DOC_ID
    post_exec_inline "$2" "$desktop_bridge_prefix desktop.files.newFile(); return true"
    ;;
  open-file)
    require_arg "${2:-}" HOST_DOC_ID
    require_arg "${3:-}" ABS_PATH
    [[ "$3" = /* ]] || { echo "open-file requires an absolute path" >&2; exit 2; }
    quoted_path="$(jq -Rn --arg value "$3" '$value')"
    post_exec_inline "$2" "$desktop_bridge_prefix desktop.files.openRecent($quoted_path); return true"
    ;;
  save)
    require_arg "${2:-}" DOC_ID
    post_exec_inline "$2" "$desktop_bridge_prefix desktop.files.save(); return true"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $command_name" >&2
    usage >&2
    exit 2
    ;;
esac
