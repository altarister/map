import fs from 'fs';

const level2 = JSON.parse(fs.readFileSync('public/data/skorea-municipalities-2018-geo.json', 'utf8'));
const level3 = JSON.parse(fs.readFileSync('public/data/gyeonggi_bupjeongdong.geojson', 'utf8'));
const level1 = JSON.parse(fs.readFileSync('public/data/gyeonggi_level1_merged.geojson', 'utf8'));

const filteredLevel3 = level3.features.filter(f => f.properties.code && (f.properties.code.startsWith('31') || f.properties.code.startsWith('41')));
const sigNameToLegalCode = new Map();

filteredLevel3.forEach(f => {
  const sigName = f.properties.SIG_KOR_NM;
  const legalCodeStr = f.properties.code;
  if (sigName && legalCodeStr && legalCodeStr.length >= 5) {
    const sigCode5 = legalCodeStr.substring(0, 5);
    const normalizedSigName = sigName.replace(/\s+/g, '');
    if (!sigNameToLegalCode.has(normalizedSigName)) {
      sigNameToLegalCode.set(normalizedSigName, sigCode5);
    }
    const baseParts = sigName.split(' ');
    if (baseParts.length > 1 && baseParts[0].endsWith('시')) {
      const baseCityName = baseParts[0];
      if (!sigNameToLegalCode.has(baseCityName)) {
        const parentCityCode = sigCode5.substring(0, 4) + '0';
        sigNameToLegalCode.set(baseCityName, parentCityCode);
      }
    }
  }
});

const filteredCity = level2.features.filter(f => f.properties.code.startsWith('31'));
filteredCity.forEach(f => {
  const name = f.properties.name ? f.properties.name.replace(/\s+/g, '') : undefined;
  if (name && sigNameToLegalCode.has(name)) {
    f.properties.code = sigNameToLegalCode.get(name);
  } else if (name) {
    const parentNameMatch = name.match(/^(.*?시)[\w\u3131-\uD79D]*구$/);
    if (parentNameMatch && sigNameToLegalCode.has(parentNameMatch[1])) {
      f.properties.code = sigNameToLegalCode.get(parentNameMatch[1]).substring(0, 4) + f.properties.code.substring(4, 5);
    }
  }
});

level1.features.forEach(f => {
  const name = f.properties.name;
  if (name && sigNameToLegalCode.has(name)) {
    f.properties.code = sigNameToLegalCode.get(name);
  }
});

const yonginL1 = level1.features.find(f => f.properties.name === '용인시');
console.log('Yongin-si L1 Code:', yonginL1?.properties.code);
if(yonginL1) {
    const prefix = yonginL1.properties.code.substring(0, 4);

    const guFeatures = filteredCity.filter(f => f.properties.code.startsWith(prefix) && f.properties.name.endsWith('구'));
    console.log('Found Gu Features length:', guFeatures.length);
    console.log('Found Gu Features:', guFeatures.map(f => `${f.properties.name}(${f.properties.code})`));
}
