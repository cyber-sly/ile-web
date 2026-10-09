// Metro config: the app imports business rules from ../shared (outside this
// project), so Metro must watch that folder and resolve the @shared alias.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const sharedDir = path.resolve(__dirname, "../shared");

config.watchFolders = [...(config.watchFolders || []), sharedDir];
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), "@shared": sharedDir };

module.exports = config;
