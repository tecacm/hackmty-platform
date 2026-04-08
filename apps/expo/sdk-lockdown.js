const { withXcodeProject } = require('@expo/config-plugins');

module.exports = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        // Force iOS and prevent it from looking at the Mac SDK
        buildSettings['SDKROOT'] = 'iphoneos';
        buildSettings['SUPPORTED_PLATFORMS'] = 'iphonesimulator iphoneos';
        
        // Disable Header Maps to prevent "accidental" discovery of Mac headers
        buildSettings['USE_HEADERMAP'] = 'NO';
        
        // Strict modularity
        buildSettings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES';
        buildSettings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO';
      }
    }
    return config;
  });
};