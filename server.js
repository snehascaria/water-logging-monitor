const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// List of locations to check
const locations = [
  { id: 1, city: "Delhi", lat: 28.6139, lon: 77.2090 },
  { id: 2, city: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { id: 3, city: "Chennai", lat: 13.0827, lon: 80.2707 }
];

app.get('/api/risk-zones', async (req, res) => {
  const results = [];
  for (const loc of locations) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      // Simple logic: rainfall > 10mm = high, 1-10 = medium, else safe
      let risk = "safe";
      const rain = data.rain?.["1h"] || 0;
      if (rain > 10) risk = "high";
      else if (rain > 1) risk = "medium";
      results.push({ ...loc, risk, rain });
    } catch (e) {
      results.push({ ...loc, risk: "unknown", rain: null });
    }
  }
  res.json(results);
});

// Simulated notification as before
app.post('/api/notify', (req, res) => {
  const { user, message } = req.body;
  console.log(`Notify ${user}: ${message}`);
  res.json({ success: true });
});

app.listen(5000, () => console.log('Backend running on port 5000'));
