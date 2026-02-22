const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Config endpoint – exposes public frontend config.
// Set GOOGLE_MAPS_API_KEY env var in production to override the default key.
app.get("/api/config", (req, res) => {
  res.json({
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyB02c_eleXuhHWdSMJzqk9mESbXn_PT2zc"
  });
});

// Fallback: send index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("Roll 'n Connect running at http://localhost:" + PORT);
});
