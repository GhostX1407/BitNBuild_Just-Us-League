// Vadodara Geolocation Utilities

export const VADODARA_CENTER: [number, number] = [22.3072, 73.1812];

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function etaMinutes(distKm: number, speedKmh = 40): number {
  if (speedKmh <= 0) return 999;
  const minutes = (distKm / speedKmh) * 60;
  return Math.max(1, Math.round(minutes));
}

// Interpolate position between [lat1, lng1] and [lat2, lng2] by fraction t (0 to 1)
export function interpolateGeo(
  start: [number, number],
  end: [number, number],
  fraction: number
): [number, number] {
  const f = Math.max(0, Math.min(1, fraction));
  return [
    Number((start[0] + (end[0] - start[0]) * f).toFixed(6)),
    Number((start[1] + (end[1] - start[1]) * f).toFixed(6)),
  ];
}
