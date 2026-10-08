// Monorepo fix: the web app pulls React 19.3 to the repo root, but React Native
// 0.81 needs exactly the React 19.1.0 in apps/mobile/node_modules. Two copies
// in one bundle make hooks fail ("Cannot read property 'useEffect' of null"),
// so force every `react` import in the mobile bundle to the mobile copy.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
