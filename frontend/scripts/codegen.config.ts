import * as path from 'path';

/**
 * ─── Codegen Configuration ──────────────────────────
 *
 * All values come from ENV (with sane defaults).
 * Create a .env in project root or pass inline:
 *
 *   SWAGGER_URL=http://localhost:3001/api-docs-json npm run codegen
 *
 * ENV:
 *   SWAGGER_URL            — Swagger JSON endpoint (required)
 *   SWAGGER_AUTH_USERNAME   — Basic auth user (optional, for protected Swagger)
 *   SWAGGER_AUTH_PASSWORD   — Basic auth pass (optional)
 *   CODEGEN_OUTPUT_DIR      — Where to put generated slices (default: src/store/api)
 *   CODEGEN_EMPTY_API_PATH  — Path to emptyApi.ts (default: src/store/emptyApi.ts)
 *   CODEGEN_EMPTY_API_IMPORT — Export name from emptyApi (default: emptySplitApi)
 *   CODEGEN_HOOKS           — Generate React hooks (default: true)
 */

// Try loading .env (works if dotenv is installed, silent fail otherwise)
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {}

export interface CodegenConfig {
  swaggerUrl: string;
  auth?: { username: string; password: string };
  outputDir: string;
  emptyApiPath: string;
  emptyApiImport: string;
  hooks: boolean;
}

const swaggerUrl = process.env.SWAGGER_URL || '';
const authUser = process.env.SWAGGER_AUTH_USERNAME || '';
const authPass = process.env.SWAGGER_AUTH_PASSWORD || '';

export const codegenConfig: CodegenConfig = {
  swaggerUrl,
  auth: authUser && authPass ? { username: authUser, password: authPass } : undefined,
  outputDir: process.env.CODEGEN_OUTPUT_DIR || 'src/store/api',
  emptyApiPath: process.env.CODEGEN_EMPTY_API_PATH || 'src/store/empty-api.ts',
  emptyApiImport: process.env.CODEGEN_EMPTY_API_IMPORT || 'emptySplitApi',
  hooks: process.env.CODEGEN_HOOKS !== 'false',
};

if (!codegenConfig.swaggerUrl) {
  console.error(
    '❌ SWAGGER_URL is not set.\n\n' +
      '   Add to .env:        SWAGGER_URL=http://localhost:3001/api-docs-json\n' +
      '   Or pass inline:     SWAGGER_URL=http://localhost:3001/api-docs-json npm run codegen\n'
  );
  process.exit(1);
}
