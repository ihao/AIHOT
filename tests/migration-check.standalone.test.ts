// A pull request cannot change deployed history or hide an unsafe migration by naming it as history.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test, type TestContext } from "node:test";
import { checkMigrations } from "../scripts/check-migrations.ts";

const root = mkdtempSync(path.join(tmpdir(), "migration-git-"));
after(() => rmSync(root, { recursive: true, force: true }));
const write = (file: string, text: string) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
};
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
git("init", "-q");
git("config", "user.email", "test@example.invalid");
git("config", "user.name", "Test");
write("database/migrations/0001_history.sql", "UPDATE old_table SET done = true;");
git("add", ".");
git("commit", "-qm", "history");

test("unchanged history is accepted, but edits and deletions fail", () => {
  assert.deepEqual(checkMigrations(root, "HEAD"), []);
  write("database/migrations/0001_history.sql", "SELECT 1;");
  assert.match(checkMigrations(root, "HEAD").join("\n"), /immutable/);
  rmSync(path.join(root, "database/migrations/0001_history.sql"));
  assert.match(checkMigrations(root, "HEAD").join("\n"), /immutable/);
  git("restore", ".");
});

test("new module migrations are checked even when untracked or named below the cutoff", () => {
  const file = "modules/example/migrations/0002_hidden.sql";
  write(file, "CREATE TABLE example (id int);");
  assert.match(checkMigrations(root, "HEAD").join("\n"), /0055/);
  rmSync(path.join(root, file));
  write("modules/example/migrations/0055_unsafe.sql", "UPDATE old_table SET done = false;");
  assert.match(checkMigrations(root, "HEAD").join("\n"), /0055_unsafe/);
  rmSync(path.join(root, "modules/example/migrations/0055_unsafe.sql"));
  write("modules/example/migrations/0055_safe.sql", "CREATE INDEX CONCURRENTLY IF NOT EXISTS example_idx ON example (id);");
  assert.deepEqual(checkMigrations(root, "HEAD"), []);
});

function deployedFixture(t: TestContext) {
  const dir = mkdtempSync(path.join(tmpdir(), "migration-deployed-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  const put = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  };
  run("init", "-q");
  run("config", "user.email", "test@example.invalid");
  run("config", "user.name", "Test");
  put("database/migrations/0001_history.sql", "UPDATE old_table SET done = true;");
  run("add", ".");
  run("commit", "-qm", "upstream history");
  const base = run("rev-parse", "HEAD").trim();
  put("database/migrations/0039_site_history.sql", "UPDATE old_table SET done = false;");
  put("modules/example/migrations/0040_module_history.sql", "DELETE FROM retired_table;");
  run("add", ".");
  run("commit", "-qm", "deployed site history");
  const deployed = run("rev-parse", "HEAD").trim();
  return { dir, run, put, base, deployed };
}

test("a fixed deployed baseline recognizes site and module history absent from the PR base", (t) => {
  const f = deployedFixture(t);
  assert.deepEqual(checkMigrations(f.dir, f.base, f.deployed), []);
  assert.match(checkMigrations(f.dir, f.base).join("\n"), /0039_site_history.*0055/);
});

test("both baselines remain immutable, including deleted module history", (t) => {
  const f = deployedFixture(t);
  f.put("database/migrations/0039_site_history.sql", "SELECT 1;");
  assert.match(checkMigrations(f.dir, f.base, f.deployed).join("\n"), /0039_site_history.*immutable/);
  f.run("restore", ".");
  rmSync(path.join(f.dir, "modules/example/migrations/0040_module_history.sql"));
  assert.match(checkMigrations(f.dir, f.base, f.deployed).join("\n"), /0040_module_history.*immutable/);
  f.run("restore", ".");
  f.put("database/migrations/0001_history.sql", "SELECT 1;");
  assert.match(checkMigrations(f.dir, f.base, f.deployed).join("\n"), /0001_history.*immutable/);
});

test("a deployed baseline cannot exempt newly committed writes, low numbers or blocking indexes", (t) => {
  const f = deployedFixture(t);
  for (const [name, sql, error] of [
    ["0041_hidden.sql", "CREATE TABLE hidden (id int);", /0055/],
    ["0055_write.sql", "UPDATE old_table SET done = true;", /not safe/],
    ["0055_blocking_index.sql", "CREATE INDEX idx ON old_table (id);", /CONCURRENTLY/],
    ["0055_multiple.sql", "ALTER TABLE old_table ADD COLUMN a text; ALTER TABLE old_table ADD COLUMN b text;", /one statement/],
  ] as const) {
    const file = `database/migrations/${name}`;
    f.put(file, sql);
    f.run("add", file);
    f.run("commit", "-qm", "unreleased migration");
    const problems = checkMigrations(f.dir, f.base, f.deployed);
    assert.equal(problems.length, 1);
    assert.ok(problems[0].startsWith(`${file}:`));
    assert.match(problems[0], error);
    f.run("rm", "-q", file);
    f.run("commit", "-qm", "remove test migration");
  }
});

test("new safe migrations may share a number but never a complete filename", (t) => {
  const f = deployedFixture(t);
  f.put("database/migrations/0055_safe.sql", "ALTER TABLE old_table ADD COLUMN note text;");
  f.put("modules/example/migrations/0055_index.sql", "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx ON old_table (id);");
  assert.deepEqual(checkMigrations(f.dir, f.base, f.deployed), []);
  f.put("modules/example/migrations/0055_safe.sql", "CREATE TABLE other_table (id int);");
  assert.match(checkMigrations(f.dir, f.base, f.deployed).join("\n"), /two migrations are named 0055_safe/);
});

test("a missing or unrelated deployed baseline fails closed", (t) => {
  const f = deployedFixture(t);
  assert.match(checkMigrations(f.dir, f.base, "0000000000000000000000000000000000000000").join("\n"), /history base/);
  f.run("checkout", "-q", "--orphan", "unrelated");
  f.run("rm", "-q", "-r", "-f", ".");
  f.put("README.md", "unrelated history");
  f.run("add", ".");
  f.run("commit", "-qm", "unrelated history");
  const unrelated = f.run("rev-parse", "HEAD").trim();
  f.run("checkout", "-q", "--detach", f.deployed);
  assert.match(checkMigrations(f.dir, f.base, unrelated).join("\n"), /history base/);
});
