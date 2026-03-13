/**
 * emd.json + sig.json → gyeonggi_bupjeongdong.geojson 변환 스크립트
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'public', 'data');
const sigPath  = path.join(DATA_DIR, 'sig.json');
const emdPath  = path.join(DATA_DIR, 'emd.json');
const outPath  = path.join(DATA_DIR, 'gyeonggi_bupjeongdong.geojson');

console.log('Reading sig.json...');
const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));

console.log('Reading emd.json...');
const emd = JSON.parse(fs.readFileSync(emdPath, 'utf8'));

// SIG_CD(5자리) → SIG_KOR_NM 맵
const sigMap = new Map();
for (const f of sig.features) {
  const cd = String(f.properties.SIG_CD || '');
  const nm = String(f.properties.SIG_KOR_NM || '');
  if (cd) sigMap.set(cd, nm);
}
console.log(`sig.json: ${sigMap.size}개 시군구`);

// 경기도 EMD 필터 + 정규화
const gyeonggiFeatures = emd.features
  .filter(f => String(f.properties.EMD_CD || '').startsWith('41'))
  .map(f => {
    const raw    = f.properties;
    const emdCd  = String(raw.EMD_CD     || '');
    const emdNm  = String(raw.EMD_KOR_NM || '');
    const sigCd5 = emdCd.substring(0, 5);
    const sigNm  = sigMap.get(sigCd5) || '';
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        code:        emdCd,
        name:        emdNm,
        SIG_KOR_NM:  sigNm,
        EMD_KOR_NM:  emdNm,
        _isEmdGroup: true,
      },
    };
  });

console.log(`경기도 읍/면/동: ${gyeonggiFeatures.length}개`);

// 시군구별 집계 (검증용)
const sigCount = {};
for (const f of gyeonggiFeatures) {
  const nm = f.properties.SIG_KOR_NM || '(없음)';
  sigCount[nm] = (sigCount[nm] || 0) + 1;
}
Object.entries(sigCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([nm, cnt]) => console.log(`  ${nm}: ${cnt}개`));

// 코드 샘플 출력
const samples = gyeonggiFeatures.slice(0, 3).map(f => f.properties);
console.log('\n샘플 프로퍼티:', JSON.stringify(samples, null, 2));

fs.writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features: gyeonggiFeatures }), 'utf8');
const stat = fs.statSync(outPath);
console.log(`\n✅ 저장: ${outPath} (${(stat.size/1024/1024).toFixed(1)} MB)`);
