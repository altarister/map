import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTEL_DIR = path.join(__dirname, 'data/intel');
const RAW_MAP_PATH = path.join(__dirname, '../public/temp/gyeonggi_bupjeongdong.geojson');
const OUTPUT_MAP_PATH = path.join(__dirname, '../public/map/merged_map.geojson');

async function run() {
  console.log('🚀 [GeoJSON-Intel Build] 데이터 매핑 스크립트 시작');

  const intelDB = {};
  
  try {
    const intelFiles = await fs.readdir(INTEL_DIR);
    for (const file of intelFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(INTEL_DIR, file);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        Object.assign(intelDB, data);
        console.log(`✅ Loaded Intel Data: ${file} (${Object.keys(data).length} regions)`);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('⚠️ 인텔 데이터 디렉터리가 없습니다. 빈 폴더를 생성합니다.');
      await fs.mkdir(INTEL_DIR, { recursive: true });
    } else {
      console.error('❌ Failed to read intel directory:', err.message);
    }
  }

  let rawTargetMapPath = RAW_MAP_PATH;
  try {
    await fs.access(rawTargetMapPath);
  } catch {
    // 만약 temp/gyeonggi_bupjeongdong.geojson 이 없다면 다른 맵 참조 시도
    rawTargetMapPath = path.join(__dirname, '../public/map/level1.geojson');
    console.log(`⚠️ 기본 맵을 찾을 수 없어 대체 맵(${rawTargetMapPath})을 시도합니다.`);
  }

  try {
    const geoJsonRaw = await fs.readFile(rawTargetMapPath, 'utf8');
    const geoJson = JSON.parse(geoJsonRaw);

    let matchCount = 0;
    
    geoJson.features = geoJson.features.map(feature => {
      const code = feature.properties.code;
      if (!code) return feature;
      
      const prefix8 = code.substring(0, 8);
      const prefix7 = code.substring(0, 7);
      const prefix6 = code.substring(0, 6);

      let targetIntel = null;
      if (intelDB[code]) targetIntel = intelDB[code];
      else if (intelDB[prefix8]) targetIntel = intelDB[prefix8];
      else if (intelDB[prefix7]) targetIntel = intelDB[prefix7];
      else if (intelDB[prefix6]) targetIntel = intelDB[prefix6];

      if (targetIntel) {
        feature.properties.intel = targetIntel;
        matchCount++;
      } else {
        if (feature.properties.intel) delete feature.properties.intel;
      }

      return feature;
    });

    // public/map 폴더가 없을 수도 있으니 미리 생성
    await fs.mkdir(path.dirname(OUTPUT_MAP_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_MAP_PATH, JSON.stringify(geoJson));
    console.log(`🎉 [Success] GeoJSON 매핑 완료! (매칭된 인텔 구역 수: ${matchCount}개 / 맵의 전체 구역: ${geoJson.features.length})`);
    console.log(`📂 Saved to: ${OUTPUT_MAP_PATH}`);
  } catch (err) {
    console.error(`❌ 지도를 처리하는 중 오류가 발생했습니다:`, err.message);
    process.exit(1);
  }
}

run();
