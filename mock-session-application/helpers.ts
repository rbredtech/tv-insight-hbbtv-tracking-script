import fs from "fs";

function replacePlaceholders(input: string, values: Record<string, string>) {
  return input.replace(/{{(\w+)}}/g, (_, key) => {
    return values[key] || "";
  });
}

function replaceTemplatePlaceholders(template: string, values: Record<string, string>): string {
  const templateContent = fs.readFileSync(template, "utf8");

  return replacePlaceholders(templateContent, values);
}

function replaceValuePlaceholders(variables: Record<string, string>, dynamicValues: Record<string, string>) {
  const values = { ...variables };
  for (const key in dynamicValues) {
    const value = dynamicValues[key];
    const regex = new RegExp(`{{${key}}}`, "g");

    for (const valueKey in values) {
      values[valueKey] = values[valueKey].replace(regex, value);
    }
    values[key] = value;
  }

  return { ...values };
}

export { replaceTemplatePlaceholders, replaceValuePlaceholders };
