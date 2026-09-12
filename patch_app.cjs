const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert import
const importTarget = "import LeaveApplicationGenerator from './components/LeaveApplicationGenerator';";
const importReplacement = "import LeaveApplicationGenerator from './components/LeaveApplicationGenerator';\nimport PhotoSignatureResizer from './components/PhotoSignatureResizer';";
content = content.replace(importTarget, importReplacement);

// Insert component in p8
const p8Target = "<div id=\"p8\" style={{ display: 'none' }}>";
const p8Replacement = "<div id=\"p8\" style={{ display: 'none' }}>\n        <PhotoSignatureResizer />";
content = content.replace(p8Target, p8Replacement);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched successfully');
