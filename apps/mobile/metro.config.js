const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo workspace (for shared packages)
config.watchFolders = [workspaceRoot];

// 2. Force Metro to resolve dependencies from the monorepo root node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(config, { input: './src/global.css' });
