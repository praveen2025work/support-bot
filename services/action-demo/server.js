const express = require("express");
const cors = require("cors");
const path = require("path");

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors({ origin: ["http://localhost:3001", "http://localhost:3000"] }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[action-demo] External Action Center running on http://localhost:${PORT}`);
});
