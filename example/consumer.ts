import TopicClient from '../lib/topicClient';
import { normalTopic } from './options';

const topic = new TopicClient(normalTopic);

topic.onMessage(async message => {
  console.log('[consumer-pid-%s] receive: ', process.pid, message.message);
  try {
    const resp = await message.done();
    console.log('[consumer-pid-%s]ack-message: ', process.pid, resp);
  } catch (e) {
    console.error('[consumer-pid-%s]ack error:', process.pid, e);
  }
});

topic.subscribe({
  numOfMessages: 3
});
