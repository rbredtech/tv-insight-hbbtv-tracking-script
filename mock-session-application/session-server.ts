import express from "express";
import path from "path";
import cors from "cors";
import { SERVER_PORT, TEMPLATES_DIR } from "./config";
import { TEMPLATE_VARIABLES } from "./template-variables";
import { replaceTemplatePlaceholders, replaceValuePlaceholders } from "./helpers";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());

let CONSENT = "true";

app.get("/puppeteer.html", (req, res) => {
  if (req.query.c) {
    CONSENT = req.query.c.toString();
  }

  res.setHeader("Content-Type", "text/html");

  const templatePath = path.join(__dirname, "./", "puppeteer.html");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.query.cid ? req.query.cid.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    CONSENT,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/:channelId/tracking.js", (req, res) => {
  if (req.query.c) {
    CONSENT = req.query.c.toString();
  }

  res.setHeader("Content-Type", "application/javascript");

  const templatePath = path.join(__dirname, "../", TEMPLATES_DIR, "iframe-loader.js");

  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.params.channelId ? req.params.channelId.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    CONSENT,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/i.html", (req, res) => {
  res.setHeader("Content-Type", "text/html");

  const templatePath = path.join(__dirname, "../", TEMPLATES_DIR, "iframe.html");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.query.cid ? req.query.cid.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    CONSENT,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/ra.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const templatePath = path.join(__dirname, "../", TEMPLATES_DIR, "tracking.js");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.query.cid ? req.query.cid.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    DEVICE_ID: req.query.did ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
    CONSENT,
  });
  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/ra_if.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.query.cid ? req.query.cid.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    DEVICE_ID: req.query.did ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
    CONSENT,
  });

  const trackingIframeTemplate = path.join(__dirname, "../", TEMPLATES_DIR, "tracking-iframe.js");
  const trackingIframeContent = replaceTemplatePlaceholders(trackingIframeTemplate, values);

  const trackingTemplate = path.join(__dirname, "../", TEMPLATES_DIR, "tracking.js");
  const trackingContent = replaceTemplatePlaceholders(trackingTemplate, values);

  res.send(trackingContent + trackingIframeContent);
});

app.get("/new.js", (req, res) => {
  res.setHeader("Content-Type", "text/javascript");

  const templatePath = path.join(__dirname, "../", TEMPLATES_DIR, "new_session.js");
  const values = replaceValuePlaceholders(TEMPLATE_VARIABLES, {
    CID: req.query.cid ? req.query.cid.toString() : "9999",
    RESOLUTION: req.query.r ? req.query.r.toString() : "1",
    DELIVERY: req.query.d ? req.query.d.toString() : "1",
    INITIALIZE_SUSPENDED: req.query.suspended ? req.query.suspended.toString() : "false",
    CB: req.query.cb ? req.query.cb.toString() : "0",
    DEVICE_ID: req.query.did && CONSENT === "true" ? req.query.did.toString() : uuidv4(),
    SESSION_ID: uuidv4(),
    TARGET_SESSION_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_URL: `http://localhost:${SERVER_PORT}`,
    SERVER_TS: Date.now().toString(),
    TRACKING_ENABLED: "true",
    CONSENT,
  });

  const content = replaceTemplatePlaceholders(templatePath, values);

  res.send(content);
});

app.get("/meta", (_req, res) => {
  res.setHeader("Content-Type", "text/javascript");
  res.send("").status(200);
});

app.get("/meta.gif", (_req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/:channelId/:did/:sid/:ts/i.gif", (_req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/:sid/:ts/e.gif", (_req, res) => {
  res.sendFile(path.join(__dirname, "pixel.gif"));
});

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Session mock server started on port ${SERVER_PORT}`);
});
