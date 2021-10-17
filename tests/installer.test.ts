import * as installer from "../lib/installer";
import { InstallerStepFn } from "../lib/types";

const succeedingStep: InstallerStepFn = async () => {
  return {
    success: true,
    data: { foo: "bar" },
    successDebug: "VERY GOOD",
    successText: "OK",
  };
};

const failingStep: InstallerStepFn = async () => {
  return {
    success: false,
  };
};

describe("Installer tests", () => {
  it("Shoud succeed if all steps succeed", async () => {
    await installer.startInstaller([
      {
        f: succeedingStep,
        title: "Succeeding Step",
      },
    ]);
  });

  it("fails if step throws exception", async () => {
    const exitMock = jest
      .spyOn(process, "exit")
      .mockImplementation((number) => {
        throw new Error("process.exit: " + number);
      });

    const failingStepMock = jest.fn().mockImplementation(async () => {
      throw new Error("OOPSY");
    });

    try {
      await installer.startInstaller([
        {
          f: failingStepMock,
          title: "Failing Step",
        },
      ]);
      fail("SHOULD NOT REACH HERE");
    } catch (error) {}
  });

  it("Shoud not continue to second step if first one fails", async () => {
    const exitMock = jest
      .spyOn(process, "exit")
      .mockImplementation((number) => {
        throw new Error("process.exit: " + number);
      });

    const secondStepMocj = jest.fn();

    try {
      await installer.startInstaller([
        {
          f: failingStep,
          title: "Failing Step",
        },
        {
          f: secondStepMocj,
          title: "Succeeding Step",
        },
      ]);
      fail("SHOULD NOT REACH HERE");
    } catch (error) {}

    expect(secondStepMocj).toBeCalledTimes(0);
  });
});
