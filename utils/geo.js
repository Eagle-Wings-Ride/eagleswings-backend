// utils/geo.js

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Basic ETA (you can upgrade later with Google Maps API)
 */
function estimateETA(distanceMeters, speedKmh = 30) {
  const hours = distanceMeters / 1000 / speedKmh;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Threshold helpers
 */
function isNear(distanceMeters, threshold = 200) {
  return distanceMeters <= threshold;
}

function isVeryNear(distanceMeters, threshold = 50) {
  return distanceMeters <= threshold;
}

module.exports = {
  getDistance,
  estimateETA,
  isNear,
  isVeryNear
};