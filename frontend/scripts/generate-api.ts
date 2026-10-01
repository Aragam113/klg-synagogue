/**
 * Universal RTK Query Codegen — OpenAPI → TypeScript slices
 *
 * Fetches swagger.json, splits endpoints by tags, generates:
 *   - {outputDir}/types.ts          (all shared DTO interfaces)
 *   - {outputDir}/{tag}.slice.ts    (endpoints + hooks per tag)
 *   - {outputDir}/index.ts          (barrel re-exports)
 *
 * Works with any NestJS/Swagger or OpenAPI 3.x backend.
 * Supports React Native & Next.js / Web projects identically.
 *
 * Usage:  npm run codegen
 * Config: scripts/codegen.config.ts  (reads from ENV)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { codegenConfig, CodegenConfig } from './codegen.config';

// ─── Fetch ─────────────────────────────────────────────────────────────────

function fetchJson(url: string, auth?: { username: string; password: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    var lib = url.startsWith('https') ? https : http;
    var headers: Record<string, string> = { Accept: 'application/json' };
    if (auth) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(auth.username + ':' + auth.password).toString('base64');
    }
    lib
      .get(url, { headers }, function (res) {
        var data = '';
        res.on('data', function (chunk: string) {
          data += chunk;
        });
        res.on('end', function () {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON: ' + data.slice(0, 200)));
          }
        });
      })
      .on('error', reject);
  });
}

// ─── OpenAPI types ─────────────────────────────────────────────────────────

interface OASpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, any>>;
  components?: { schemas?: Record<string, OASchema> };
}
interface OASchema {
  type?: string;
  format?: string;
  $ref?: string;
  items?: OASchema;
  properties?: Record<string, OASchema>;
  required?: string[];
  enum?: (string | number)[];
  description?: string;
  nullable?: boolean;
  allOf?: OASchema[];
  oneOf?: OASchema[];
  anyOf?: OASchema[];
  additionalProperties?: boolean | OASchema;
}
interface OAParam {
  name: string;
  in: string;
  required?: boolean;
  schema: OASchema;
  description?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fwd(p: string): string {
  return p.split(path.sep).join('/');
}

function tagToFile(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function camel(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, function (_, c) {
      return c.toUpperCase();
    })
    .replace(/^[A-Z]/, function (c) {
      return c.toLowerCase();
    });
}

function pascal(s: string): string {
  var c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function refName(ref: string): string {
  return ref.split('/').pop() || 'Unknown';
}

// ─── Collect all $ref names used anywhere in a schema (recursive) ──────────

function collectRefs(schema: OASchema | undefined, into: Set<string>): void {
  if (!schema) return;
  if (schema.$ref) {
    into.add(refName(schema.$ref));
    return;
  }
  if (schema.items) collectRefs(schema.items, into);
  if (schema.properties) {
    for (var k of Object.keys(schema.properties)) collectRefs(schema.properties[k], into);
  }
  if (schema.allOf)
    schema.allOf.forEach(function (s) {
      collectRefs(s, into);
    });
  if (schema.oneOf)
    schema.oneOf.forEach(function (s) {
      collectRefs(s, into);
    });
  if (schema.anyOf)
    schema.anyOf.forEach(function (s) {
      collectRefs(s, into);
    });
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    collectRefs(schema.additionalProperties as OASchema, into);
  }
}

// ─── Schema → TypeScript ───────────────────────────────────────────────────

function isEmptyObj(s: OASchema): boolean {
  if (!s) return true;
  if (s.$ref || s.enum || s.allOf || s.oneOf || s.anyOf) return false;
  if (
    s.type === 'array' ||
    s.type === 'string' ||
    s.type === 'number' ||
    s.type === 'integer' ||
    s.type === 'boolean'
  )
    return false;
  if (s.properties && Object.keys(s.properties).length > 0) return false;
  return true; // {} or {type:'object'} with no props
}

function toTs(s: OASchema, indent: string): string {
  if (!s) return 'unknown';
  if (s.$ref) return refName(s.$ref);

  if (s.allOf)
    return s.allOf
      .map(function (x) {
        return toTs(x, indent);
      })
      .join(' & ');
  if (s.oneOf || s.anyOf) {
    var arr = s.oneOf || s.anyOf || [];
    return arr
      .map(function (x) {
        return toTs(x, indent);
      })
      .join(' | ');
  }
  if (s.enum)
    return s.enum
      .map(function (v) {
        return typeof v === 'string' ? "'" + v + "'" : '' + v;
      })
      .join(' | ');

  if (s.type === 'array') {
    if (!s.items) return 'any[]';
    var it = toTs(s.items, indent);
    return it.indexOf('|') !== -1 && it[0] !== '(' ? '(' + it + ')[]' : it + '[]';
  }

  if (s.type === 'object' || s.properties) {
    var props = s.properties || {};
    var keys = Object.keys(props);
    if (keys.length === 0) return 'unknown';
    var req = new Set(s.required || []);
    var lines: string[] = [];
    for (var key of keys) {
      var ps = props[key];
      var opt = req.has(key) ? '' : '?';
      var desc = ps.description ? '  /** ' + ps.description + ' */\n' + indent : '';
      var pt: string;
      if (isEmptyObj(ps)) {
        // NestJS nullable pattern: empty schema {} → string | null
        pt = 'string | null';
      } else {
        pt = toTs(ps, indent + '  ');
      }
      lines.push(desc + '  ' + key + opt + ': ' + pt + ';');
    }
    return '{\n' + indent + lines.join('\n' + indent) + '\n' + indent + '}';
  }

  if (s.type === 'string') return s.format === 'binary' ? 'Blob' : 'string';
  if (s.type === 'number' || s.type === 'integer') return 'number';
  if (s.type === 'boolean') return 'boolean';
  return 'unknown';
}

