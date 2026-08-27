// utils/googleRoutes.js
const axios = require("axios");

async function getRouteETA(origin, destination) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn("KEY is missing");
      return null;
    }

    const url =
      "https://routes.googleapis.com/directions/v2:computeRoutes";

    const body = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },

      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },

      travelMode: "DRIVE",

      // Important: use traffic-aware routing
      routingPreference: "TRAFFIC_AWARE",

      computeAlternativeRoutes: false,
    };

    const res = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration",
      },
    });

    const route = res.data.routes?.[0];

    if (!route) {
      return null;
    }

    // Google returns duration like "1238s"
    const durationSeconds = parseFloat(
      route.duration?.replace("s", "")
    );

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
    };
  } catch (e) {
    console.warn(
      "Google Routes API failed:",
      e.response?.data || e.message
    );

    return null;
  }
}

module.exports = getRouteETA;
