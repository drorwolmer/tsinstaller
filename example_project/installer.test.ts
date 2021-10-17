import { fooStep } from "./installer";

describe("foo", () => {
  it("test fooStep ", async () => {
    const res = await fooStep();
    console.error(res);
  });
});
