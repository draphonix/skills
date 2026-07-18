# tldraw Desktop Canvas API reference

Read this file when composing raw API calls, drawing shapes, creating named files, or adding persistent behavior.

## Endpoints

The local server publishes its own reference at `GET /`. Read the current port and bearer token from tldraw's `server.json`; never hardcode or print the token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Current API documentation |
| `POST` | `/api/search` | Inspect API metadata and open documents |
| `POST` | `/api/doc/:id/exec` | Run an async JavaScript body with `editor` and `helpers` |
| `POST` | `/api/doc/:id/script-workspace` | Expose durable document-script paths |
| `GET` | `/api/doc/:id/script-status` | Check script watcher state |

Search code runs against `api`. Exec code receives `editor`, `helpers`, `signal`, and `app`.

## Discover documents and methods

```js
return await api.getDocs()
```

```js
const doc = await api.getFocusedDoc()
return doc ? await api.getShapes(doc.id) : null
```

```js
return api.members.find(member => member.name === 'renamePage')
```

Useful search methods are `api.getDocs`, `api.getFocusedDoc`, `api.getShapes`, `api.getBindings`, `api.getScreenshot`, and `api.getScriptStatus`.

## Create shapes

Place code in a `.js` file and call the wrapper's `exec` command.

```js
const { createShapeId, toRichText } = await import('tldraw')

const client = createShapeId('checkout-client')
const api = createShapeId('orders-api')

editor.createShapes([
  {
    id: client,
    type: 'geo',
    x: 120,
    y: 180,
    props: {
      geo: 'ellipse',
      w: 260,
      h: 140,
      color: 'blue',
      richText: toRichText('Client\nPOST /orders'),
    },
  },
  {
    id: api,
    type: 'geo',
    x: 560,
    y: 180,
    props: {
      geo: 'rectangle',
      w: 300,
      h: 160,
      color: 'orange',
      richText: toRichText('Orders API'),
    },
  },
])

const arrow = helpers.createArrowBetweenShapes(client, api, {
  richText: toRichText('HTTPS'),
})

editor.select(client, api, arrow)
editor.zoomToFit({ animation: { duration: 200 } })
return { created: [client, api, arrow] }
```

`helpers.createArrowBetweenShapes` creates an arrow plus start and end bindings. Verify this with `api.getBindings`; one semantic arrow normally produces two binding records.

## Update idempotently

Use stable IDs and test for existing shapes:

```js
const { createShapeId, toRichText } = await import('tldraw')
const id = createShapeId('orders-api')
const existing = editor.getShape(id)

if (existing) {
  editor.updateShape({
    id,
    type: existing.type,
    x: 600,
    y: 200,
    props: { richText: toRichText('Orders API v2') },
  })
} else {
  editor.createShape({
    id,
    type: 'geo',
    x: 600,
    y: 200,
    props: { geo: 'rectangle', w: 300, h: 160, richText: toRichText('Orders API v2') },
  })
}

return { id, updated: Boolean(existing) }
```

Use `editor.updateShape`, not delete-and-recreate, when existing bindings must remain attached.

## Create, open, and save files

The documented API lacks file lifecycle routes. The desktop renderer module exposes file capabilities, but its filename and export name change between builds. Discover both by capability:

```js
const src = Array.from(globalThis.document.scripts)
  .map(script => script.src)
  .find(value => /\/index-[^/]+\.js$/.test(value))
if (!src) throw new Error('renderer entry module not found')

const renderer = await import(src)
const desktop = Object.values(renderer).find(
  value => value?.files?.newFile && value?.files?.openRecent && value?.files?.save
)
if (!desktop) throw new Error('desktop file bridge not found')
```

Then call exactly one of:

```js
desktop.files.newFile()
desktop.files.openRecent('/absolute/path/diagram.tldraw')
desktop.files.save()
```

This bridge is version-sensitive. If capability discovery fails, stop and report the mismatch instead of guessing exports. Do not hardcode values such as `index-ABC.js` or an export named `d`.

Serialize an untitled editor with:

```js
const { serializeTldrawJson } = await import('tldraw')
return await serializeTldrawJson(editor)
```

The result is a legacy JSON `.tldraw` document. After safely creating that path, open it with `openRecent` and call `save`; current tldraw Desktop may normalize it into a ZIP-based archive.

## Durable document scripts

Call `/script-workspace`, then inspect `mainJsPath` before editing. A non-default script belongs to the user and must be extended, not overwritten. Edit only `script/**` and the reported assets directory. Do not edit `.script-workspace`, SQLite files, metadata, or lock files.

After editing, poll `/script-status`:

- `applied`: disk digest, applied digest, and embedded manifest agree.
- `pending`: wait briefly and retry once.
- `error`: read `lastApplyError` and `errorLogPath`.

Use scripts for persistent clicks, shortcuts, timers, custom tools, and run-on-open behavior. Use `/exec` for static shape changes.

## Verification requests

Lint inside `/exec`:

```js
return helpers.getLints()
```

Screenshot through search:

```js
return await api.getScreenshot('tldr:file:...', {
  size: 'large',
  mode: 'canvas',
})
```

Inspect the returned image file. Structural validation cannot catch clipped labels, crossing connectors, or poor visual hierarchy.
