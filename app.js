import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Slide,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Animated pulsing marker for high risk
const PulsingCircle = ({ center, color, ...props }) => (
  <CircleMarker
    center={center}
    pathOptions={{
      color,
      fillColor: color,
      fillOpacity: 0.7,
      className: "pulsing-marker",
    }}
    {...props}
  />
);

// Helper for color
function getColor(risk) {
  if (risk === "high") return "red";
  if (risk === "medium") return "orange";
  return "green";
}

const RiskLegend = () => (
  <Card
    sx={{
      position: "absolute", bottom: 20, left: 20, zIndex: 2000, opacity: 0.93, minWidth: 210,
      background: "linear-gradient(90deg, #f5f7fa 0%, #c3cfe2 100%)",
      boxShadow: 3
    }}
  >
    <CardContent>
      <Typography variant="caption" fontWeight={600}>
        Risk Legend
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "red", display: "inline-block", marginRight: 6, boxShadow: "0 0 6px 2px #ff000088" }} />
        <Typography variant="body2">High Risk (Red, Pulsing)</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "orange", display: "inline-block", marginRight: 6, boxShadow: "0 0 6px 2px #ffa50088" }} />
        <Typography variant="body2">Medium Risk (Orange)</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "green", display: "inline-block", marginRight: 6, boxShadow: "0 0 6px 2px #00ff0088" }} />
        <Typography variant="body2">Safe (Green)</Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="primary">
          NASA overlays: Floods (blue/red), Rain (yellow/blue)
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

function App() {
  const [zones, setZones] = useState([]);
  const [notified, setNotified] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [showFlood, setShowFlood] = useState(true);
  const [showRain, setShowRain] = useState(true);

  // Fetch risk zones
  useEffect(() => {
    fetch("http://localhost:5000/api/risk-zones")
      .then(res => res.json())
      .then(setZones);
  }, []);

  // Early warning notification if in high risk
  useEffect(() => {
    if (zones.length && !notified) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        zones.forEach(zone => {
          const dist = Math.sqrt(
            Math.pow(zone.lat - latitude, 2) + Math.pow(zone.lng - longitude, 2)
          );
          if (dist < 0.3 && zone.risk === "high") {
            setSnackbar(true);
            setNotified(true);
            fetch("http://localhost:5000/api/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: "demoUser", message: "High waterlogging risk near you!" }),
            });
          }
        });
      });
    }
  }, [zones, notified]);

  // Today's date for GIBS overlays (YYYY-MM-DD)
  const gibsDate = (new Date()).toISOString().split("T")[0];

  // Responsive map height
  const mapHeight = "calc(100vh - 64px)";

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(120deg,#b2fefa,#e0c3fc)", pb: 2 }}>
      <AppBar position="static" sx={{ background: "linear-gradient(90deg,#434343 0%,#262626 100%)", boxShadow: 4 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" sx={{ mr: 1 }}>
            <MapIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 1, fontWeight: 600 }}>
            Waterlogging Risk App
          </Typography>
          <FormControlLabel
            control={<Switch checked={showFlood} onChange={() => setShowFlood(v => !v)} color="primary" />}
            label={<span style={{ fontSize: 13 }}>Flood</span>}
            sx={{ ml: 2, mr: 0 }}
          />
          <FormControlLabel
            control={<Switch checked={showRain} onChange={() => setShowRain(v => !v)} color="primary" />}
            label={<span style={{ fontSize: 13 }}>Rain</span>}
            sx={{ ml: 1 }}
          />
        </Toolbar>
      </AppBar>

      <Box sx={{ position: "relative" }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: mapHeight, width: "100%" }}
          scrollWheelZoom={true}
        >
          {/* NASA GIBS overlays */}
          {showFlood && (
            <TileLayer
              url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Flood/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`}
              attribution="Flood Map: NASA EOSDIS GIBS"
              opacity={0.75}
            />
          )}
          {showRain && (
            <TileLayer
              url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`}
              attribution="Precipitation: NASA EOSDIS GIBS"
              opacity={0.5}
            />
          )}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Animated and colored risk markers */}
          {zones.map(zone => {
            const color = getColor(zone.risk);
            if (zone.risk === "high") {
              return (
                <PulsingCircle
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={28}
                  color={color}
                >
                  <Popup>
                    <b>High Risk!</b>
                    <br />
                    Waterlogging likely here.
                  </Popup>
                </PulsingCircle>
              );
            }
            return (
              <CircleMarker
                key={zone.id}
                center={[zone.lat, zone.lng]}
                radius={18}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.6,
                  weight: 3,
                }}
              >
                <Popup>
                  <b>{zone.risk.charAt(0).toUpperCase() + zone.risk.slice(1)} Risk</b>
                  <br />
                  {zone.risk === "medium" && "Stay alert for waterlogging."}
                  {zone.risk === "safe" && "No waterlogging risk detected."}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        <RiskLegend />
      </Box>

      {/* Snackbar notification for early warning */}
      <Snackbar
        open={snackbar}
        autoHideDuration={7000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={Slide}
      >
        <Alert severity="warning" sx={{
          fontWeight: "bold",
          fontSize: 18,
          background: "linear-gradient(90deg,#ffecd2 0%,#fcb69f 100%)",
          color: "#d32f2f"
        }}>
          ⚠️ Early Warning: High waterlogging risk detected in your area!
        </Alert>
      </Snackbar>
      <Box sx={{ textAlign: "center", mt: 2, color: "#333", fontWeight: 500, fontSize: 15 }}>
        <span>Data overlays: <span style={{ color: "#3f51b5" }}>NASA GIBS</span> &bull; <span style={{ color: "#388e3c" }}>OpenStreetMap</span></span>
      </Box>
      {/* Pulsing marker CSS */}
      <style>
        {`
        .pulsing-marker {
          animation: pulse 1.2s infinite;
        }
        @keyframes pulse {
          0% {
            stroke-width: 5;
            stroke-opacity: 1;
            r: 16;
          }
          50% {
            stroke-width: 10;
            stroke-opacity: 0.5;
            r: 28;
          }
          100% {
            stroke-width: 5;
            stroke-opacity: 1;
            r: 16;
          }
        }
        `}
      </style>
    </Box>
  );
}

export default App;
