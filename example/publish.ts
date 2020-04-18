import TopicClient from '../lib/topicClient';
import { normalTopic } from './options';

const topic = new TopicClient(normalTopic);

async function exec(): Promise<void> {
  try {
    const resp = await topic.send('im your dad 2!!!', 'test-tag', { abc: 123 });
    console.log(resp);
  } catch (e) {
    console.error('send error:', e);
  }
}

exec().finally(() => {
  process.exit(0);
});
