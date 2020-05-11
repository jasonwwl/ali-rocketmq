import { normalTopic } from './options';
import { Client } from '../lib';

const topic = new Client(normalTopic);

// topic.onMessage(async message => {
//   console.log('[consumer-pid-%s] receive: ', process.pid, message.message);
//   try {
//     const resp = await message.done();
//     console.log('[consumer-pid-%s]ack-message: ', process.pid, resp);
//   } catch (e) {
//     console.error('[consumer-pid-%s]ack error:', process.pid, e);
//   }
// });

// topic.subscribe({
//   numOfMessages: 3
// });
// let counts = 0;
topic.onMessageSync({ numOfMessages: 3, waitSeconds: 10 }, async message => {
  // console.log('[consumer-pid-%s] receive: ', process.pid, message.message);
  // console.log(message.message.MessageBody);
  // counts += 1;
  // console.log(counts);
  try {
    const resp = await message.done();
    console.log('[consumer-pid-%s]ack-message: ', process.pid, resp);
  } catch (e) {
    console.error('[consumer-pid-%s]ack error:', process.pid, e);
    throw e;
  }
});
