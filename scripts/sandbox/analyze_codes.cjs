
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/skorea-submunicipalities-2018-geo.json');

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);
  
  if (!data.features) {
    console.log("No features found.");
    process.exit(1);
  }

  console.log("Gwangju-si (31250) Analysis:");
  const gwangjuFeatures = data.features.filter(f => String(f.properties.code).startsWith('31250'));
  console.log(`Count: ${gwangjuFeatures.length}`);
  gwangjuFeatures.forEach(f => console.log(` - ${f.properties.name} (${f.properties.code})`));

  console.log("\nYangpyeong-gun (31380) Analysis:");
  const yangpyeongFeatures = data.features.filter(f => String(f.properties.code).startsWith('31380'));
  console.log(`Count: ${yangpyeongFeatures.length}`);
  yangpyeongFeatures.forEach(f => console.log(` - ${f.properties.name} (${f.properties.code})`));

} catch (error) {
  console.error("Error:", error.message);
}
