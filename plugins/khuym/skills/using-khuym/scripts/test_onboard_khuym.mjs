#!/usr/bin/env node

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";

import { applyRepo, checkRepo, getNodeRuntimeStatus } from "./onboard_khuym.mjs";
import { buildKhuymDependencyReport } from "./khuym_dependencies.mjs";

const LOCAL_ONBOARD_SCRIPT_PATH = fileURLToPath(new URL("./onboard_khuym.mjs", import.meta.url));
const LOCAL_USING_KHUYM_SKILL_PATH = fileURLToPath(new URL("../SKILL.md", import.meta.url));
const LOCAL_REPO_ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));

function runSessionStartHook(root, payload = { cwd: root }, env = {}) {
  const hookPath = path.join(root, ".codex", "hooks", "khuym_session_start.mjs");
  const stdout = execFileSync("node", [hookPath], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify(payload),
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout);
}

function runPreToolUseHook(root, payload, env = {}) {
  const hookPath = path.join(root, ".codex", "hooks", "khuym_pre_tool_use.mjs");
  const stdout = execFileSync("node", [hookPath], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify(payload),
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout);
}

async function startMockGkgServer(routes) {
  const child = spawn(
    process.execPath,
    [
      "-e",
      `
const { createServer } = require("node:http");
const routes = ${JSON.stringify(routes)};
const server = createServer((request, response) => {
  const handler = routes[request.url || ""];
  if (!handler) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
    return;
  }
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(handler));
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(String(address.port) + "\\n");
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );

  const port = await new Promise((resolve, reject) => {
    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const line = buffer.split("\n")[0]?.trim();
      if (line) {
        resolve(Number(line));
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      reject(new Error(`mock gkg server exited before startup with code ${code}`));
    });
  });

  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
}

test("applyRepo creates full repo onboarding with node-based hooks", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    const result = applyRepo(root, false);

    assert.equal(result.result.status, "complete");
    assert.equal(result.status, "up_to_date");
    assert.equal(result.details.runtime.supported, true);
    assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
    assert.match(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), /Khuym Workflow/);
    assert.ok(fs.existsSync(path.join(root, ".codex", "config.toml")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "hooks.json")));
    assert.ok(fs.existsSync(path.join(root, ".khuym", "onboarding.json")));
    assert.ok(fs.existsSync(path.join(root, ".khuym", "state.json")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "hooks", "khuym_session_start.mjs")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "khuym_status.mjs")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "khuym_state.mjs")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "khuym_dependencies.mjs")));
    assert.ok(fs.existsSync(path.join(root, ".codex", "khuym_reservations.mjs")));
    assert.equal(fs.existsSync(path.join(root, ".khuym", "STATE.md")), false);
    assert.match(
      fs.readFileSync(path.join(root, ".codex", "hooks.json"), "utf8"),
      /node \.codex\/hooks\/khuym_session_start\.mjs/,
    );
    const state = JSON.parse(fs.readFileSync(path.join(root, ".khuym", "state.json"), "utf8"));
    assert.equal(state.schema_version, "1.1");
    assert.equal(state.phase, "idle");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("applyRepo removes legacy STATE.md when present", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    fs.mkdirSync(path.join(root, ".khuym"), { recursive: true });
    fs.writeFileSync(path.join(root, ".khuym", "STATE.md"), "focus: legacy\nphase: old\n", "utf8");

    const result = applyRepo(root, false);

    assert.equal(result.status, "up_to_date");
    assert.equal(fs.existsSync(path.join(root, ".khuym", "STATE.md")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("applyRepo appends managed block to existing agents instructions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# Existing instructions\n", "utf8");

    applyRepo(root, false);
    const agentsText = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");

    assert.match(agentsText, /# Existing instructions/);
    assert.match(agentsText, /<!-- KHUYM:START -->/);
    assert.equal((agentsText.match(/<!-- KHUYM:START -->/g) || []).length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("applyRepo preserves an existing compact_prompt without explicit replace", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    const codexDir = path.join(root, ".codex");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(path.join(codexDir, "config.toml"), 'compact_prompt = """keep me"""\n', "utf8");

    const result = applyRepo(root, false);
    const configText = fs.readFileSync(path.join(codexDir, "config.toml"), "utf8");

    assert.match(configText, /compact_prompt = """keep me"""/);
    assert.equal(result.result.status, "partial");
    assert.match(JSON.stringify(result.result), /compact_prompt/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("checkRepo flags stale python hook commands and legacy hook files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    const hooksDir = path.join(root, ".codex", "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, ".codex", "hooks.json"),
      JSON.stringify(
        {
          hooks: {
            SessionStart: [
              {
                matcher: "startup|resume",
                hooks: [
                  {
                    type: "command",
                    command:
                      'python3 "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.codex/hooks/khuym_session_start.py"',
                    statusMessage: "Khuym: session bootstrap",
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(path.join(hooksDir, "khuym_session_start.py"), "# legacy\n", "utf8");

    const result = checkRepo(root);

    assert.equal(result.status, "needs_onboarding");
    assert.ok(result.actions.includes("install_khuym_hook_entries"));
    assert.ok(result.actions.includes("sync_khuym_hook_scripts"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("installed khuym_status script reports onboarding and state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);

    const stdout = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs"), "--json"], {
      cwd: root,
      encoding: "utf8",
    });
    const status = JSON.parse(stdout);

    assert.equal(status.onboarding.exists, true);
    assert.equal(status.state_json.exists, true);
    assert.equal(status.state_json.phase, "idle");
    assert.equal("state_markdown" in status, false);
    assert.ok(status.dependency_health);
    assert.ok(typeof status.dependency_health.summary.missing_dependencies === "number");
    assert.ok(status.next_reads.includes("AGENTS.md"));
    assert.equal(status.next_reads.includes(".khuym/STATE.md"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reservation helper stores, lists, and releases local reservations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-reservations-"));

  try {
    applyRepo(root, false);

    const helperPath = path.join(root, ".codex", "khuym_reservations.mjs");
    const reserveText = execFileSync(
      "node",
      [helperPath, "reserve", "--agent", "Peirce", "--bead", "br-1", "--path", "src/**", "--ttl", "600", "--json"],
      { cwd: root, encoding: "utf8" },
    );
    const reservePayload = JSON.parse(reserveText);
    assert.equal(reservePayload.ok, true);
    assert.equal(reservePayload.reservation.agent, "Peirce");

    const listPayload = JSON.parse(
      execFileSync("node", [helperPath, "list", "--active-only", "--json"], {
        cwd: root,
        encoding: "utf8",
      }),
    );
    assert.equal(listPayload.reservations.length, 1);
    assert.equal(listPayload.reservations[0].bead_id, "br-1");

    const releasePayload = JSON.parse(
      execFileSync("node", [helperPath, "release", "--agent", "Peirce", "--bead", "br-1", "--json"], {
        cwd: root,
        encoding: "utf8",
      }),
    );
    assert.equal(releasePayload.released_count, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("pre-tool hook blocks write-heavy bash commands that hit another worker reservation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-hook-block-"));

  try {
    applyRepo(root, false);
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "app.ts"), "export const value = 1;\n", "utf8");

    execFileSync(
      "node",
      [
        path.join(root, ".codex", "khuym_reservations.mjs"),
        "reserve",
        "--agent",
        "Curie",
        "--bead",
        "br-7",
        "--path",
        "src/**",
        "--json",
      ],
      { cwd: root, encoding: "utf8" },
    );

    const payload = runPreToolUseHook(root, {
      cwd: root,
      agent_name: "Peirce",
      tool_input: {
        command: "git add src/app.ts",
      },
    });

    assert.equal(payload.continue, false);
    assert.match(payload.systemMessage, /local reservations blocked/i);
    assert.match(payload.systemMessage, /Curie/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("pre-tool hook warns instead of blocking when agent identity is unavailable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-hook-warn-"));

  try {
    applyRepo(root, false);
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "app.ts"), "export const value = 1;\n", "utf8");

    execFileSync(
      "node",
      [
        path.join(root, ".codex", "khuym_reservations.mjs"),
        "reserve",
        "--agent",
        "Curie",
        "--bead",
        "br-7",
        "--path",
        "src/**",
        "--json",
      ],
      { cwd: root, encoding: "utf8" },
    );

    const payload = runPreToolUseHook(root, {
      cwd: root,
      tool_input: {
        command: "git add src/app.ts",
      },
    });

    assert.equal(payload.continue, true);
    assert.match(payload.systemMessage, /warning instead of blocking/i);
    assert.match(payload.systemMessage, /KHUYM_AGENT_NAME/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Khuym onboarding does not install the general goal guard as a Khuym hook", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-no-goal-guard-"));

  try {
    applyRepo(root, false);

    const hooksJson = JSON.parse(fs.readFileSync(path.join(root, ".codex", "hooks.json"), "utf8"));
    const preToolUse = hooksJson.hooks.PreToolUse || [];

    assert.equal(
      preToolUse.some((entry) => String(entry.matcher || "").includes("goal")),
      false,
    );

    const payload = runPreToolUseHook(root, {
      cwd: root,
      tool_name: "create_goal",
      tool_input: {
        objective: "Improve the app.",
      },
    });

    assert.equal(payload.continue, true);
    assert.equal(payload.systemMessage, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("installed khuym_status reports gkg readiness for a supported indexed repo", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-gkg-"));
  const mockServer = await startMockGkgServer({
    "/api/info": { port: 27495, version: "0.24.0" },
    "/api/workspace/list": {
      workspaces: [
        {
          workspace_folder_path: root,
          projects: [{ project_path: root }],
        },
      ],
    },
  });

  try {
    await applyRepo(root, false);
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const stdout = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs"), "--json"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, KHUYM_GKG_SERVER_URL: mockServer.url },
    });
    const status = JSON.parse(stdout);

    assert.equal(status.gkg_readiness.supported_repo, true);
    assert.deepEqual(status.gkg_readiness.supported_languages, ["TypeScript / JavaScript"]);
    assert.equal(status.gkg_readiness.primary_supported_language, "TypeScript / JavaScript");
    assert.equal(status.gkg_readiness.coverage, "full");
    assert.equal(status.gkg_readiness.server_reachable, true);
    assert.equal(status.gkg_readiness.project_indexed, true);
    assert.match(status.gkg_readiness.recommended_action, /ready/i);
  } finally {
    await mockServer.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("checkRepo reports gkg fallback for unsupported repos", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-gkg-"));

  try {
    await applyRepo(root, false);
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "main.rs"), "fn main() {}\n", "utf8");

    const payload = await checkRepo(root);

    assert.equal(payload.details.gkg_readiness.supported_repo, false);
    assert.equal(payload.details.gkg_readiness.coverage, "none");
    assert.match(payload.details.gkg_readiness.recommended_action, /fallback/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("installed khuym_status text distinguishes missing commands from missing MCP config", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    missing-cli:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required for test",
        "    missing-server:",
        "      kind: mcp_server",
        "      server_names: [definitely_missing_mcp_server_name]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: required for test",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const stdout = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs")], {
      cwd: root,
      encoding: "utf8",
    });

    assert.match(stdout, /Dependency health:/);
    assert.match(stdout, /Missing commands:/);
    assert.match(stdout, /definitely-missing-command/);
    assert.match(stdout, /Missing MCP server configuration:/);
    assert.match(stdout, /definitely_missing_mcp_server_name/);
    assert.match(stdout, /Affects: khuym:alpha/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("checkRepo reports dependency health summary without blocking onboarding status", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const payload = checkRepo(root);

    assert.equal(payload.status, "up_to_date");
    assert.ok(payload.details.dependency_health);
    assert.ok(typeof payload.details.dependency_health.summary.skills_total === "number");
    assert.ok(typeof payload.details.dependency_health.summary.skills_uncovered === "number");
    assert.ok(Array.isArray(payload.details.dependency_health.skills));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency report distinguishes dependency-free packaged skills from uncovered ones", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-coverage-"));
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const alphaDir = path.join(skillsRoot, "alpha");
    const betaDir = path.join(skillsRoot, "beta");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.mkdirSync(betaDir, { recursive: true });

    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies: []",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(betaDir, "SKILL.md"),
      [
        "---",
        "name: beta",
        "description: uncovered fixture",
        "---",
        "",
        "# beta",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      globalCodexConfigPath: path.join(root, "missing-global.toml"),
      commandProbe: () => ({ available: true, detail: "unused in coverage test" }),
    });

    assert.equal(report.summary.skills_total, 2);
    assert.equal(report.summary.skills_covered, 1);
    assert.equal(report.summary.skills_dependency_free, 1);
    assert.equal(report.summary.skills_uncovered, 1);
    assert.equal(report.summary.skills_available, 1);
    assert.equal(report.summary.declared_dependencies, 0);
    assert.deepEqual(report.uncovered_skills.map((skill) => skill.skill_name), ["khuym:beta"]);

    const alpha = report.skills.find((skill) => skill.skill_name === "khuym:alpha");
    const beta = report.skills.find((skill) => skill.skill_name === "khuym:beta");
    assert.equal(alpha?.coverage_status, "dependency_free");
    assert.equal(alpha?.status, "available");
    assert.equal(beta?.coverage_status, "uncovered");
    assert.equal(beta?.status, "uncovered");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("khuym_status text surfaces uncovered packaged skills instead of skipping them", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-coverage-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    const betaDir = path.join(skillsRoot, "beta");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.mkdirSync(betaDir, { recursive: true });

    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies: []",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(betaDir, "SKILL.md"),
      [
        "---",
        "name: beta",
        "description: uncovered fixture",
        "---",
        "",
        "# beta",
        "",
      ].join("\n"),
      "utf8",
    );

    const payload = checkRepo(root);
    assert.equal(payload.details.dependency_health.summary.skills_dependency_free, 1);
    assert.equal(payload.details.dependency_health.summary.skills_uncovered, 1);

    const stdout = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
    assert.match(stdout, /Packaged skill coverage: 2 total/);
    assert.match(stdout, /Uncovered packaged skills:/);
    assert.match(stdout, /khuym:beta/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("checkRepo promotes missing dependency data into an operator-facing warning summary", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    missing-cli:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required for test",
        "    missing-server:",
        "      kind: mcp_server",
        "      server_names: [definitely_missing_mcp_server_name]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: required for test",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const payload = checkRepo(root);
    const warning = payload.details.dependency_warning;

    assert.equal(warning.status, "warning");
    assert.equal(warning.missing_dependencies_count, 2);
    assert.deepEqual(warning.affected_skills, ["khuym:alpha"]);
    assert.match(warning.message, /Dependency warning:/);
    assert.match(warning.message, /khuym:alpha/);
    assert.match(warning.message, /Missing commands: definitely-missing-command/);
    assert.match(
      warning.message,
      /Missing MCP server configuration: definitely_missing_mcp_server_name/,
    );
    assert.equal(warning.missing_commands.length, 1);
    assert.equal(warning.missing_commands[0].command, "definitely-missing-command");
    assert.equal(warning.missing_mcp_servers.length, 1);
    assert.deepEqual(warning.missing_mcp_servers[0].servers, ["definitely_missing_mcp_server_name"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("onboard check JSON includes dependency warning summary when dependencies are missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    missing-cli:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required for test",
        "    missing-server:",
        "      kind: mcp_server",
        "      server_names: [definitely_missing_mcp_server_name]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: required for test",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const stdout = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs"), "--json"], {
      cwd: root,
      encoding: "utf8",
    });
    const status = JSON.parse(stdout);
    assert.equal(status.dependency_health.summary.missing_dependencies, 2);

    const onboardStdout = execFileSync(
      "node",
      [
        LOCAL_ONBOARD_SCRIPT_PATH,
        "--repo-root",
        root,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const onboardPayload = JSON.parse(onboardStdout);
    const warning = onboardPayload.details.dependency_warning;

    assert.equal(warning.status, "warning");
    assert.match(warning.message, /Dependency warning:/);
    assert.match(warning.message, /khuym:alpha/);
    assert.match(warning.message, /Missing commands: definitely-missing-command/);
    assert.match(
      warning.message,
      /Missing MCP server configuration: definitely_missing_mcp_server_name/,
    );
    assert.equal(warning.missing_dependencies_count, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("session-start hook emits dependency warning with command-vs-MCP split when dependencies are missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    missing-cli:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required for test",
        "    missing-server:",
        "      kind: mcp_server",
        "      server_names: [definitely_missing_mcp_server_name]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: required for test",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const payload = runSessionStartHook(root);
    const context = payload.hookSpecificOutput.additionalContext;

    assert.match(context, /Dependency warning:/);
    assert.match(context, /khuym:alpha/);
    assert.match(context, /Missing commands: definitely-missing-command/);
    assert.match(
      context,
      /Missing MCP server configuration: definitely_missing_mcp_server_name/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("session-start hook stays quiet about dependency warnings when dependencies are healthy", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const payload = runSessionStartHook(root);
    const context = payload.hookSpecificOutput.additionalContext;

    assert.doesNotMatch(context, /Dependency warning:/);
    assert.doesNotMatch(context, /Missing commands:/);
    assert.doesNotMatch(context, /Missing MCP server configuration:/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("session-start hook surfaces gkg readiness guidance for supported repos that are not ready", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-gkg-hook-"));

  try {
    applyRepo(root, false);
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const payload = runSessionStartHook(
      root,
      { cwd: root },
      { KHUYM_GKG_SERVER_URL: "http://127.0.0.1:9" },
    );
    const context = payload.hookSpecificOutput.additionalContext;

    assert.match(context, /gkg readiness:/);
    assert.match(context, /gkg index/);
    assert.match(context, /gkg server start/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("entry surfaces share the same missing-command vs missing-MCP wording boundary", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-onboard-"));

  try {
    applyRepo(root, false);
    const skillsRoot = path.join(root, "plugins", "khuym", "skills");
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    missing-cli:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required for test",
        "    missing-server:",
        "      kind: mcp_server",
        "      server_names: [definitely_missing_mcp_server_name]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: required for test",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const scoutText = execFileSync("node", [path.join(root, ".codex", "khuym_status.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
    assert.match(scoutText, /Missing commands:/);
    assert.match(scoutText, /Missing MCP server configuration:/);
    assert.match(scoutText, /definitely-missing-command/);
    assert.match(scoutText, /definitely_missing_mcp_server_name/);
    assert.match(scoutText, /Affects: khuym:alpha/);

    const onboardPayload = JSON.parse(
      execFileSync(
        "node",
        [LOCAL_ONBOARD_SCRIPT_PATH, "--repo-root", root],
        { cwd: root, encoding: "utf8" },
      ),
    );
    const onboardingWarning = onboardPayload.details.dependency_warning;
    assert.match(onboardingWarning.message, /Missing commands: definitely-missing-command/);
    assert.match(
      onboardingWarning.message,
      /Missing MCP server configuration: definitely_missing_mcp_server_name/,
    );
    assert.match(onboardingWarning.message, /Affected skills: khuym:alpha/);

    const startupPayload = runSessionStartHook(root);
    const startupContext = startupPayload.hookSpecificOutput.additionalContext;
    assert.match(startupContext, /Missing commands: definitely-missing-command/);
    assert.match(
      startupContext,
      /Missing MCP server configuration: definitely_missing_mcp_server_name/,
    );
    assert.match(startupContext, /Affected skills: khuym:alpha/);

    const skillText = fs.readFileSync(LOCAL_USING_KHUYM_SKILL_PATH, "utf8");
    assert.match(skillText, /Missing commands:/);
    assert.match(skillText, /Missing MCP server configuration:/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency helper marks missing command and missing mcp_server dependencies", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-deps-"));
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    must-have-command:",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required",
        "    am-server:",
        "      kind: mcp_server",
        "      server_names: [mcp_agent_mail]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: degraded",
        "      reason: coordination",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      globalCodexConfigPath: path.join(root, "missing-global.toml"),
      commandProbe: () => ({ available: false, detail: "missing in test" }),
    });

    assert.equal(report.summary.skills_total, 1);
    assert.equal(report.summary.skills_available, 0);
    assert.equal(report.summary.skills_unavailable, 1);
    assert.equal(report.summary.missing_dependencies, 2);
    assert.equal(report.skills[0].status, "unavailable");
    assert.deepEqual(
      report.skills[0].missing_dependencies.map((dependency) => dependency.id).sort(),
      ["am-server", "must-have-command"],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency helper parses nested dependency list items", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-deps-nested-"));
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "description: Use when testing nested dependency metadata.",
        "metadata:",
        "  dependencies:",
        "    -",
        "      id: must-have-command",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      commandProbe: () => ({ available: false, detail: "missing in test" }),
    });

    assert.equal(report.summary.declared_dependencies, 1);
    assert.equal(report.skills[0].missing_dependencies[0].id, "must-have-command");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency helper parses dependency block scalars for plugin-eval compatibility", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-deps-block-"));
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const alphaDir = path.join(skillsRoot, "alpha");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "description: Use when testing block scalar dependency metadata.",
        "metadata:",
        "  dependencies: |",
        "    - id: must-have-command",
        "      kind: command",
        "      command: definitely-missing-command",
        "      missing_effect: unavailable",
        "      reason: required",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      commandProbe: () => ({ available: false, detail: "missing in test" }),
    });

    assert.equal(report.summary.declared_dependencies, 1);
    assert.equal(report.skills[0].missing_dependencies[0].id, "must-have-command");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency helper respects declared MCP config_sources and can use packaged manifests", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-mcp-sources-"));
  const pluginRoot = path.join(root, "plugins", "khuym");
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const alphaDir = path.join(skillsRoot, "alpha");
    const betaDir = path.join(skillsRoot, "beta");
    const pluginManifestDir = path.join(pluginRoot, ".codex-plugin");
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.mkdirSync(betaDir, { recursive: true });
    fs.mkdirSync(pluginManifestDir, { recursive: true });

    fs.writeFileSync(
      path.join(pluginRoot, ".mcp.json"),
      JSON.stringify(
        {
          mcpServers: {
            gkg: {
              type: "sse",
              url: "http://localhost:27495/mcp/sse",
              includeTools: ["repo_map"],
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(pluginManifestDir, "plugin.json"),
      JSON.stringify(
        {
          name: "khuym",
          version: "0.0.0-test",
          mcpServers: "./.mcp.json",
        },
        null,
        2,
      ),
      "utf8",
    );

    fs.writeFileSync(
      path.join(alphaDir, "SKILL.md"),
      [
        "---",
        "name: alpha",
        "metadata:",
        "  dependencies:",
        "    gkg:",
        "      kind: mcp_server",
        "      server_names: [gkg]",
        "      config_sources: [repo_codex_config, global_codex_config]",
        "      missing_effect: unavailable",
        "      reason: repo/global only fixture",
        "---",
        "",
        "# alpha",
        "",
      ].join("\n"),
      "utf8",
    );

    fs.writeFileSync(
      path.join(betaDir, "SKILL.md"),
      [
        "---",
        "name: beta",
        "metadata:",
        "  dependencies:",
        "    gkg:",
        "      kind: mcp_server",
        "      server_names: [gkg]",
        "      config_sources: [plugin_mcp_manifest]",
        "      missing_effect: unavailable",
        "      reason: packaged-manifest fixture",
        "---",
        "",
        "# beta",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      globalCodexConfigPath: path.join(root, "missing-global.toml"),
      commandProbe: () => ({ available: true, detail: "unused in mcp source test" }),
    });

    const alpha = report.skills.find((skill) => skill.skill_name === "khuym:alpha");
    const beta = report.skills.find((skill) => skill.skill_name === "khuym:beta");

    assert.equal(alpha?.status, "unavailable");
    assert.deepEqual(alpha?.dependencies[0].probe.checked_sources, [
      "repo_codex_config",
      "global_codex_config",
    ]);
    assert.equal(beta?.status, "available");
    assert.deepEqual(beta?.dependencies[0].probe.matched_sources, ["plugin_mcp_manifest"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("dependency helper still accepts legacy root-level plugin MCP manifests", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khuym-mcp-legacy-"));
  const pluginRoot = path.join(root, "plugins", "khuym");
  const skillsRoot = path.join(root, "plugins", "khuym", "skills");

  try {
    const betaDir = path.join(skillsRoot, "beta");
    const pluginManifestDir = path.join(pluginRoot, ".codex-plugin");
    fs.mkdirSync(betaDir, { recursive: true });
    fs.mkdirSync(pluginManifestDir, { recursive: true });

    fs.writeFileSync(
      path.join(pluginRoot, ".mcp.json"),
      JSON.stringify(
        {
          gkg: {
            type: "http",
            url: "http://localhost:27495/mcp",
            includeTools: ["repo_map"],
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(pluginManifestDir, "plugin.json"),
      JSON.stringify(
        {
          name: "khuym",
          version: "0.0.0-test",
          mcpServers: "./.mcp.json",
        },
        null,
        2,
      ),
      "utf8",
    );

    fs.writeFileSync(
      path.join(betaDir, "SKILL.md"),
      [
        "---",
        "name: beta",
        "metadata:",
        "  dependencies:",
        "    gkg:",
        "      kind: mcp_server",
        "      server_names: [gkg]",
        "      config_sources: [plugin_mcp_manifest]",
        "      missing_effect: unavailable",
        "      reason: packaged-manifest fixture",
        "---",
        "",
        "# beta",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildKhuymDependencyReport({
      repoRoot: root,
      skillsRoot,
      globalCodexConfigPath: path.join(root, "missing-global.toml"),
      commandProbe: () => ({ available: true, detail: "unused in mcp source test" }),
    });

    const beta = report.skills.find((skill) => skill.skill_name === "khuym:beta");

    assert.equal(beta?.status, "available");
    assert.deepEqual(beta?.dependencies[0].probe.matched_sources, ["plugin_mcp_manifest"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("packaged Khuym inventory stays fully covered and the docs explain the declaration contract", () => {
  const report = buildKhuymDependencyReport({ repoRoot: LOCAL_REPO_ROOT });
  const skillText = fs.readFileSync(LOCAL_USING_KHUYM_SKILL_PATH, "utf8");
  const pluginManifest = JSON.parse(
    fs.readFileSync(
      path.join(LOCAL_REPO_ROOT, "plugins", "khuym", ".codex-plugin", "plugin.json"),
      "utf8",
    ),
  );
  const pluginMcp = JSON.parse(
    fs.readFileSync(path.join(LOCAL_REPO_ROOT, "plugins", "khuym", ".mcp.json"), "utf8"),
  );

  assert.equal(report.summary.skills_total, report.summary.skills_covered);
  assert.equal(report.summary.skills_uncovered, 0);
  assert.deepEqual(report.uncovered_skills, []);
  assert.equal(pluginManifest.mcpServers, "./.mcp.json");

  assert.match(skillText, /## Dependency Declaration Contract/);
  assert.match(skillText, /kind: command/);
  assert.match(skillText, /kind: mcp_server/);
  assert.match(skillText, /metadata\.dependencies: \[\]/);
  assert.match(
    skillText,
    /bash scripts\/check-markdown-links\.sh plugins\/khuym\/skills\/using-khuym\/SKILL\.md/,
  );
  assert.match(skillText, /bash scripts\/sync-skills\.sh --dry-run/);
  assert.deepEqual(pluginMcp.mcpServers.gkg.includeTools, [
    "list_projects",
    "index_project",
    "repo_map",
    "search_codebase_definitions",
    "get_references",
    "get_definition",
    "read_definitions",
  ]);
  assert.equal(pluginMcp.mcpServers["morph-mcp"].env.ENABLED_TOOLS, "codebase_search");
  assert.deepEqual(pluginMcp.mcpServers["morph-mcp"].includeTools, ["codebase_search"]);
});

test("getNodeRuntimeStatus enforces the minimum supported major version", () => {
  assert.equal(getNodeRuntimeStatus("18.0.0").supported, true);
  assert.equal(getNodeRuntimeStatus("17.9.1").supported, false);
});
