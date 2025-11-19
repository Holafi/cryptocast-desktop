const { notarize } = require('electron-notarize');

module.exports = async function (params) {
  const { electronPlatformName, appOutDir } = params;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = '批量发奖工具';

  return await notarize({
    appBundleId: 'com.batch-airdrop.desktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};