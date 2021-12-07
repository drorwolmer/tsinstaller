import * as fs from "fs";

import { setEnvFile, readEnvValues } from "../lib/envFile";

const ENV_TEST_FILE = "/tmp/.env.test";

describe("EnvFile tests", () => {
  beforeEach(() => {
    if (fs.existsSync(ENV_TEST_FILE)) {
      fs.rmSync(ENV_TEST_FILE);
    }
  });
  afterEach(() => {
    if (fs.existsSync(ENV_TEST_FILE)) {
      fs.rmSync(ENV_TEST_FILE);
    }
  });

  it("Writes default values and creates file if does not exist", async () => {
    expect(fs.existsSync(ENV_TEST_FILE)).toBeFalsy();
    setEnvFile(ENV_TEST_FILE, { FOO: "bar", BAZ: "kuku" });
    expect(readEnvValues(ENV_TEST_FILE)).toEqual({ FOO: "bar", BAZ: "kuku" });

    // Make sure file was created and has correct values
    expect(fs.existsSync(ENV_TEST_FILE)).toBeTruthy();
    expect(fs.readFileSync(ENV_TEST_FILE, "utf-8")).toEqual(
      "FOO=bar\nBAZ=kuku\n"
    );
  });

  it("Appends values and does not change original values", async () => {
    fs.writeFileSync(ENV_TEST_FILE, "FOO=original_foo\n");
    expect(fs.existsSync(ENV_TEST_FILE)).toBeTruthy();

    setEnvFile(ENV_TEST_FILE, {
      FOO: "new_foo",
      BAZ: "kuku",
    });
    expect(readEnvValues(ENV_TEST_FILE)).toEqual({
      FOO: "original_foo",
      BAZ: "kuku",
    });

    // Make sure file was created and has correct values
    expect(fs.existsSync(ENV_TEST_FILE)).toBeTruthy();
    expect(fs.readFileSync(ENV_TEST_FILE, "utf-8")).toEqual(
      "FOO=original_foo\nBAZ=kuku\n"
    );
  });

  it("Generates random passwords, does not ovveride", async () => {
    expect(fs.existsSync(ENV_TEST_FILE)).toBeFalsy();
    const originalPassword = "original_password";
    const originalEncryptionKey = "original_encryption_key";

    setEnvFile(ENV_TEST_FILE, {
      MYSQL_PASSWORD: originalPassword,
      ENCRYPTION_KEY: originalEncryptionKey,
    });

    setEnvFile(ENV_TEST_FILE, {
      MYSQL_PASSWORD: "new_mysql_password",
      ENCRYPTION_KEY: "new_encryption_key",
    });

    expect(fs.readFileSync(ENV_TEST_FILE, "utf-8")).toEqual(
      `MYSQL_PASSWORD=${originalPassword}\nENCRYPTION_KEY=${originalEncryptionKey}\n`
    );
  });
});
