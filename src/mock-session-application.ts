import express from "express";
import path from "path";
import { SERVER_PORT } from "./config";
import { TEMPLATE_VARIABLES } from "./template-variables";
import { replacePlaceholders } from "./helpers";

const app = express();

app.get("/:channelId/tracking.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "iframe-loader.js");
  const content = replacePlaceholders(templatePath, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/i.html", (_req, res) => {
  res.setHeader("Content-Type", "text/html");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "iframe.html");
  const content = replacePlaceholders(templatePath, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/ra.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const content = replacePlaceholders(templatePath, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/:did/:sid/:ts/i.png", (_req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Session mock server started on port ${SERVER_PORT}`);
});
