import fs from 'fs';
import { geoCentroid, geoDistance } from 'd3-geo';

const data = JSON.parse(fs.readFileSync('public/data/skorea-submunicipalities-2018-geo.json', 'utf8'));

const jindong = data.features.find(f => f.properties.name.includes('진동면'));
const tanhyeon = data.features.find(f => f.properties.name.includes('탄현면'));

console.log('Jindong:', jindong ? jindong.properties.name : 'Not found');
console.log('Tanhyeon:', tanhyeon ? tanhyeon.properties.name : 'Not found');

if (jindong && tanhyeon) {
  const centroid1 = geoCentroid(jindong);
  const centroid2 = geoCentroid(tanhyeon);

  // d3.geoDistance returns angular distance in radians.
  // One radian on a great circle of Earth is approx 6371 km.
  const distanceRadians = geoDistance(centroid1, centroid2);
  const distanceKm = distanceRadians * 6371;

  console.log(`Distance: ${distanceKm.toFixed(2)} km`);
}
