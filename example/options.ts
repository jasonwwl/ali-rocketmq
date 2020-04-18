export const normalTopic = {
  endpoint: process.env.rmq_endpoint,
  instance: process.env.rmq_instance,
  accessKey: process.env.rmq_ak,
  accessSecret: process.env.rmq_as,
  topic: process.env.rmq_topic,
  group: process.env.rmq_group
};

export const transTopic = {
  endpoint: process.env.rmq_endpoint,
  instance: process.env.rmq_instance,
  accessKey: process.env.rmq_ak,
  accessSecret: process.env.rmq_as,
  topic: process.env.rmq_trans_topic,
  group: process.env.rmq_group
};
