const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf-8');

// Replace .tabs div block
const tabsDivRegex = /\.tabs div \{([\s\S]*?)\}/;
const match = css.match(tabsDivRegex);

if (match) {
  let block = match[1];
  if (!block.includes('position: relative;')) {
    block = '\n  position: relative;\n  overflow: hidden;' + block;
  }
  
  css = css.replace(tabsDivRegex, `.tabs div {${block}}`);
  
  // Add the ::after block if not exists
  if (!css.includes('.tabs div::after')) {
    const rippleCss = `

/* Pure CSS Ripple Effect for Tabs */
.tabs div::after {
  content: "";
  display: block;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, #475569 10%, transparent 10.01%);
  background-repeat: no-repeat;
  background-position: 50%;
  transform: scale(10, 10);
  opacity: 0;
  transition: transform .5s, opacity 1s;
}

.tabs div:active::after {
  transform: scale(0, 0);
  opacity: 0.15;
  transition: 0s;
}
`;
    // Insert it after .tabs div:active
    css = css.replace('.tabs div:active {\n  transform: scale(0.95);\n}', '.tabs div:active {\n  transform: scale(0.95);\n}' + rippleCss);
  }
  
  fs.writeFileSync('src/index.css', css);
  console.log('Ripple CSS added successfully');
} else {
  console.log('Could not find .tabs div block');
}
