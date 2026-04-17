/**
 * mockLocationData.json에 lon, lat 좌표를 자동 추가하는 스크립트
 * 
 * 방법: 
 * 1) merged_map.geojson에서 읍면동 폴리곤의 centroid를 추출
 * 2) mockLocationData의 addressDetail에서 시/군/구 + 동/읍/면을 파싱
 * 3) GeoJSON feature의 name/SIG_KOR_NM과 매칭하여 centroid 좌표를 부여
 * 4) 매칭 실패 시 시/군/구 레벨에서 재시도 (가장 가까운 동 사용)
 */
const fs = require('fs');
const d3Geo = require('d3-geo');

const mockData = JSON.parse(fs.readFileSync('src/data/mockLocationData.json', 'utf8'));
const geoData = JSON.parse(fs.readFileSync('public/mapData/merged_map.geojson', 'utf8'));

// GeoJSON features에서 centroid 추출하여 인덱스 구축
const geoIndex = geoData.features.map(f => {
  const centroid = d3Geo.geoCentroid(f);
  return {
    code: f.properties.code,
    name: f.properties.name,
    sigName: f.properties.SIG_KOR_NM || '',
    emdName: f.properties.EMD_KOR_NM || '',
    lon: centroid[0],
    lat: centroid[1]
  };
});

// 시/군/구 이름 정규화 헬퍼
const normalizeSig = (sig) => {
  return sig
    .replace(/특별시|광역시|자치시|특별자치시|특별자치도/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

let matched = 0;
let sigMatched = 0;
let unmatched = 0;

const enriched = mockData.map((item, idx) => {
  const addr = item.addressDetail || '';
  const parts = addr.split(' ').filter(Boolean);
  
  // 최소 "시도 시군구 동읍면" 3토큰이 필요
  if (parts.length < 3) {
    unmatched++;
    console.log(`[${idx}] SKIP (too short): ${addr}`);
    return item;
  }

  const sido = parts[0];    // 경기, 서울, 인천, 대전 등
  const sigungu = parts[1]; // 수원시, 팔달구, 중구 등
  const dong = parts[2];    // 영통구, 삼성로 등 (동/읍/면 또는 도로명)

  // 1차 시도: 동/읍/면 이름 완전 일치
  let bestMatch = geoIndex.find(g => {
    const sigMatch = g.sigName.includes(sigungu) || sigungu.includes(g.sigName);
    const emdMatch = g.name === dong || g.emdName === dong;
    return sigMatch && emdMatch;
  });

  if (bestMatch) {
    matched++;
    return { ...item, lon: Math.round(bestMatch.lon * 10000) / 10000, lat: Math.round(bestMatch.lat * 10000) / 10000 };
  }

  // 2차 시도: 시/군/구 이름만으로 매칭 (해당 시/군/구의 첫 번째 동 사용)
  const sigCandidates = geoIndex.filter(g => {
    return g.sigName.includes(sigungu) || sigungu.includes(g.sigName);
  });

  if (sigCandidates.length > 0) {
    // 도로명에서 동/읍/면 힌트 추출 시도 (예: "영통구" → 3번째 토큰이 상위 구 이름일 수 있음)
    // parts[3]이 동이름일 수 있음  
    if (parts.length >= 4) {
      const dong2 = parts[3];
      const subMatch = sigCandidates.find(g => g.name === dong2 || g.emdName === dong2);
      if (subMatch) {
        matched++;
        return { ...item, lon: Math.round(subMatch.lon * 10000) / 10000, lat: Math.round(subMatch.lat * 10000) / 10000 };
      }
    }

    // 3차: 그냥 해당 시군구의 중앙(첫 번째 feature) 사용
    sigMatched++;
    const fallback = sigCandidates[Math.floor(sigCandidates.length / 2)];
    return { ...item, lon: Math.round(fallback.lon * 10000) / 10000, lat: Math.round(fallback.lat * 10000) / 10000 };
  }

  // 4차: 시도 레벨 매칭 (서울, 인천 등)
  const sidoMap = {
    '서울': '11', '인천': '28', '경기': '41',
    '대전': '30', '대구': '27', '부산': '26', '울산': '31', '광주': '29'
  };
  const sidoCode = sidoMap[sido];
  if (sidoCode) {
    const sidoCandidates = geoIndex.filter(g => g.code.startsWith(sidoCode));
    if (sidoCandidates.length > 0) {
      // 시군구 이름으로 한 번 더 필터
      const refined = sidoCandidates.filter(g => g.sigName.includes(sigungu));
      const finalMatch = refined.length > 0 ? refined[Math.floor(refined.length / 2)] : sidoCandidates[0];
      sigMatched++;
      return { ...item, lon: Math.round(finalMatch.lon * 10000) / 10000, lat: Math.round(finalMatch.lat * 10000) / 10000 };
    }
  }

  unmatched++;
  console.log(`[${idx}] UNMATCHED: ${addr}`);
  return item;
});

console.log(`\n=== 결과 ===`);
console.log(`정확 매칭: ${matched}개`);
console.log(`시군구 매칭: ${sigMatched}개`);
console.log(`미매칭: ${unmatched}개`);
console.log(`합계: ${matched + sigMatched + unmatched} / ${mockData.length}`);

// 좌표 없는 항목 확인
const noCoord = enriched.filter(i => !i.lon);
if (noCoord.length > 0) {
  console.log(`\n⚠️ 좌표 없는 항목 ${noCoord.length}개:`);
  noCoord.forEach(i => console.log(`  - ${i.addressDetail}`));
}

fs.writeFileSync('src/data/mockLocationData.json', JSON.stringify(enriched, null, 2) + '\n', 'utf8');
console.log('\n✅ mockLocationData.json 업데이트 완료!');
