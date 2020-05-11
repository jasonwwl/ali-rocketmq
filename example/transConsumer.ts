import { Client } from '../lib';
import { transTopic } from './options';

const topic = new Client(transTopic);

topic.onMessage(async message => {
  console.log('[consumer-pid-%s] receive: ', process.pid, message.message);
  try {
    const resp = await message.done();
    console.log('[consumer-pid-%s]ack-message: ', process.pid, resp);
  } catch (e) {
    console.error('[consumer-pid-%s]ack error:', process.pid, e);
  }
});

topic.onHalfMessage(async message => {
  console.log('[half-consumer-pid-%s] receive: ', process.pid, message.message);
  try {
    const resp = await message.commit();
    console.log('[half-consumer-pid-%s]commit-message: ', process.pid, resp);
  } catch (e) {
    console.error('[half-consumer-pid-%s]ack error:', process.pid, e);
  }
});

topic.subscribe({
  numOfMessages: 3
});

topic.subscribeHalfMessage({
  numOfMessages: 3
});
