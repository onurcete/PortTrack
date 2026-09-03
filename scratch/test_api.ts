import { signToken } from '../src/lib/jwt';

async function check() {
  const token = await signToken({ userId: 'cm7j4u...' }, '30d'); // let's find ceteonur's id
}
