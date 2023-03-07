import express from "express";
import path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "application/vnd.hbbtv.xhtml+xml");
  res.sendFile(path.join(__dirname, "html", "index.html"));
});

// Start the server
app.listen(8080, () => {
  console.log("HbbTV application mock server started on port 8080");
});
