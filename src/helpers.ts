import fs from "fs";

function replacePlaceholders(template: string, values: Record<string, string>): string {
  let output = "";
  const data = fs.readFileSync(template, "utf8");
  output = data.replace(/{{(\w+)}}/g, (match, key) => {
    return values[key] || "";
  });

  return output;
}

export { replacePlaceholders };
