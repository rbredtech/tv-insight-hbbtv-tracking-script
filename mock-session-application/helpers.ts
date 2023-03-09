import fs from "fs";

function replacePlaceholders(input: string, values: Record<string, string>) {
  return input.replace(/{{(\w+)}}/g, (match, key) => {
    return values[key] || "";
  });
}

function replaceTemplatePlaceholders(template: string, values: Record<string, string>): string {
  const templateContent = fs.readFileSync(template, "utf8");

  return replacePlaceholders(templateContent, values);
}

function replaceValuePlaceholders(values: Record<string, string>, dynamicValues: Record<string, string>) {
  const result: Record<string, string> = {};

  for (const key in dynamicValues) {
    const value = dynamicValues[key];
    const regex = new RegExp(`{{${key}}}`, "g");

    for (const valueKey in values) {
      result[valueKey] = values[valueKey].replace(regex, value);
    }
    result[key] = value;
  }

  return result;
}

export { replaceTemplatePlaceholders, replaceValuePlaceholders };
