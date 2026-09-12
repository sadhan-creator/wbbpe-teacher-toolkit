const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert import
const importTarget = "import DocumentScanner from './components/DocumentScanner';";
const importReplacement = "import DocumentScanner from './components/DocumentScanner';\nimport PDFStudio from './components/pdf-studio/PDFStudio';";
content = content.replace(importTarget, importReplacement);

// Insert component in p8
const p8Target = "<DocumentScanner />";
const p8Replacement = "<PDFStudio />\n        <DocumentScanner />";
content = content.replace(p8Target, p8Replacement);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched with PDFStudio');
