import express from "express";
import path from "path";
import cors from "cors";
import { SERVER_PORT } from "./config";
import { TEMPLATE_VARIABLES } from "./template-variables";
import { replacePlaceholders } from "./helpers";

const app = express();

app.use(cors());

app.get("/:channelId/tracking.js", (req, res) => {
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

app.get("/ra.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const content = replacePlaceholders(templatePath, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/ra_if.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const trackingIframeTemplate = path.join(__dirname, "../", "tracking-templates", "tracking-iframe.js");
  const trackingIframeContent = replacePlaceholders(trackingIframeTemplate, TEMPLATE_VARIABLES);

  const trackingTemplate = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const trackingContent = replacePlaceholders(trackingTemplate, TEMPLATE_VARIABLES);

  res.send(trackingContent + trackingIframeContent);
});

app.get("/meta", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  res.send("").status(200);
});

app.get("/:did/:sid/:ts/i.png", (req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Session mock server started on port ${SERVER_PORT}`);
});
