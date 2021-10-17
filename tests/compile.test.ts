import * as fs from "fs";
import * as crypto from "crypto";
import { SelfExtractingInstaller, getAllDockerImages } from "../lib/compile";
import { getEntry } from "../lib/utils";
import { spawnBashSelfExtractAsync } from "../lib/subprocess";
import * as subprocess from "../lib/subprocess";

const baseFile = "/tmp/base";
const outputFile = "/tmp/compile_output";

const cleanupFiles = () => {
  fs.rmSync(baseFile, { force: true });
  fs.rmSync("/tmp/a", { force: true });
  fs.rmSync("/tmp/b", { force: true });
  fs.rmSync(outputFile, { force: true });
};
describe("Compiler tests", () => {
  beforeEach(cleanupFiles);
  afterEach(cleanupFiles);

  it("Compiler sanity", async () => {
    // ------------------------------------------------------------------------
    // Create a new installer with two files, containg random bytes
    // ------------------------------------------------------------------------

    fs.writeFileSync(baseFile, "HELLO WORLD");
    fs.writeFileSync("/tmp/a", crypto.randomBytes(420));
    fs.writeFileSync("/tmp/b", "HELLO BINARY");

    const installer = new SelfExtractingInstaller(baseFile, outputFile);
    await installer.addFile("/tmp/a", "420 bytes");
    await installer.addFile("/tmp/b", "message");
    installer.compile();
    expect(fs.existsSync(outputFile)).toBeTruthy();

    // ------------------------------------------------------------------------
    // Now that we compiled the installer, lets see if we can read it
    // ------------------------------------------------------------------------

    expect(getEntry("420 bytes", outputFile)).toEqual({
      name: "420 bytes",
      size: 420,
      offset: 12,
    });

    expect(getEntry("message", outputFile)).toEqual({
      name: "message",
      size: 12,
      offset: 432,
    });

    const res1 = await spawnBashSelfExtractAsync(
      "wc -c",
      "420 bytes",
      undefined,
      outputFile
    );
    expect(res1.status).toEqual(0);
    expect(res1.stdout).toMatch(/420/);

    const res2 = await spawnBashSelfExtractAsync(
      "cat",
      "message",
      undefined,
      outputFile
    );
    expect(res2.status).toEqual(0);
    expect(res2.stdout).toEqual("HELLO BINARY");

    const res3 = await spawnBashSelfExtractAsync(
      "head -c 3 $FILE$ | tail -c 2",
      "message",
      undefined,
      outputFile
    );
    expect(res3.status).toEqual(0);
    expect(res3.stdout).toEqual("EL");
  });

  it("gets correct docker images [single docker-compose.yml file]", async () => {
    const spawnMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          status: 0,
          stdout: `
        services:
          foo:
            image: foo/bar:baz
          bar:
            image: foo/bar:baz
          nginx:
            image: nginx:0.1.2
        `,
          cmdline: "",
          stderr: "",
        };
      });

    const allImages = await getAllDockerImages(__dirname);

    expect(allImages).toEqual(["foo/bar:baz", "nginx:0.1.2"]);
    expect(spawnMock).toBeCalledWith("docker-compose", ["config"], {
      cwd: __dirname,
    });
  });

  it("gets correct docker images [mutliple docker-compose.yml file]", async () => {
    const spawnMock = jest
      .spyOn(subprocess, "spawnAsync")
      .mockImplementation(async () => {
        return {
          status: 0,
          stdout: `
        services:
          foo:
            image: foo/bar:baz
          bar:
            image: foo/bar:baz
          nginx:
            image: nginx:0.1.2
          traefil:
            image: traefik:4.2.0
        `,
          cmdline: "",
          stderr: "",
        };
      });

    const allImages = await getAllDockerImages(__dirname, [
      "docker-compose.yml",
      "docker-compose.prod.yml",
    ]);

    expect(allImages).toEqual(["foo/bar:baz", "nginx:0.1.2", "traefik:4.2.0"]);
    expect(spawnMock).toBeCalledWith(
      "docker-compose",
      ["-f docker-compose.yml", "-f docker-compose.prod.yml", "config"],
      {
        cwd: __dirname,
      }
    );
  });
});
