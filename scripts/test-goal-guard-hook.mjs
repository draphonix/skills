#!/usr/bin/env node

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const HOOK_PATH = path.join(REPO_ROOT, ".codex", "hooks", "goal_guard.mjs");

function makeFakeCodex(judgment) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-codex-"));
  const bin = path.join(dir, "codex");
  fs.writeFileSync(
    bin,
    `#!/usr/bin/env node
const fs = require("node:fs");
const judgment = ${JSON.stringify(judgment)};
const outputFlagIndex = process.argv.indexOf("-o");
if (outputFlagIndex === -1 || !process.argv[outputFlagIndex + 1]) {
  process.stderr.write("missing -o output path\\n");
  process.exit(2);
}
fs.writeFileSync(process.argv[outputFlagIndex + 1], JSON.stringify(judgment), "utf8");
`,
    "utf8",
  );
  fs.chmodSync(bin, 0o755);
  return dir;
}

function runGoalGuard(payload, env = {}) {
  const stdout = execFileSync("node", [HOOK_PATH], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      CODEX_GOAL_GUARD_MODEL: "test-goal-judge",
      ...env,
    },
  });
  return JSON.parse(stdout);
}

test("goal guard blocks when codex exec judge rejects the goal", () => {
  const fakeCodexDir = makeFakeCodex({
    ready: false,
    missing: ["objective proof", "validation loop"],
    reason: "The goal is too broad to self-verify.",
    question: "What proof should Codex produce before stopping?",
  });

  try {
    const payload = runGoalGuard(
      {
        tool_name: "functions.create_goal",
        tool_input: {
          objective: "Improve the app.",
        },
      },
      {
        PATH: `${fakeCodexDir}:${process.env.PATH}`,
      },
    );

    assert.equal(payload.continue, false);
    assert.match(payload.systemMessage, /LLM review/i);
    assert.match(payload.systemMessage, /\$goal-griller/);
    assert.match(payload.systemMessage, /objective proof/);
    assert.match(payload.systemMessage, /What proof should Codex produce/);
  } finally {
    fs.rmSync(fakeCodexDir, { recursive: true, force: true });
  }
});

test("goal guard allows when codex exec judge accepts the goal", () => {
  const fakeCodexDir = makeFakeCodex({
    ready: true,
    missing: [],
    reason: "The goal has outcome, proof, scope, validation, and pause rules.",
    question: "",
  });

  try {
    const payload = runGoalGuard(
      {
        tool_name: "create_goal",
        tool_input: {
          objective:
            "Complete dashboard performance optimization so initial load improves by at least 25%, " +
            "only touching dashboard loading. Read README.md and src/dashboard first. Validate with npm test " +
            "and benchmark output. Stop when tests pass and the benchmark proves the gain. Pause if behavior changes are required.",
        },
      },
      {
        PATH: `${fakeCodexDir}:${process.env.PATH}`,
      },
    );

    assert.deepEqual(payload, { continue: true });
  } finally {
    fs.rmSync(fakeCodexDir, { recursive: true, force: true });
  }
});

test("goal guard blocks rather than guessing when codex exec fails", () => {
  const fakeCodexDir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-codex-fail-"));
  const bin = path.join(fakeCodexDir, "codex");
  fs.writeFileSync(
    bin,
    "#!/usr/bin/env node\nprocess.stderr.write('codex unavailable\\n'); process.exit(1);\n",
    "utf8",
  );
  fs.chmodSync(bin, 0o755);

  try {
    const payload = runGoalGuard(
      {
        tool_name: "create_goal",
        tool_input: {
          objective: "Improve the app.",
        },
      },
      {
        PATH: `${fakeCodexDir}:${process.env.PATH}`,
      },
    );

    assert.equal(payload.continue, false);
    assert.match(payload.systemMessage, /could not run the required `codex exec` LLM review/i);
    assert.match(payload.systemMessage, /codex unavailable/);
  } finally {
    fs.rmSync(fakeCodexDir, { recursive: true, force: true });
  }
});

test("goal guard does not block /goal status checks without a new objective", () => {
  const payload = runGoalGuard({
    tool_name: "Bash",
    tool_input: {
      command: "/goal",
    },
  });

  assert.deepEqual(payload, { continue: true });
});
