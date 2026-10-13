const fs = require('fs');
const path = require('path');
const base = 'postman/collections/Almohit-Odoo-API';

function fixDir(dir) {
  const defFile = path.join(dir, '.resources', 'definition.yaml');
  if (fs.existsSync(defFile)) {
    let content = fs.readFileSync(defFile, 'utf8');
    if (content.includes('$kind: folder')) {
      content = content.replace('$kind: folder', '$kind: collection');
      fs.writeFileSync(defFile, content, 'utf8');
      console.log('Fixed: ' + defFile);
    }
  }
  // recurse into subdirs
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory() && entry !== '.resources') {
      fixDir(full);
    }
  }
}

fixDir(base);
console.log('All done!');
