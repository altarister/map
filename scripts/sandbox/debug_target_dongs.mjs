import fs from 'fs';

const level2 = JSON.parse(fs.readFileSync('public/data/skorea-municipalities-2018-geo.json', 'utf8'));
const fullData = JSON.parse(fs.readFileSync('public/data/gyeonggi_bupjeongdong.geojson', 'utf8'));

// Mimic useGeoData legal code assignment for cityData (Level 2)
const filteredLevel3 = fullData.features.filter(f => f.properties.code && (f.properties.code.startsWith('31') || f.properties.code.startsWith('41')));
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

// Now emulate the click on Cheoin-gu
const cheoinGu = filteredCity.find(f => f.properties.name === '용인시처인구' || f.properties.name === '처인구');
console.log("Found Cheoin-Gu feature:", cheoinGu?.properties);

if (cheoinGu) {
    const guPrefix = cheoinGu.properties.code.substring(0, 5);
    console.log("guPrefix:", guPrefix);

    const targetDongs = fullData.features.filter(f => {
        return f.properties.code.startsWith(guPrefix) && f.properties._isEmdGroup === true;
    });

    console.log("targetDongs length:", targetDongs.length);
    if (targetDongs.length > 0) {
        console.log("targetDongs names:", targetDongs.map(t => t.properties.name).slice(0, 5));
    } else {
        console.log("targetDongs is EMPTY! Why?");
        // Let's debug further
        const noEmdGroup = fullData.features.filter(f => f.properties.code.startsWith(guPrefix));
        console.log("Without _isEmdGroup filter length:", noEmdGroup.length);
        if (noEmdGroup.length > 0) {
            console.log("Sample code/name:", noEmdGroup[0].properties.code, noEmdGroup[0].properties.name, "isEmdGroup:", noEmdGroup[0].properties._isEmdGroup);
        }
    }
}
