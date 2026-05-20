#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 120000;

const GOAL_TOOL_NAMES = new Set(["create_goal", "set_goal", "set_goals", "goal"]);

const JUDGE_PROMPT = `You are a strict gatekeeper for OpenAI Codex goal mode.

Judge whether a proposed long-running Codex goal is safe to execute autonomously.

A goal is ready only when the prompt makes these requirements clear enough for an agent to self-direct and stop:
1. Outcome: one concrete truth to make real.
2. Success condition: objective proof or inspectable done criteria.
3. Scope boundary: what may change and what must not change.
4. Context: files, docs, logs, issues, services, or commands to inspect first, unless the goal is clearly self-contained.
5. Validation loop: checks to run during work and final proof before claiming done.
6. Stop and pause rules: when to stop as done and when to pause for human input.

Use semantic judgment. Do not require exact headings or keywords. Accept compact goals when the above are genuinely implied. Reject vague goals that could let Codex wander, expand scope, or claim completion without proof.

Return only JSON with this shape:
{
  "ready": boolean,
  "missing": string[],
  "reason": string,
  "question": string
}

"question" should be the single highest-leverage question goal-griller should ask next when ready is false.`;

function getNestedValue(payload, pathParts) {
  let current = payload;
  for (const part of pathParts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function getNestedString(payload, pathParts) {
  const value = getNestedValue(payload, pathParts);
  return typeof value === "string" ? value.trim() : "";
}

function inferToolName(payload) {
  const candidates = [
    getNestedString(payload, ["tool_name"]),
    getNestedString(payload, ["toolName"]),
    getNestedString(payload, ["tool", "name"]),
    getNestedString(payload, ["name"]),
  ];
  return candidates.find(Boolean) || "";
}

function normalizeToolName(toolName) {
  const parts = toolName.trim().split(/[./:]/).filter(Boolean);
  return parts.at(-1) || "";
}

function isGoalToolCall(payload, toolInput) {
  const toolName = normalizeToolName(inferToolName(payload));
  if (GOAL_TOOL_NAMES.has(toolName)) {
    return true;
  }

  const command = getNestedString(toolInput, ["command"]);
  if (!command) {
    return false;
  }

  const trimmed = command.trim();
  return trimmed.startsWith("/goal ") || trimmed.startsWith("goal ") || trimmed.startsWith("set_goal ");
}

function stringifyCandidate(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => stringifyCandidate(item)).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return "";
}

function extractGoalFromCommand(command) {
  const trimmed = command.trim();
  for (const prefix of ["/goal ", "goal ", "set_goal ", "set_goals "]) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return "";
}

function inferGoalText(toolInput) {
  const keys = ["objective", "goal", "goals", "prompt", "text", "description"];
  for (const key of keys) {
    const value = stringifyCandidate(toolInput[key]);
    if (value) {
      return value;
    }
  }

  const command = getNestedString(toolInput, ["command"]);
  return command ? extractGoalFromCommand(command) : "";
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("LLM returned an empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM response did not contain JSON");
  }
}

function buildJudgmentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["ready", "missing", "reason", "question"],
    properties: {
      ready: { type: "boolean" },
      missing: {
        type: "array",
        items: { type: "string" },
      },
      reason: { type: "string" },
      question: { type: "string" },
    },
  };
}

function makeTempFile(prefix, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const filePath = path.join(dir, "file.json");
  fs.writeFileSync(filePath, contents, "utf8");
  return { dir, filePath };
}

