import express from "express";
import path from "path";

const app = express();

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "application/vnd.hbbtv.xhtml+xml");
  res.sendFile(path.join(__dirname, "html", "index.html"));
});

app.get("/favicon.ico", (req, res) => {
  res.setHeader("Content-Type", "image/x-icon");
  res.setHeader("Cache-Control", "max-age=86400");
  res.sendFile(path.join(__dirname, "favicon.ico"));
});

// Start the server
app.listen(8080, () => {
  console.log("HbbTV application mock server started on port 8080");
});
