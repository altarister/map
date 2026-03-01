import fs from 'fs';
import * as topojson from 'topojson-client';

const INPUT_TOPOJSON = 'public/data/skorea-municipalities-2018-topo.json';
const OUTPUT_GEOJSON = 'public/data/gyeonggi_level1_merged.geojson';

// Map of names for merged cities (Fallback map if needed)
const MERGED_CITY_NAMES = {
    '31010': '수원시',
    '31020': '성남시',
    '31040': '안양시',
    '31050': '부천시',
    '31090': '안산시',
    '31100': '고양시',
    '31190': '용인시'
};

function main() {
    console.log('Loading topojson...');
    const rawData = fs.readFileSync(INPUT_TOPOJSON, 'utf-8');
    const topology = JSON.parse(rawData);
    const objects = topology.objects.skorea_municipalities_2018_geo;

    console.log(`Total geometries found: ${objects.geometries.length}`);

    // 1. Filter Gyeonggi-do (Code starts with 31)
    const gyeonggiGeometries = objects.geometries.filter(g => g.properties.code && g.properties.code.startsWith('31'));
    console.log(`Filtered Gyeonggi-do geometries: ${gyeonggiGeometries.length}`);

    // 2. Group by Parent City Code
    // General rule: The first 4 digits of the code identify the city. If it's a Gu, the 5th digit is > 0.
    // Exception handling or simple mapping:
    const grouped = new Map();

    for (const geom of gyeonggiGeometries) {
        const code = geom.properties.code; // e.g., '31011' (Suwon-si Jangan-gu)
        const name = geom.properties.name;

        let parentCode = code;
        let parentName = name;

        // Check if it's a Gu
        if (name.includes('시') && name.endsWith('구')) {
            // It's a Gu under a City. Use the city prefix + '0'
            parentCode = code.substring(0, 4) + '0';
            const cityPart = name.split(' ')[0] || name.split('시')[0] + '시';
            parentName = MERGED_CITY_NAMES[parentCode] || cityPart;
        }

        if (!grouped.has(parentCode)) {
            grouped.set(parentCode, {
                name: parentName,
                code: parentCode,
                geometries: []
            });
        }

        grouped.get(parentCode).geometries.push(geom);
    }

    console.log(`Grouped into ${grouped.size} parent cities.`);

    // 3. Merge geometries for each parent city
    const mergedFeatures = [];

    for (const [parentCode, group] of grouped.entries()) {
        if (group.geometries.length === 1) {
            // No merging needed, just convert to GeoJSON feature
            const feature = topojson.feature(topology, group.geometries[0]);
            feature.properties = { code: group.code, name: group.name };
            mergedFeatures.push(feature);
        } else {
            // Merge multiple Gu into one City
            const mergedGeometry = topojson.merge(topology, group.geometries);
            const feature = {
                type: 'Feature',
                geometry: mergedGeometry,
                properties: {
                    code: group.code,
                    name: group.name,
                    _isMergedCity: true,
                    _childCount: group.geometries.length
                }
            };
            mergedFeatures.push(feature);
            console.log(`Merged ${group.geometries.length} regions into ${group.name} (${group.code})`);
        }
    }

    // 4. Output as GeoJSON FeatureCollection
    const featureCollection = {
        type: 'FeatureCollection',
        features: mergedFeatures
    };

    fs.writeFileSync(OUTPUT_GEOJSON, JSON.stringify(featureCollection, null, 2));
    console.log(`Successfully wrote ${mergedFeatures.length} features to ${OUTPUT_GEOJSON}`);
}

main();
