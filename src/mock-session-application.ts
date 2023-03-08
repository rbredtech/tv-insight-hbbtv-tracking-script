import express, { static as expressStatic } from "express";
import path from "path";
import { SERVER_PORT } from "./config";
import { TEMPLATE_VARIABLES } from "./template-variables";
import { replacePlaceholders } from "./helpers";

const app = express();

app.use(expressStatic(path.join(__dirname, "public")));

app.get("/:channelId/tracking.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const template = path.join(__dirname, "../", "tracking-templates", "iframe-loader.js");
  const content = replacePlaceholders(template, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/i.html", (req, res) => {
  res.setHeader("Content-Type", "text/html");

  const template = path.join(__dirname, "../", "tracking-templates", "iframe.html");
  const content = replacePlaceholders(template, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/ra.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const template = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const content = replacePlaceholders(template, TEMPLATE_VARIABLES);

  res.send(content);
});

app.get("/:did/:sid/:ts/i.png", (req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Session mock server started on port ${SERVER_PORT}`);
});
