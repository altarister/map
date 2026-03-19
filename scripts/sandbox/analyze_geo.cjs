const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/skorea-submunicipalities-2018-geo.json');

try {
  console.log('Reading file...');
  const data = fs.readFileSync(filePath, 'utf8');
  const geojson = JSON.parse(data);
  
  console.log(`Total features: ${geojson.features.length}`);
  
  const codeLengths = {};
  const shortCodeFeatures = [];
  let targetFeature = null;

  geojson.features.forEach((f, index) => {
    const code = f.properties.code;
    const name = f.properties.name;
    
    // Code type check
    if (typeof code !== 'string') {
      console.log(`[Feature #${index}] Code is not a string:`, code);
      return;
    }

    const trimmedCode = code.trim();
    const len = trimmedCode.length;
    
    // Length distribution
    codeLengths[len] = (codeLengths[len] || 0) + 1;
    
    // Check for 31380
    if (trimmedCode === '31380') {
      targetFeature = {
        index,
        properties: f.properties,
        geometryType: f.geometry?.type
      };
    }

    // Check for short codes
    if (len <= 5) {
      shortCodeFeatures.push({
        index,
        code: trimmedCode,
        originalCode: code,
        name,
        codeLen: code.length
      });
    }
  });

  console.log('\n--- Code Length Distribution ---');
  console.table(codeLengths);

  console.log('\n--- Feature with code "31380" ---');
  if (targetFeature) {
    console.log(JSON.stringify(targetFeature, null, 2));
  } else {
    console.log('Not found.');
  }

  console.log('\n--- Features with code length <= 5 ---');
  if (shortCodeFeatures.length > 0) {
    console.log(`Found ${shortCodeFeatures.length} features.`);
    // Show first 10
    console.log(shortCodeFeatures.slice(0, 10));
  } else {
    console.log('None found.');
  }

} catch (err) {
  console.error('Error:', err);
}
