import fs from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const schemaUrl = 'https://render.com/schema/render.yaml.json';
const response = await fetch(schemaUrl, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Render schema download failed (${response.status}).`);
const schema = await response.json();
const blueprint = YAML.parse(await fs.readFile('render.yaml', 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
if (!ajv.validate(schema, blueprint)) {
  console.error(ajv.errors);
  process.exitCode = 1;
} else {
  console.log('render.yaml passes the official Render JSON Schema. Account-specific deployment checks still run in Render.');
}
