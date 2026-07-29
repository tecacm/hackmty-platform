const appJson = require('./app.json')

module.exports = () => {
  const config = { ...appJson.expo }

  // If building for local personal development (which doesn't support APNs / Push capability),
  // strip out the 'expo-notifications' plugin to prevent provisioning errors in Xcode.
  if (process.env.EXPO_PERSONAL_DEV) {
    console.log('[Config] Building for local personal development - stripping push notifications capability.')
    config.plugins = config.plugins.filter(p => p !== 'expo-notifications')
  }

  return {
    expo: config,
  }
}
