/**
 * Converts Almohit-Odoo-API.postman_collection.json
 * into local workspace YAML files under postman/collections/Almohit-Odoo-API/
 */

const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitize(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function yamlStr(value) {
  if (value === null || value === undefined) return "''";
  const s = String(value);
  if (s === '') return "''";
  // needs quoting?
  if (/[:{}&*!,\[\]#|>'"%@`]/.test(s) || /\{\{/.test(s) || /^\s|\s$/.test(s) || s === 'true' || s === 'false' || /^\d/.test(s)) {
    return "'" + s.replace(/'/g, "''") + "'";
  }
  return s;
}

function blockScalar(code) {
  if (!code || code.trim() === '') return "''";
  return '|-\n' + code.split('\n').map(l => '      ' + l).join('\n');
}

function extractUrl(req) {
  if (!req.url) return "''";
  if (typeof req.url === 'string') return yamlStr(req.url);
  return yamlStr(req.url.raw || '');
}

function extractQueryParams(req) {
  if (!req.url || typeof req.url === 'string') return [];
  return (req.url.query || []).map(q => ({
    key: q.key || '',
    value: q.value || '',
    description: q.description || '',
    disabled: q.disabled || false
  }));
}

function extractPathVariables(req) {
  if (!req.url || typeof req.url === 'string') return [];
  return (req.url.variable || []).map(v => ({
    key: v.key || '',
    value: v.value || '',
    description: v.description || ''
  }));
}

function extractHeaders(req) {
  return (req.header || []).map(h => ({
    key: h.key || '',
    value: h.value || '',
    disabled: h.disabled || false
  }));
}

function extractBody(req) {
  if (!req.body || req.body.mode === 'none') return null;
  const mode = req.body.mode;
  if (mode === 'raw') {
    const lang = (req.body.options && req.body.options.raw && req.body.options.raw.language) || 'text';
    const typeMap = { json: 'json', xml: 'xml', html: 'html', javascript: 'javascript', text: 'text' };
    return { type: typeMap[lang] || 'text', content: req.body.raw || '' };
  }
  if (mode === 'formdata') {
    return { type: 'formdata', content: req.body.formdata || [] };
  }
  if (mode === 'urlencoded') {
    return { type: 'urlencoded', content: req.body.urlencoded || [] };
  }
  return null;
}

function extractScripts(events) {
  if (!events || events.length === 0) return [];
  return events.map(e => {
    const code = Array.isArray(e.script.exec) ? e.script.exec.join('\n') : (e.script.exec || '');
    return {
      type: e.listen === 'prerequest' ? 'beforeRequest' : 'afterResponse',
      code
    };
  }).filter(s => s.code.trim() !== '');
}

// ── YAML builders ─────────────────────────────────────────────────────────────

function buildRequestYaml(item, order) {
  const req = item.request;
  const lines = [];
  lines.push(`$kind: http-request`);
  if (item.name) lines.push(`name: ${yamlStr(item.name)}`);
  lines.push(`order: ${order}`);
  lines.push(`method: ${req.method || 'GET'}`);
  lines.push(`url: ${extractUrl(req)}`);

  // description
  if (req.description) {
    lines.push(`description: ${yamlStr(req.description)}`);
  }

  // headers
  const headers = extractHeaders(req);
  if (headers.length > 0) {
    lines.push(`headers:`);
    for (const h of headers) {
      lines.push(`  - key: ${yamlStr(h.key)}`);
      lines.push(`    value: ${yamlStr(h.value)}`);
      if (h.disabled) lines.push(`    disabled: true`);
    }
  }

  // query params
  const qp = extractQueryParams(req);
  if (qp.length > 0) {
    lines.push(`queryParams:`);
    for (const q of qp) {
      lines.push(`  - key: ${yamlStr(q.key)}`);
      lines.push(`    value: ${yamlStr(q.value)}`);
      if (q.description) lines.push(`    description: ${yamlStr(q.description)}`);
      if (q.disabled) lines.push(`    disabled: true`);
    }
  }

  // path variables
  const pv = extractPathVariables(req);
  if (pv.length > 0) {
    lines.push(`pathVariables:`);
    for (const v of pv) {
      lines.push(`  - key: ${yamlStr(v.key)}`);
      lines.push(`    value: ${yamlStr(v.value)}`);
    }
  }

  // body
  const body = extractBody(req);
  if (body) {
    lines.push(`body:`);
    lines.push(`  type: ${body.type}`);
    if (body.type === 'formdata') {
      lines.push(`  content:`);
      for (const f of body.content) {
        lines.push(`    - key: ${yamlStr(f.key)}`);
        lines.push(`      type: ${f.type || 'text'}`);
        lines.push(`      value: ${yamlStr(f.value || '')}`);
      }
    } else if (body.type === 'urlencoded') {
      lines.push(`  content:`);
      for (const u of body.content) {
        lines.push(`    - key: ${yamlStr(u.key)}`);
        lines.push(`      value: ${yamlStr(u.value || '')}`);
      }
    } else {
      lines.push(`  content: ${blockScalar(body.content)}`);
    }
  }

  // scripts
  const scripts = extractScripts(item.event);
  if (scripts.length > 0) {
    lines.push(`scripts:`);
    for (const s of scripts) {
      lines.push(`  - type: ${s.type}`);
      lines.push(`    language: text/javascript`);
      lines.push(`    code: ${blockScalar(s.code)}`);
    }
  }

  return lines.join('\n') + '\n';
}

function buildFolderYaml(folder) {
  const lines = [];
  lines.push(`$kind: folder`);
  lines.push(`name: ${yamlStr(folder.name)}`);
  if (folder.description) lines.push(`description: ${yamlStr(folder.description)}`);
  return lines.join('\n') + '\n';
}

function buildCollectionYaml(info, variables, events) {
  const lines = [];
  lines.push(`$kind: collection`);
  lines.push(`name: ${yamlStr(info.name)}`);
  if (info.description) {
    lines.push(`description: ${blockScalar(info.description)}`);
  }

  if (variables && variables.length > 0) {
    lines.push(`variables:`);
    for (const v of variables) {
      lines.push(`  - key: ${yamlStr(v.key)}`);
      lines.push(`    value: ${yamlStr(v.value || '')}`);
    }
  }

  const scripts = extractScripts(events);
  if (scripts.length > 0) {
    lines.push(`scripts:`);
    for (const s of scripts) {
      lines.push(`  - type: ${s.type}`);
      lines.push(`    language: text/javascript`);
      lines.push(`    code: ${blockScalar(s.code)}`);
    }
  }

  return lines.join('\n') + '\n';
}

// ── main ──────────────────────────────────────────────────────────────────────

const collectionJson = JSON.parse(fs.readFileSync('Almohit-Odoo-API.postman_collection.json', 'utf8'));
const baseDir = path.join('postman', 'collections', 'Almohit-Odoo-API');

// Create base dir
fs.mkdirSync(baseDir, { recursive: true });

// Write collection.yaml
const collectionYaml = buildCollectionYaml(
  collectionJson.info,
  collectionJson.variable,
  collectionJson.event
);
fs.writeFileSync(path.join(baseDir, 'collection.yaml'), collectionYaml, 'utf8');
console.log('✅ Created collection.yaml');

// Process each folder
for (const folder of collectionJson.item) {
  const folderDirName = sanitize(folder.name);
  const folderDir = path.join(baseDir, folderDirName);
  fs.mkdirSync(folderDir, { recursive: true });

  // Write folder.yaml
  const folderYaml = buildFolderYaml(folder);
  fs.writeFileSync(path.join(folderDir, 'folder.yaml'), folderYaml, 'utf8');
  console.log(`✅ Created ${folderDirName}/folder.yaml`);

  // Write each request
  let order = 1000;
  for (const item of (folder.item || [])) {
    const reqFileName = sanitize(item.name) + '.request.yaml';
    const reqYaml = buildRequestYaml(item, order);
    fs.writeFileSync(path.join(folderDir, reqFileName), reqYaml, 'utf8');
    console.log(`   ✅ ${folderDirName}/${reqFileName}`);
    order += 1000;
  }
}

console.log('\n🎉 Done! Collection converted to local workspace YAML format.');
