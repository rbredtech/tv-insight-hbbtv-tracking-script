import express from "express";
import path from "path";
import cors from "cors";
import { SERVER_PORT } from "./config";
import { TEMPLATE_VARIABLES } from "./template-variables";
import { replaceTemplatePlaceholders, replaceValuePlaceholders } from "./helpers";
import { v4 as uuidv4 } from "uuid";

const app = express();

app.use(cors());

app.get("/:channelId/tracking.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "iframe-loader.js");

  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: "9999",
    RESOLUTION: "1",
    DELIVERY: "1",
    CONSENT: "true",
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/i.html", (_req, res) => {
  res.setHeader("Content-Type", "text/html");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "iframe.html");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: "9999",
    RESOLUTION: "1",
    DELIVERY: "1",
    CONSENT: "true",
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/ra.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: "9999",
    RESOLUTION: "1",
    DELIVERY: "1",
    CONSENT: "true",
    DEVICE_ID: req.query.did ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/ra_if.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: "9999",
    RESOLUTION: "1",
    DELIVERY: "1",
    CONSENT: "true",
    DEVICE_ID: req.query.did ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
  });

  const trackingIframeTemplate = path.join(__dirname, "../", "tracking-templates", "tracking-iframe.js");
  const trackingIframeContent = replaceTemplatePlaceholders(trackingIframeTemplate, values);

  const trackingTemplate = path.join(__dirname, "../", "tracking-templates", "tracking.js");
  const trackingContent = replaceTemplatePlaceholders(trackingTemplate, values);

  res.send(trackingContent + trackingIframeContent);
});

app.get("/new.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const templatePath = path.join(__dirname, "../", "tracking-templates", "new_session.js");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: "9999",
    RESOLUTION: "1",
    DELIVERY: "1",
    CONSENT: "true",
    DEVICE_ID: req.query.did ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
    TRACKING_ENABLED: "true",
  });

  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/meta", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  res.send("").status(200);
});

app.get("/:channelId/:did/:sid/:ts/i.gif", (req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/:sid/:ts/e.gif", (req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Session mock server started on port ${SERVER_PORT}`);
});
