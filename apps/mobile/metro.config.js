// Monorepo-aware Metro config — required so Metro resolves pnpm workspace
// packages (e.g. @mmusic/design-tokens) that live outside apps/mobile.
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// pnpm links workspace packages via symlinks — Metro needs this to follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// One copy of React and zustand in the bundle. @mmusic/core and @mmusic/ui-kit
// keep their own dev copies (React 19.2.x, shared with the website), while this
// app runs React 19.3 (Expo SDK 58); resolving these from the app for every
// importer prevents two Reacts ("Invalid hook call") and two zustand instances.
const singletons = ['react', 'zustand'];
const appOrigin = path.join(projectRoot, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletons.some((name) => moduleName === name || moduleName.startsWith(`${name}/`))) {
    return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
