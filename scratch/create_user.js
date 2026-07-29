const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.upsert({
    where: { email: 'seay34@gmail.com' },
    update: {
      name: 'Serdar Günay',
      password: hashPasswordSync('serdar123'),
    },
    create: {
      name: 'Serdar Günay',
      email: 'seay34@gmail.com',
      password: hashPasswordSync('serdar123'),
      role: 'USER',
    },
  });

  console.log('✅ KULLANICI BAŞARIYLA OLUŞTURULDU:');
  console.log('ID:', user.id);
  console.log('İsim:', user.name);
  console.log('E-Posta:', user.email);
  console.log('Rol:', user.role);
}

main().catch(console.error);
