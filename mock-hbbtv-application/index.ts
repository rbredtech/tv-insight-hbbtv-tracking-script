import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "application/vnd.hbbtv.xhtml+xml");
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/favicon.ico", (_req, res) => {
  res.setHeader("Content-Type", "image/x-icon");
  res.setHeader("Cache-Control", "max-age=86400");
  res.sendFile(path.join(__dirname, "favicon.ico"));
});

// Start the server
app.listen(8080, () => {
  console.log("HbbTV application mock server started on port 8080");
});
