import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { getMetadataObject } from "../lib/cloudMetadata";
const axiosMock = new MockAdapter(axios);

export type foo = {
  bar: string;
  baz: string;
};

const userData = {
  bar: "connector",
  baz: "netapp",
};

describe("cloud metadata tests", () => {
  beforeEach(async () => {});
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("get user data - no metadata", async () => {
    const result = await getMetadataObject<foo>();
    expect(result).toEqual(undefined);
  });

  it("get user data - google", async () => {
    const buff = Buffer.from(JSON.stringify(userData), "utf-8");
    const base64data = buff.toString("base64");
    axiosMock
      .onGet(
        `http://metadata.google.internal/computeMetadata/v1/instance/attributes/customData`
      )
      .reply(200, base64data);

    const result = await getMetadataObject<foo>();
    expect(result).toEqual(userData);
  });

  it("get user data - aws", async () => {
    axiosMock
      .onPut(`http://169.254.169.254/latest/api/token`)
      .reply(200, "token");
    axiosMock
      .onGet(`http://169.254.169.254/latest/user-data`)
      .reply(200, userData);

    const result = await getMetadataObject<foo>();
    expect(result).toEqual(userData);
  });
});
