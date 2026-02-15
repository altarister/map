import fs from 'fs';
import osmtogeojson from 'osmtogeojson';
import https from 'https';

const QUERY = `
[out:json][timeout:60];
area(id:3600307756)->.searchArea;
(
  way["highway"~"motorway"](area.searchArea);
  way["highway"~"trunk"](area.searchArea);
);
out geom;
`;

// "motorway" = Expressways (Gyeongbu, Capital Region First Ring, etc.)
// "trunk" = National Heavy Roads (Useful for context)

const OUTPUT_file = 'src/assets/korea-roads-raw.json';
const FINAL_FILE = 'src/assets/korea-roads.json';

// Ensure directory exists
if (!fs.existsSync('src/assets')) {
    fs.mkdirSync('src/assets', { recursive: true });
}

console.log("Fetching road data from Overpass API...");

const req = https.request('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded' // Overpass expects raw query body
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(`Received raw data: ${json.elements?.length} elements.`);

            console.log("Converting to GeoJSON...");
            const geojson = osmtogeojson(json);

            // Simplify logic (Basic clean up)
            // For now, save as is. Maybe filter properties to reduce size.
            const features = geojson.features.map(f => ({
                type: f.type,
                geometry: f.geometry,
                properties: {
                    highway: f.properties.highway,
                    name: f.properties.name,
                    ref: f.properties.ref
                }
            }));

            const finalGeoJSON = {
                type: "FeatureCollection",
                features: features
            };

            fs.writeFileSync(FINAL_FILE, JSON.stringify(finalGeoJSON));
            console.log(`Saved to ${FINAL_FILE} (${features.length} features)`);

        } catch (e) {
            console.error("Error parsing/converting:", e);
            console.log("Raw Data dump (first 500 chars):", data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error("Request error:", e);
});

req.write(`data=${encodeURIComponent(QUERY)}`);
req.end();
