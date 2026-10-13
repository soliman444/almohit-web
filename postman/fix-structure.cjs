const fs = require('fs');
const path = require('path');
const base = 'postman/collections/Almohit-Odoo-API';

// Move collection.yaml -> .resources/definition.yaml
fs.mkdirSync(path.join(base, '.resources'), { recursive: true });
if (fs.existsSync(path.join(base, 'collection.yaml'))) {
  fs.renameSync(path.join(base, 'collection.yaml'), path.join(base, '.resources', 'definition.yaml'));
  console.log('Moved collection.yaml -> .resources/definition.yaml');
}

// Move each folder.yaml -> <folder>/.resources/definition.yaml
const folders = fs.readdirSync(base).filter(f => {
  const p = path.join(base, f);
  return fs.statSync(p).isDirectory() && f !== '.resources';
});

for (const folder of folders) {
  const src = path.join(base, folder, 'folder.yaml');
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.join(base, folder, '.resources'), { recursive: true });
    const content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(path.join(base, folder, '.resources', 'definition.yaml'), content, 'utf8');
    fs.unlinkSync(src);
    console.log('Moved ' + folder + '/folder.yaml -> ' + folder + '/.resources/definition.yaml');
  }
}
console.log('Done!');
