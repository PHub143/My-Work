require('dotenv').config();
const configService = require('./services/configService');
async function test() {
  const configs = await configService.getAllDriveConfigs();
  console.log('All Configs:', configs);
  if (configs.length > 0) {
    const config = await configService.getDriveConfig(configs[0].id);
    console.log('Got config:', config.name);
  }
}
test().catch(console.error);
