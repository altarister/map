/**
 * generate_seoul_incheon_intel_placeholders.js
 * 서울(11)·인천(23) 자치구/군별 intel 플레이스홀더 JSON 파일 생성 스크립트
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MERGED_MAP = path.join(__dirname, '../public/mapData/merged_map.geojson');
const INTEL_DIR = path.join(__dirname, 'data/intel');

// 제외: 옹진군 (다리 없이 배로만 접근)
const EXCLUDED_CODES = new Set(['23320']);

// 서울 자치구/인천 자치구·군 이름 매핑 (5자리 코드 → 한글명)
const GU_NAME_MAP = {
  // 서울 25구
  '11010': '종로구', '11020': '중구', '11030': '용산구',
  '11040': '성동구', '11050': '광진구', '11060': '동대문구',
  '11070': '중랑구', '11080': '성북구', '11090': '강북구',
  '11100': '도봉구', '11110': '노원구', '11120': '은평구',
  '11130': '서대문구', '11140': '마포구', '11150': '양천구',
  '11160': '강서구', '11170': '구로구', '11180': '금천구',
  '11190': '영등포구', '11200': '동작구', '11210': '관악구',
  '11220': '서초구', '11230': '강남구', '11240': '송파구',
  '11250': '강동구',
  // 인천 9구/군 (옹진군 23320 제외)
  '23010': '중구', '23020': '동구', '23030': '미추홀구',
  '23040': '연수구', '23050': '남동구', '23060': '부평구',
  '23070': '계양구', '23080': '서구', '23310': '강화군',
};

const GU_ENG_MAP = {
  // 서울 25구
  '11010': 'jongno', '11020': 'jung', '11030': 'yongsan',
  '11040': 'seongdong', '11050': 'gwangjin', '11060': 'dongdaemun',
  '11070': 'jungnang', '11080': 'seongbuk', '11090': 'gangbuk',
  '11100': 'dobong', '11110': 'nowon', '11120': 'eunpyeong',
  '11130': 'seodaemun', '11140': 'mapo', '11150': 'yangcheon',
  '11160': 'gangseo', '11170': 'guro', '11180': 'geumcheon',
  '11190': 'yeongdeungpo', '11200': 'dongjak', '11210': 'gwanak',
  '11220': 'seocho', '11230': 'gangnam', '11240': 'songpa',
  '11250': 'gangdong',
  // 인천 9구/군
  '23010': 'jung', '23020': 'dong', '23030': 'michuhol',
  '23040': 'yeonsu', '23050': 'namdong', '23060': 'bupyeong',
  '23070': 'gyeyang', '23080': 'seo', '23310': 'ganghwa',
};

async function run() {
  const raw = JSON.parse(await fs.readFile(MERGED_MAP, 'utf8'));

  // 서울(11), 인천(23) 동 피처만 필터
  const features = raw.features.filter(f => {
    const code = f.properties?.code;
    if (!code) return false;
    if (!code.startsWith('11') && !code.startsWith('23')) return false;
    const guCode = code.substring(0, 5);
    if (EXCLUDED_CODES.has(guCode)) return false;
    return true;
  });

  // 구 코드별로 분류
  const byGu = {};
  for (const f of features) {
    const code = f.properties.code;
    const guCode = code.substring(0, 5);
    if (!byGu[guCode]) byGu[guCode] = [];
    byGu[guCode].push(f);
  }

  const seoulDir = path.join(INTEL_DIR, '11_seoul');
  const incheonDir = path.join(INTEL_DIR, '23_incheon');
  await fs.mkdir(seoulDir, { recursive: true });
  await fs.mkdir(incheonDir, { recursive: true });

  let createdCount = 0;
  for (const [guCode, dongList] of Object.entries(byGu)) {
    const guName = GU_NAME_MAP[guCode] || guCode;
    const isSeoul = guCode.startsWith('11');
    const cityName = isSeoul ? '서울' : '인천';
    const subDir = isSeoul ? seoulDir : incheonDir;

    // 파일명: {구코드}_{dosi}_{engName}.json 
    const guNameEng = GU_ENG_MAP[guCode] || guCode;
    const fileName = `${guCode}_${cityName === '서울' ? 'seoul' : 'incheon'}_${guNameEng}.json`;
    const filePath = path.join(subDir, fileName);

    // 이미 존재하면 skip
    try { await fs.access(filePath); console.log(`⏭️  Skip (exists): ${fileName}`); continue; }
    catch { /* 신규 생성 */ }

    const intel = {};
    for (const f of dongList) {
      const code = f.properties.code;
      const name = f.properties.name;
      intel[code] = {
        regionCode: code,
        name,
        parentName: `${cityName} ${guName}`,
        roads: [],
        orderVolume: '중',
        importance: 3,
        landmarks: [],
        fieldTips: [
          `${name} 지역 인텔 데이터 추가 필요`,
          '주요 도로, 랜드마크, 배달 특이사항을 입력해주세요.',
        ],
      };
    }

    await fs.writeFile(filePath, JSON.stringify(intel, null, 2), 'utf8');
    console.log(`✅ Created: ${fileName} (${dongList.length}개 동)`);
    createdCount++;
  }

  console.log(`\n🎉 완료! 신규 생성: ${createdCount}개 파일`);
}

run().catch(console.error);
