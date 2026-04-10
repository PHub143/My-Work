const prisma = require('./services/prismaService');

async function checkConfig() {
  try {
    const config = await prisma.driveConfig.findUnique({
      where: { id: 'singleton' }
    });
    
    if (!config) {
      console.log('No configuration found in database.');
      return;
    }

    console.log('Config found:');
    console.log('clientId:', config.clientId);
    console.log('clientSecret (raw):', config.clientSecret);
    console.log('refreshToken (raw):', config.refreshToken);
    
    const secretParts = config.clientSecret ? config.clientSecret.split(':') : [];
    console.log('clientSecret parts count:', secretParts.length);
    
    if (secretParts.length === 2) {
      console.log('ALERT: clientSecret appears to be in old CBC format (iv:encrypted). GCM expects (iv:authTag:encrypted).');
    } else if (secretParts.length === 3) {
      console.log('Format looks like GCM (iv:authTag:encrypted).');
    }
    
  } catch (error) {
    console.error('Error checking config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
