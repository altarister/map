import fs from 'fs';
import path from 'path';
import { featureCollection } from '@turf/helpers';
import union from '@turf/union';
import rewind from '@turf/rewind';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../public/download/skorea-municipalities-2018-geo.json');
const OUTPUT_FILE = path.join(__dirname, '../public/mapData/korea-municipalities-merged.geojson');

function main() {
  console.log('Loading nationwide municipalities...');
  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  const geojson = JSON.parse(rawData);

  console.log(`Total original features: ${geojson.features.length}`);

  const grouped = new Map();

  // 1. 그룹핑 (Grouping by Parent City Name)
  for (const feature of geojson.features) {
    const code = feature.properties.code;
    const name = feature.properties.name;

    let parentCode = code;
    let parentName = name;

    // "수원시장안구", "용인시처인구", "포항시남구" 등 매칭
    const match = name.match(/^(.*?시)[\w\u3131-\uD79D]*구$/);
    if (match) {
      parentName = match[1]; // e.g., "수원시"
      // 보통 부모 시 코드는 자식 구 코드의 앞 4자리 + '0' 임 (예: 31011 -> 31010)
      parentCode = code.substring(0, 4) + '0';
    }

    if (!grouped.has(parentCode)) {
      grouped.set(parentCode, {
        name: parentName,
        code: parentCode,
        features: []
      });
    }
    grouped.get(parentCode).features.push(feature);
  }

  console.log(`Grouped into ${grouped.size} parent regions (Cities/Counties/Districts).`);

  // 2. 병합 (Merging)
  const mergedFeatures = [];
  let mergedCount = 0;

  for (const [parentCode, group] of grouped.entries()) {
    if (group.features.length === 1) {
      // 병합 필요 없음 (일반 시, 군, 자치구)
      mergedFeatures.push(group.features[0]);
    } else {
      // 일반구가 있는 대도시 -> turf.union 병합
      console.log(`Merging ${group.features.length} districts into ${group.name} (${group.code})...`);
      try {
        const collection = featureCollection(group.features);
        const merged = union(collection);
        if (merged) {
          // 좌표 감김(Winding order) 정규화
          const rewound = rewind(merged, { reverse: true });
          rewound.properties = {
            code: group.code,
            name: group.name,
            base_year: group.features[0].properties.base_year,
            _isMergedCity: true,
            _childCount: group.features.length
          };
          mergedFeatures.push(rewound);
          mergedCount++;
        }
      } catch (e) {
        console.error(`Failed to merge ${group.name}:`, e);
      }
    }
  }

  // 3. 파일 저장 (Output)
  const outputCollection = {
    type: 'FeatureCollection',
    features: mergedFeatures
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputCollection));
  console.log(`\nSuccessfully wrote ${mergedFeatures.length} features to ${OUTPUT_FILE}`);
  console.log(`(Reduced ${geojson.features.length} -> ${mergedFeatures.length} by merging ${mergedCount} large cities)`);
}

main();
