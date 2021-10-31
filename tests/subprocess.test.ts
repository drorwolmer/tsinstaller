import { spawnAsync, spawnBashAsync } from "../lib/subprocess";

import * as subprocess from "../lib/subprocess";

describe("Check subprocess", () => {
  it("Check ls", async () => {
    const { status } = await spawnAsync("ls");
    expect(status).toBe(0);
  });

  it("Check ls fails unknown dir", async () => {
    const { status } = await spawnAsync("ls", ["/sdgsdgsdgsdgsdgsdgwegwegerg"]);
    expect(status > 0).toBeTruthy();
  });

  it("Check ls fails unknown flag", async () => {
    const { status } = await spawnAsync("ls", ["--fobar=barbaz"]);
    expect(status > 0).toBeTruthy();
  });

  it("stdout captured correctly", async () => {
    const { stdout } = await spawnAsync("echo", ["foobar"]);
    expect(stdout).toBe("foobar\n");
  });

  it("stderr captured correctly", async () => {
    const { stderr, status } = await spawnAsync("ls", ["--poopoo"]);
    // Make sure the stderr contains `option`
    expect(status > 0).toBeTruthy();
    expect(stderr).toMatch(/option/i);
  });

  it("spawns a bash shell", async () => {
    const { stdout, status } = await spawnAsync("bash", ["-c", "echo foobar"]);
    expect(stdout).toBe("foobar\n");
  });

  it("spawns a bash shell with pipes", async () => {
    // Take the first 3 characters of "foobar\n"
    const { stdout, status } = await spawnAsync("bash", [
      "-c",
      "echo foobar | head -c 3",
    ]);
    expect(stdout).toBe("foo");
  });

  it("spawnBashAsync sanity", async () => {
    const { stdout, status } = await spawnBashAsync("echo foobar | head -c 3");
    expect(status).toBe(0);
    expect(stdout).toBe("foo");
  });

  it("spawnBashAsync sanity | pipe fails", async () => {
    const { stdout, status, stderr } = await spawnBashAsync(
      "echo foo | NONEXISTENT_CMD | tail -n 1"
    );
    expect(status).toBeGreaterThan(0);
    expect(stdout === "").toBeTruthy();
    expect(stderr !== "").toBeTruthy();
  });

  it("spawnBashAsync sets shell config", async () => {
    const foo = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          cmdline: "foo",
          stderr: "",
          stdout: "foo",
          status: 0,
        };
      });

    const { stdout, status } = await spawnBashAsync("echo foobar | head -c 3", {
      cwd: "/tmp/",
    });
    expect(status).toBe(0);
    expect(stdout).toBe("foo");

    expect(foo).toBeCalledWith(
      "bash",
      ["-c", "set -euo pipefail; echo foobar | head -c 3"],
      { cwd: "/tmp/" }
    );
  });

  it("spawn timeout sanity", async () => {
    try {
      await spawnBashAsync("sleep 1", {
        timeout: 500, // 500 ms should timeout before 1 sec passes
      });
      fail("should not reach here");
    } catch (e) {
      expect(e).toEqual(new Error("Subprocess Timeout"));
    }
  });
});
