const fs = require('node:fs');
const path = require('node:path');

const distDir = path.resolve(process.cwd(), '.test-dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
);

const workspacePackages = {
  '@aura/core': '../../../packages/core/src/index.js',
  '@aura/types': '../../../packages/types/src/index.js',
  '@aura/ui': '../../../packages/ui/src/index.js',
};

for (const [packageName, main] of Object.entries(workspacePackages)) {
  const packageDir = path.join(distDir, 'node_modules', ...packageName.split('/'));
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        type: 'commonjs',
        main,
      },
      null,
      2,
    ),
  );
}
