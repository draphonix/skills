---
name: tldraw-api
description: Create, inspect, edit, persist, and verify tldraw canvases through the tldraw Desktop local Canvas API without mouse-driven Computer Use. Use for scripted `.tldraw` diagrams, architecture drawings, flowcharts, canvas cleanup, bound connectors, screenshots, document scripts, or requests to automate an installed tldraw app through HTTP APIs.
---

# tldraw API

Operate the installed tldraw Desktop app through its authenticated localhost API. Prefer this skill over UI automation when the app is running and the task can be expressed as editor records or document scripts.

## Start safely

1. Require tldraw Desktop to be running with at least one document open.
2. Run `scripts/tldraw_api.sh docs` to discover document IDs and file paths.
3. Read the target with `shapes` before mutating it. Preserve shapes unrelated to the request.
4. Use stable semantic IDs such as `shape:payments-api`, not random IDs, when reruns may occur.
5. Never print or persist the bearer token. The wrapper reads it dynamically from tldraw's `server.json`.
6. Never edit an open `.tldraw` archive directly. Mutate it through `/exec` or its script workspace, then save through tldraw.

The wrapper requires `curl` and `jq`. Set `TLDRAW_STATE_FILE` only when tldraw stores `server.json` outside its normal platform location.

## Choose the operation

- Inspect or make a static diagram change: use `/api/search` and per-document `/exec` through the wrapper.
- Add behavior that must survive reopening: use `/script-workspace`; read the existing script before editing it.
- Create a named file: create an untitled document, draw into it, serialize it, create the path safely, reopen it, and save it through tldraw.
- Need an unfamiliar editor method: query `api.members` through `/api/search` instead of guessing.

Read [references/api.md](references/api.md) when raw request syntax, shape examples, durable scripts, or the new-file bridge is needed.

## Edit an existing canvas

1. Identify the document:

   ```bash
   scripts/tldraw_api.sh docs
   ```

2. Inspect shapes and, when connections matter, bindings:

   ```bash
   scripts/tldraw_api.sh shapes 'tldr:file:...'
   scripts/tldraw_api.sh bindings 'tldr:file:...'
   ```

3. Put the mutation in a temporary `.js` file and execute it:

   ```bash
   scripts/tldraw_api.sh exec 'tldr:file:...' /absolute/path/draw.js
   ```

4. Save the target document:

   ```bash
   scripts/tldraw_api.sh save 'tldr:file:...'
   ```

5. Verify once with `shapes`, `bindings`, `lint`, and—when layout is visual—`screenshot`.

Cause and effect: `/exec` changes the live editor store and marks a file-backed document dirty. `save` writes that store into the `.tldraw` archive. A clean linter and real binding records prove structural correctness; a screenshot proves placement and readability.

## Create a new named file

The public Canvas API operates on open documents but does not expose a documented create/save-as endpoint. Use the wrapper's capability-discovered desktop bridge; never hardcode a hashed renderer filename or export key.

1. Pick any open document ID as the bridge host, then create a blank untitled document:

   ```bash
   scripts/tldraw_api.sh new-file 'tldr:file:existing-doc-id'
   scripts/tldraw_api.sh docs
   ```

2. Identify the new untitled document by recency and confirm it has zero shapes.
3. Draw into that new document with `exec`.
4. Serialize it to a temporary path:

   ```bash
   scripts/tldraw_api.sh serialize 'tldr:untitled:...' > /absolute/temp/diagram.json
   ```

5. Validate that the serialization contains `tldrawFileFormatVersion`, `schema`, `records`, and one expected semantic shape ID.
6. Create the requested `.tldraw` path with the available safe file-editing tool. Do not use shell redirection to overwrite an existing user file.
7. Open the path through the bridge and find its new file-backed document ID:

   ```bash
   scripts/tldraw_api.sh open-file 'tldr:untitled:...' /absolute/path/diagram.tldraw
   scripts/tldraw_api.sh docs
   ```

8. Call `save` on the file-backed document. This lets tldraw normalize the legacy JSON into its current archive format.
9. Confirm `unsavedChanges` is false, the file exists, and the reopened document has the expected shapes.

Do not overwrite a requested path without explicit authorization. When the path already exists, edit the existing document or choose a new name.

## Draw structurally correct diagrams

- Import SDK helpers inside `/exec` with dynamic import: `await import('tldraw')`.
- Put user-visible text in `richText: toRichText('...')`.
- Use `helpers.createArrowBetweenShapes(sourceId, targetId, props)` for semantic connectors.
- Treat proximity as insufficient. An arrow without start and end bindings will not follow moved nodes.
- Use separate text shapes for edge labels when arrow labels collide with nodes or other connectors.
- Lay out the major path first, then supporting systems, then annotations and cost notes.
- Keep approximately 160–240 canvas units between major nodes unless the content demands more.
- Return small JSON results from `/exec`; verify complex records through `api.getShapes()`.

## Add durable behavior

Use `POST /api/doc/:id/script-workspace` when clicks, keyboard actions, timers, custom tools, or run-on-open behavior must persist. Read `mainJsPath` first. If `isDefaultScript` is false, extend rather than replace the user's script. Edit only paths reported as editable, then poll `/script-status` until `state` is `applied` or an error is reported.

Static `/exec` code is intentionally ephemeral. Shapes it creates persist after save, but listeners and runtime patches disappear when the document closes.

## Completion checks

Before reporting success:

1. Confirm the intended document path and `unsavedChanges: false`.
2. Count expected shape types.
3. Confirm two bindings per semantic arrow.
4. Run `scripts/tldraw_api.sh lint DOC_ID`; resolve all unexpected lints.
5. Capture a canvas screenshot and inspect it when visual arrangement matters.
6. Report the output path, shape/arrow counts, binding count, and lint result.
