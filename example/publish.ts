import TopicClient from '../lib';
import { normalTopic } from './options';

const topic = new TopicClient(normalTopic);

async function exec(): Promise<void> {
  try {
    const jobs = [];
    for (let i = 0; i < 100; i++) {
      jobs.push(topic.send('im your dad !!!' + i, 'test-tag' + i, { index: i }));
    }
    await Promise.all(jobs);
  } catch (e) {
    console.error('send error:', e);
  }
}

exec().finally(() => {
  process.exit(0);
});
