
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/skorea-submunicipalities-2018-geo.json');

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);
  
  if (!data.features || data.features.length === 0) {
    console.log("No features found.");
    process.exit(1);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  data.features.forEach(f => {
    if (f.geometry && f.geometry.coordinates) {
      // Handle MultiPolygon and Polygon
      const polygons = f.geometry.type === 'MultiPolygon' 
        ? f.geometry.coordinates 
        : [f.geometry.coordinates];
        
      polygons.forEach(poly => {
        poly.forEach(ring => {
          ring.forEach(coord => {
            const x = coord[0];
            const y = coord[1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          });
        });
      });
    }
  });

  console.log("Coordinate Bounds:");
  console.log(`Min X (Lon): ${minX}`);
  console.log(`Max X (Lon): ${maxX}`);
  console.log(`Min Y (Lat): ${minY}`);
  console.log(`Max Y (Lat): ${maxY}`);
  
  console.log("\nExpected Bounds for South Korea:");
  console.log("Lon: ~124 to ~132");
  console.log("Lat: ~33 to ~43");

} catch (error) {
  console.error("Error reading file:", error);
}
