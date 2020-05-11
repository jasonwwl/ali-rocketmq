import { Client } from '../lib';
import { transTopic } from './options';

const topic = new Client(transTopic);

async function exec(): Promise<void> {
  try {
    const message = await topic.sendTrans('(trans) im your dad!!!', 'test-trans-tag', { abc: 456, tciTime: 10 });
    console.log('message', message);
    const commitResp = await message.commit();
    console.log('commit', commitResp);
  } catch (e) {
    console.error('send error:', e);
  }
}

exec().finally(() => {
  process.exit(0);
});