// ─── Generate types.ts (all schemas) ───────────────────────────────────────

function generateTypesFile(spec: OASpec): string {
  var schemas = (spec.components && spec.components.schemas) || {};
  var lines: string[] = ['/* Auto-generated — do not edit */', ''];

  // Topological-ish: generate all schemas. TS handles forward refs fine.
  for (var name of Object.keys(schemas)) {
    var s = schemas[name];
    if (s.enum) {
      var vals = s.enum
        .map(function (v) {
          return typeof v === 'string' ? "'" + v + "'" : '' + v;
        })
        .join(' | ');
      lines.push('export type ' + name + ' = ' + vals + ';');
    } else if (s.type === 'object' || s.properties) {
      var props = s.properties || {};
      var req = new Set(s.required || []);
      var fields: string[] = [];
      for (var key of Object.keys(props)) {
        var ps = props[key];
        var opt = req.has(key) ? '' : '?';
        var desc = ps.description ? '  /** ' + ps.description + ' */\n' : '';
        var t: string;
        if (isEmptyObj(ps)) {
          t = 'string | null';
        } else {
          t = toTs(ps, '  ');
        }
        fields.push(desc + '  ' + key + opt + ': ' + t + ';');
      }
      lines.push('export interface ' + name + ' {');
      lines.push(fields.join('\n'));
      lines.push('}');
    } else if (s.allOf || s.oneOf || s.anyOf) {
      lines.push('export type ' + name + ' = ' + toTs(s, '') + ';');
    } else {
      lines.push('export type ' + name + ' = ' + toTs(s, '') + ';');
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Parse Endpoints ───────────────────────────────────────────────────────

interface Endpoint {
  method: string;
  path: string;
  operationId: string;
  tags: string[];
  summary?: string;
  description?: string;
  pathParams: OAParam[];
  queryParams: OAParam[];
  requestBody?: OASchema;
  requestContentType?: 'json' | 'multipart' | 'form';
  responseSchema?: OASchema;
  responseDesc?: string;
}

function bodyHasContent(body: OASchema | undefined, ct: string | undefined): boolean {
  if (!body) return false;
  if (body.$ref) return true;
  if (body.properties && Object.keys(body.properties).length > 0) return true;
  return false;
}

function parseEndpoints(spec: OASpec): Map<string, Endpoint[]> {
  var tagMap = new Map<string, Endpoint[]>();
  for (var p of Object.keys(spec.paths)) {
    var pathObj = spec.paths[p];
    for (var method of Object.keys(pathObj)) {
      var op = pathObj[method];
      if (!op.operationId) continue;
      var tags = op.tags || ['default'];
      var pathParams: OAParam[] = [];
      var queryParams: OAParam[] = [];
      if (op.parameters) {
        for (var par of op.parameters) {
          if (par.in === 'path') pathParams.push(par);
          if (par.in === 'query') queryParams.push(par);
        }
      }

      var reqBody: OASchema | undefined = undefined;
      var reqCt: 'json' | 'multipart' | 'form' | undefined = undefined;
      if (op.requestBody) {
        if (op.requestBody.$ref) {
          reqBody = op.requestBody;
        } else if (op.requestBody.content) {
          var c = op.requestBody.content;
          if (c['application/json']) {
            reqBody = c['application/json'].schema;
            reqCt = 'json';
          } else if (c['multipart/form-data']) {
            reqBody = c['multipart/form-data'].schema;
            reqCt = 'multipart';
          } else if (c['application/x-www-form-urlencoded']) {
            reqBody = c['application/x-www-form-urlencoded'].schema;
            reqCt = 'form';
          }
        }
      }

      var resSchema: OASchema | undefined = undefined;
      var resDesc: string | undefined = undefined;
      if (op.responses && op.responses['200']) {
        var r200 = op.responses['200'];
        resDesc = r200.description;
        if (r200.content && r200.content['application/json']) {
          resSchema = r200.content['application/json'].schema;
        }
      } else if (op.responses && op.responses['201']) {
        var r201 = op.responses['201'];
        resDesc = r201.description;
        if (r201.content && r201.content['application/json']) {
          resSchema = r201.content['application/json'].schema;
        }
      }

      var ep: Endpoint = {
        method: method.toUpperCase(),
        path: p,
        operationId: op.operationId,
        tags,
        summary: op.summary,
        description: op.description,
        pathParams,
        queryParams,
        requestBody: reqBody,
        requestContentType: reqCt,
        responseSchema: resSchema,
        responseDesc: resDesc,
      };

      for (var tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(ep);
      }
    }
  }
  return tagMap;
}

// ─── Generate Arg type ─────────────────────────────────────────────────────

function genArgType(ep: Endpoint): { def: string; name: string } {
  var argName = pascal(ep.operationId) + 'ApiArg';
  var fields: string[] = [];

  // Path params
  for (var p of ep.pathParams) {
    var opt = p.required ? '' : '?';
    var t = toTs(p.schema, '  ');
    var desc = p.description ? '  /** ' + p.description + ' */\n' : '';
    fields.push(desc + '  ' + p.name + opt + ': ' + t + ';');
  }

  // Query params
  for (var q of ep.queryParams) {
    var opt2 = q.required ? '' : '?';
    var t2 = toTs(q.schema, '  ');
    var desc2 = q.description ? '  /** ' + q.description + ' */\n' : '';
    fields.push(desc2 + '  ' + q.name + opt2 + ': ' + t2 + ';');
  }

  // Body
  if (bodyHasContent(ep.requestBody, ep.requestContentType)) {
    if (ep.requestBody!.$ref) {
      var rn = refName(ep.requestBody!.$ref);
      fields.push('  ' + camel(rn) + ': ' + rn + ';');
    } else if (ep.requestContentType === 'multipart') {
      fields.push('  body: ' + toTs(ep.requestBody!, '  ') + ';');
    } else {
      fields.push('  body: ' + toTs(ep.requestBody!, '  ') + ';');
    }
  }

  if (fields.length === 0) {
    return { def: 'export type ' + argName + ' = void;', name: argName };
  }
  return { def: 'export type ' + argName + ' = {\n' + fields.join('\n') + '\n};', name: argName };
}

// ─── Generate Response type ────────────────────────────────────────────────

function genResType(ep: Endpoint): { def: string; name: string } {
  var resName = pascal(ep.operationId) + 'Response';
  if (!ep.responseSchema) {
    return { def: 'export type ' + resName + ' = unknown;', name: resName };
  }
  var desc = ep.responseDesc ? ' /** ' + ep.responseDesc + ' */' : '';
  var ts = toTs(ep.responseSchema, '');
  return { def: 'export type ' + resName + ' =' + desc + ' ' + ts + ';', name: resName };
}

// ─── Generate query function body ──────────────────────────────────────────

function genQueryFn(ep: Endpoint): string {
  var lines: string[] = [];

  // URL with path param interpolation
  var url = ep.path;
  for (var p of ep.pathParams) {
    url = url.replace('{' + p.name + '}', '${queryArg.' + p.name + '}');
  }

  var hasQuery = ep.queryParams.length > 0;
  var hasBody = bodyHasContent(ep.requestBody, ep.requestContentType);
  var needsArg = ep.pathParams.length > 0 || hasQuery || hasBody;

  // Simple GET with no params
  if (ep.method === 'GET' && !hasQuery && !hasBody) {
    if (ep.pathParams.length === 0) {
      return '        query: () => ({ url: `' + url + '` }),';
    } else {
      return '        query: (queryArg) => ({ url: `' + url + '` }),';
    }
  }

  var arg = needsArg ? '(queryArg)' : '()';
  lines.push('        query: ' + arg + ' => ({');
  lines.push('          url: `' + url + '`,');

  if (ep.method !== 'GET') {
    lines.push("          method: '" + ep.method + "',");
  }

  if (hasBody) {
    if (ep.requestBody!.$ref) {
      lines.push('          body: queryArg.' + camel(refName(ep.requestBody!.$ref)) + ',');
    } else {
      lines.push('          body: queryArg.body,');
    }
  }

  if (hasQuery) {
    lines.push('          params: {');
    for (var q of ep.queryParams) {
      lines.push('            ' + q.name + ': queryArg.' + q.name + ',');
    }
    lines.push('          },');
  }

  lines.push('        }),');
  return lines.join('\n');
}

// ─── Generate slice file ───────────────────────────────────────────────────

function genSlice(spec: OASpec, tag: string, endpoints: Endpoint[], config: CodegenConfig): string {
  var lines: string[] = [];

  // Import path to emptyApi (forward slashes!)
  var outDir = path.resolve(config.outputDir);
  var apiAbs = path.resolve(config.emptyApiPath);
  var relApi = fwd(path.relative(outDir, apiAbs)).replace(/\.ts$/, '');
  if (!relApi.startsWith('.')) relApi = './' + relApi;

  // Collect all type names used in this slice for the import from types.ts
  var usedTypes = new Set<string>();

  var argDefs: string[] = [];
  var resDefs: string[] = [];
  var endpointDefs: string[] = [];
  var hookExports: string[] = [];

  for (var ep of endpoints) {
    var arg = genArgType(ep);
    var res = genResType(ep);
    argDefs.push(arg.def);
    resDefs.push(res.def);

    // Collect refs from arg body
    if (ep.requestBody) collectRefs(ep.requestBody, usedTypes);
    // Collect refs from response
    if (ep.responseSchema) collectRefs(ep.responseSchema, usedTypes);
    // Collect refs from param schemas
    for (var p of ep.pathParams) collectRefs(p.schema, usedTypes);
    for (var q of ep.queryParams) collectRefs(q.schema, usedTypes);

    var isQuery = ep.method === 'GET';
    var buildType = isQuery ? 'query' : 'mutation';
    var epName = camel(ep.operationId);
    var qfn = genQueryFn(ep);

    endpointDefs.push(
      '      ' +
        epName +
        ': build.' +
        buildType +
        '<\n' +
        '        ' +
        res.name +
        ',\n' +
        '        ' +
        arg.name +
        '\n' +
        '      >({\n' +
        qfn +
        '\n' +
        '        ' +
        (isQuery ? "providesTags: ['" + tag + "']," : "invalidatesTags: ['" + tag + "'],") +
        '\n' +
        '      }),'
    );

    if (config.hooks) {
      hookExports.push('use' + pascal(ep.operationId) + (isQuery ? 'Query' : 'Mutation'));
    }
  }

  // Build import for types
  var typeImports = Array.from(usedTypes).sort();

  // Header
  lines.push('import { ' + config.emptyApiImport + " as api } from '" + relApi + "';");
  if (typeImports.length > 0) {
    lines.push('import type {');
    for (var ti of typeImports) {
      lines.push('  ' + ti + ',');
    }
    lines.push("} from './types';");
  }
  lines.push('');
  lines.push("export const addTagTypes = ['" + tag + "'] as const;");
  lines.push('');

  // Injected API
  lines.push('const injectedRtkApi = api');
  lines.push('  .enhanceEndpoints({');
  lines.push('    addTagTypes,');
  lines.push('  })');
  lines.push('  .injectEndpoints({');
  lines.push('    endpoints: (build) => ({');
  lines.push(endpointDefs.join('\n'));
  lines.push('    }),');
  lines.push('    overrideExisting: false,');
  lines.push('  });');
  lines.push('');
  lines.push('export { injectedRtkApi as ' + camel(tag) + 'Api };');
  lines.push('');

  // Arg/Response type aliases (local to this file)
  for (var ad of argDefs) lines.push(ad);
  for (var rd of resDefs) lines.push(rd);
  lines.push('');

  // Hook exports
  if (hookExports.length > 0) {
    lines.push('export const {');
    for (var h of hookExports) lines.push('  ' + h + ',');
    lines.push('} = injectedRtkApi;');
  }

  lines.push('');
  return lines.join('\n');
}

// ─── Generate index.ts ─────────────────────────────────────────────────────

function genIndex(tags: string[]): string {
  var lines = ["export * from './types';"];
  for (var tag of tags) {
    lines.push("export * from './" + tagToFile(tag) + ".slice';");
  }
  return lines.join('\n') + '\n';
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  var config = codegenConfig;

  console.log('Fetching swagger from: ' + config.swaggerUrl);
  var spec: OASpec = await fetchJson(config.swaggerUrl, config.auth);
  console.log('Got spec: ' + spec.info.title + ' v' + spec.info.version);

  var tagMap = parseEndpoints(spec);
  var tags = Array.from(tagMap.keys());
  console.log('Found ' + tags.length + ' tag(s): ' + tags.join(', '));

  var outDir = path.resolve(config.outputDir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Clean old
  for (var f of fs.readdirSync(outDir)) {
    if (f.endsWith('.slice.ts') || f === 'index.ts' || f === 'types.ts') {
      fs.unlinkSync(path.join(outDir, f));
    }
  }

  // Generate types.ts
  var typesContent = generateTypesFile(spec);
  fs.writeFileSync(path.join(outDir, 'types.ts'), typesContent, 'utf-8');
  var schemaCount = Object.keys((spec.components && spec.components.schemas) || {}).length;
  console.log('  types.ts (' + schemaCount + ' schemas)');

  // Generate slices
  for (var entry of tagMap.entries()) {
    var tag = entry[0],
      eps = entry[1];
    var fname = tagToFile(tag) + '.slice.ts';
    fs.writeFileSync(path.join(outDir, fname), genSlice(spec, tag, eps, config), 'utf-8');
    console.log('  ' + fname + ' (' + eps.length + ' endpoints)');
  }

  // Generate index
  fs.writeFileSync(path.join(outDir, 'index.ts'), genIndex(tags), 'utf-8');
  console.log('  index.ts');

  console.log('\nDone! Generated ' + tags.length + ' slices + types.ts');
}

main().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});
