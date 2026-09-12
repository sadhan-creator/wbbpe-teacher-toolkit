const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The original function LeaveApplicationGenerator is at lines 45-842.
// We can find the boundaries using regex or indexOf.
const startStr = 'function LeaveApplicationGenerator() {';
const endStr = 'export default function App() {';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  const importStr = "import LeaveApplicationGenerator from './components/LeaveApplicationGenerator';\n\n";
  
  content = before + importStr + after;
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully replaced LeaveApplicationGenerator with import.');
} else {
  console.log('Could not find start or end bounds.');
}
