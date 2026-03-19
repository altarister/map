const fs = require('fs');
const turfHelpers = require('@turf/helpers');
const turfUnion = require('@turf/union').default || require('@turf/union');

const d2 = JSON.parse(fs.readFileSync('public/data/skorea-municipalities-2018-geo.json', 'utf8'));

const nameMap = new Map();
const level3Data = JSON.parse(fs.readFileSync('public/map/merged_map.geojson', 'utf8'));
level3Data.features.forEach(f => {
    let name = f.properties.SIG_KOR_NM;
    if (name) name = name.replace(/\s+/g, '');
    if (name && f.properties.code && f.properties.code.length >= 5) {
        nameMap.set(name, f.properties.code.substring(0, 5));
    }
});

const filteredCity = d2.features.filter(f => f.properties.code.startsWith('31'));
filteredCity.forEach(f => {
    const name = f.properties.name ? f.properties.name.replace(/\s+/g, '') : undefined;
    if (name && nameMap.has(name)) {
        f.properties.code = nameMap.get(name);
    }
});

const parentGroups = new Map();
filteredCity.forEach(f => {
    const isGu = f.properties.code.length === 5 && !f.properties.code.endsWith('0');
    if (isGu) {
        const parentCode = f.properties.code.substring(0, 4) + '0';
        if (!parentGroups.has(parentCode)) {
            parentGroups.set(parentCode, { geometries: [] });
        }
        parentGroups.get(parentCode).geometries.push(f);
    }
});

// Create Yongin's Union
const yonginGeoms = parentGroups.get('41460').geometries;
const featureCollection = turfHelpers.featureCollection(yonginGeoms);
const merged = turfUnion(featureCollection);

console.log('Merged Geometry Type:', merged.geometry.type);
let exteriorRings = 0;
let interiorRings = 0;

if (merged.geometry.type === 'Polygon') {
    exteriorRings = 1;
    interiorRings = merged.geometry.coordinates.length - 1;
} else if (merged.geometry.type === 'MultiPolygon') {
    exteriorRings = merged.geometry.coordinates.length;
    merged.geometry.coordinates.forEach(poly => {
        interiorRings += (poly.length - 1);
    });
}

console.log(`Exterior Rings (Main parts): ${exteriorRings}`);
console.log(`Interior Rings (Holes/Lines): ${interiorRings}`);
if (interiorRings > 0) {
    console.log("!!! BUG IDENTIFIED: turf.union left internal lines (holes) inside the merged city !!!");
    console.log("When Canvas/SVG strokes a polygon with interior rings, it draws the lines separating the districts!");
}
