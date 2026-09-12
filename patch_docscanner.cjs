const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert import
const importTarget = "import PhotoSignatureResizer from './components/PhotoSignatureResizer';";
const importReplacement = "import PhotoSignatureResizer from './components/PhotoSignatureResizer';\nimport DocumentScanner from './components/DocumentScanner';";
content = content.replace(importTarget, importReplacement);

// Insert component in p8
const p8Target = "<PhotoSignatureResizer />";
const p8Replacement = "<DocumentScanner />\n        <PhotoSignatureResizer />";
content = content.replace(p8Target, p8Replacement);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched with DocumentScanner');