function judgeWithCodexExec({ goalText, payload }) {
  const model =
    process.env.CODEX_GOAL_GUARD_MODEL ||
    DEFAULT_MODEL;
  const timeout = Number.parseInt(process.env.CODEX_GOAL_GUARD_TIMEOUT_MS || "", 10);
  const timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  const schema = makeTempFile("codex-goal-guard-schema", JSON.stringify(buildJudgmentSchema()));
  const output = makeTempFile("codex-goal-guard-output", "");
  const toolName = normalizeToolName(inferToolName(payload)) || "goal";
  const prompt = `${JUDGE_PROMPT}

Judge this proposed goal and return only the required JSON object.

${JSON.stringify({
  tool_name: toolName,
  proposed_goal: goalText,
})}`;

  try {
    execFileSync(
      "codex",
      [
        "exec",
        "--skip-git-repo-check",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--disable",
        "hooks",
        "--sandbox",
        "read-only",
        "-m",
        model,
        "-o",
        output.filePath,
        "--output-schema",
        schema.filePath,
        "-C",
        process.cwd(),
        "-",
      ],
      {
        input: prompt,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 4,
        timeout: timeoutMs,
        stdio: ["pipe", "ignore", "pipe"],
        env: {
          ...process.env,
          CODEX_GOAL_GUARD_DISABLED: "1",
        },
      },
    );
    return extractJsonObject(fs.readFileSync(output.filePath, "utf8"));
  } finally {
    fs.rmSync(schema.dir, { recursive: true, force: true });
    fs.rmSync(output.dir, { recursive: true, force: true });
  }
}

function judgeGoal(goalText, payload) {
  return judgeWithCodexExec({ goalText, payload });
}

function normalizeJudgment(raw) {
  const ready = raw?.ready === true;
  const missing = Array.isArray(raw?.missing)
    ? raw.missing.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const reason = typeof raw?.reason === "string" ? raw.reason.trim() : "";
  const question = typeof raw?.question === "string" ? raw.question.trim() : "";

  return {
    ready,
    missing,
    reason,
    question,
  };
}

function renderBlockedMessage(goalText, judgment) {
  const preview = goalText.length > 220 ? `${goalText.slice(0, 217)}...` : goalText;
  const missing = judgment.missing.length > 0 ? judgment.missing.join(", ") : "unspecified readiness gaps";
  const question = judgment.question || "What should be objectively true, and how should Codex prove it?";

  return (
    "Goal Guard blocked this goal after LLM review because it is not ready for autonomous Codex goal mode. " +
    `Missing: ${missing}. ` +
    `${judgment.reason ? `Reason: ${judgment.reason} ` : ""}` +
    "Run `$goal-griller` now and answer its interview before setting the goal. " +
    `Next question: ${question} ` +
    `Blocked goal preview: ${JSON.stringify(preview)}`
  );
}

function renderJudgeFailureMessage(error) {
  return (
    "Goal Guard could not run the required `codex exec` LLM review, so it blocked goal creation instead of guessing with rules. " +
    `${error instanceof Error ? error.message : String(error)}. ` +
    "Fix local Codex CLI/auth, set CODEX_GOAL_GUARD_FAIL_OPEN=1 to bypass on judge failure, or run `$goal-griller` manually."
  );
}

async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

export async function main() {
  const payload = await readPayload();
  const toolInput = payload.tool_input || {};

  if (process.env.CODEX_GOAL_GUARD_DISABLED === "1" || !isGoalToolCall(payload, toolInput)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return 0;
  }

  const goalText = inferGoalText(toolInput);
  if (!goalText) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return 0;
  }

  try {
    const judgment = normalizeJudgment(await judgeGoal(goalText, payload));
    if (judgment.ready) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return 0;
    }

    process.stdout.write(
      JSON.stringify({
        continue: false,
        systemMessage: renderBlockedMessage(goalText, judgment),
      }),
    );
    return 0;
  } catch (error) {
    if (process.env.CODEX_GOAL_GUARD_FAIL_OPEN === "1") {
      process.stdout.write(
        JSON.stringify({
          continue: true,
          systemMessage:
            "Goal Guard LLM review failed and CODEX_GOAL_GUARD_FAIL_OPEN=1 is set, so goal creation was allowed. " +
            `${error instanceof Error ? error.message : String(error)}`,
        }),
      );
      return 0;
    }

    process.stdout.write(
      JSON.stringify({
        continue: false,
        systemMessage: renderJudgeFailureMessage(error),
      }),
    );
    return 0;
  }
}

function isDirectExecution() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectExecution()) {
  process.exitCode = await main();
}
