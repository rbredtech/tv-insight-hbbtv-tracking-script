import { replaceValuePlaceholders } from "./helpers";

describe("replaceValuePlaceholders", () => {
  it("should replace placeholder values", () => {
    const result = replaceValuePlaceholders({ a: "{{DYNAMIC}}" }, { DYNAMIC: "dynamicValue" });
    expect(result.a).toEqual("dynamicValue");
  });

  it("should extend collection with dynamic values", () => {
    const result = replaceValuePlaceholders({ a: "{{DYNAMIC}}" }, { DYNAMIC: "dynamicValue" });
    expect(result.DYNAMIC).toEqual("dynamicValue");
  });

  it("should replace partial matches", () => {
    const result = replaceValuePlaceholders({ a: "{{DYNAMIC}}plus" }, { DYNAMIC: "dynamicValue" });
    expect(result.a).toEqual("dynamicValueplus");
  });
});
