import { prisma } from '../src/lib/prisma';
import { getPeriodReturns } from '../src/lib/history';

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'ceteonur@gmail.com' } });
  if (!user) return;
  console.log('Fetching for:', user.email);
  const ret = await getPeriodReturns(user.id);
  console.log('Timelines keys:', Object.keys(ret.timelines || {}));
  console.log('1G count:', ret.timelines?.['1G']?.length);
  console.log('1H count:', ret.timelines?.['1H']?.length);
  console.log('MTD count:', ret.timelines?.['MTD']?.length);
  console.log('YTD count:', ret.timelines?.['YTD']?.length);
  console.log('1Y count:', ret.timelines?.['1Y']?.length);

  console.log('\n--- YTD FIRST 3 & LAST 3 ---');
  console.log(ret.timelines?.['YTD']?.slice(0, 3));
  console.log(ret.timelines?.['YTD']?.slice(-3));

  console.log('\n--- 1Y FIRST 3 & LAST 3 ---');
  console.log(ret.timelines?.['1Y']?.slice(0, 3));
  console.log(ret.timelines?.['1Y']?.slice(-3));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
