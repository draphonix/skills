# ask_user Tool

Optimized tool for asking users to choose between multiple approaches. Returns **pure JSON** output for reliable LLM integration and parsing.

**Note**: This is a local custom tool. Amp also has a built-in `tb__ask_user` tool, but it has rendering issues with options. Use this tool when you need reliable option display.

## Usage

### Define Tool Description (for toolbox registration)
```bash
TOOLBOX_ACTION=describe bun tools/ask_user.ts
```

### Execute (input via stdin)
```bash
TOOLBOX_ACTION=execute bun tools/ask_user.ts <<'EOF'
{
  "question": "What approach should we use?",
  "context": "We need to decide between implementation patterns.",
  "options": [
    { "label": "Option A", "description": "Pros: X, Cons: Y" },
    { "label": "Option B", "description": "Pros: Z, Cons: W" }
  ]
}
EOF
```

## Input Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `question` | string | Yes | The question or decision point (non-empty) |
| `options` | array | Yes | 2-20 options, each can be string or `{label, description}` |
| `context` | string | No | Optional context explaining why asking |

### Options Format

**As strings:**
```json
{
  "options": ["Option A", "Option B", "Option C"]
}
```

**As objects:**
```json
{
  "options": [
    { "label": "Approach A", "description": "Best for performance" },
    { "label": "Approach B", "description": "Best for maintainability" }
  ]
}
```

**Mixed or stringified JSON also supported.**

## Output Schema

### Success (status: "ok")
```json
{
  "tool": "ask_user",
  "version": 1,
  "status": "ok",
  "prompt": {
    "question": "...",
    "context": "...",           // omitted if not provided
    "kind": "single_select",
    "options": [
      { "id": "1", "label": "...", "description": "..." },
      { "id": "2", "label": "...", "description": "..." }
    ],
    "answer_instructions": "Reply with the option number (1-N).",
    "answer_format": {
      "type": "integer",
      "min": 1,
      "max": N
    }
  },
  "rendered_markdown": "Formatted text for human display"
}
```

**Key fields for LLM integration:**
- `prompt.answer_format` — Defines expected reply type and valid range
- `prompt.options[].id` — Stable identifiers for each option
- `rendered_markdown` — Human-readable version (for logging/display)

### Error (status: "error")
```json
{
  "tool": "ask_user",
  "version": 1,
  "status": "error",
  "error": {
    "code": "INVALID_OPTIONS",
    "message": "options must have at least 2 items",
    "parseError": "..."  // optional additional context
  }
}
```

**Common error codes:**
- `INVALID_JSON` — Input not valid JSON
- `MISSING_QUESTION` — question field missing or empty
- `MISSING_OPTIONS` — options field missing
- `INVALID_OPTIONS_JSON` — options stringified JSON failed to parse
- `INVALID_OPTIONS` — options array validation failed (length, type, etc.)
- `INTERNAL_ERROR` — Unexpected runtime error

**Exit codes:**
- `0` — Success
- `1` — Any error

## Integration Example (Claude Tool)

```json
{
  "name": "ask_user",
  "description": "Ask user to choose from options",
  "input_schema": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "options": { "type": "array" },
      "context": { "type": "string" }
    },
    "required": ["question", "options"]
  },
  "execute": "TOOLBOX_ACTION=execute bun /Users/themrb/.config/amp/tools/ask_user.ts"
}
```

When Claude calls this tool, it will:
1. Receive structured JSON output with `answer_format` validation specs
2. Parse the response reliably (pure JSON, no mixed text)
3. Present `rendered_markdown` to user (optional UI rendering)
4. Validate user's numeric reply against `answer_format.min/max`
5. Process selected option deterministically via `options[].id`

## Design Principles

✅ **JSON-only output** — No mixed text; always machine-parseable  
✅ **Explicit answer format** — LLM knows valid reply ranges before prompting user  
✅ **Stable option IDs** — Unique, consistent identifiers for each choice  
✅ **Strict validation** — Clear error codes and messages (not silent failures)  
✅ **Backward compatible** — Accepts multiple option formats (strings, objects, JSON strings)  
✅ **Human-friendly** — Includes `rendered_markdown` for display/logging  

## Examples

### Simple binary choice
```bash
{
  "question": "Continue with this approach?",
  "options": ["Yes, proceed", "No, reconsider"]
}
```

### Multi-option with context
```bash
{
  "question": "How should we structure the database?",
  "context": "Schema design impacts query performance and maintainability.",
  "options": [
    { "label": "Monolithic (single table)", "description": "Fast for simple queries" },
    { "label": "Normalized (multiple tables)", "description": "Flexible but more complex" },
    { "label": "Hybrid (denormalized views)", "description": "Balance of both" }
  ]
}
```

### Stringified JSON input (also works)
```bash
{
  "question": "Pick one",
  "options": "[\"A\", \"B\"]"
}
```
