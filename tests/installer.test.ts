import * as path from "path";
import { getAllDockerImages } from "../lib/compile";
import * as subprocess from "../lib/subprocess";

const DARKSITE_DIR = path.join(__dirname, "../../");

describe("Installer tests", () => {
  it("gets correct docker images darksite", async () => {
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

    const allImages = await getAllDockerImages(DARKSITE_DIR);
    expect(allImages).toEqual(["foo/bar:baz", "nginx:0.1.2"]);
    expect(spawnMock).toBeCalled();
  });
});
