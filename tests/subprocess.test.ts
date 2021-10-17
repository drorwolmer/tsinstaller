import * as path from "path";
import * as fs from "fs";
import {
  spawnAsync,
  spawnBashAsync,
  spawnBashSelfExtractAsync,
} from "../lib/subprocess";

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
    expect(stdout).toBe("foo");
  });

  it("spawn timeout sanity", async () => {
    let error;
    try {
      await spawnBashAsync("sleep 1", {
        timeout: 500, // 500 ms should timeout before 1 sec passes
      });
    } catch (e) {
      error = e;
    }
    expect(error).toEqual(new Error("Subprocess Timeout"));
  });
});
