import {
  MQClient,
  MQTransProducer,
  MQProducer,
  MQConsumer,
  ResponsePublish,
  MessageBody,
  ResponseConfirm,
  MsgProps,
  MessageProperties
} from '@aliyunmq/mq-http-sdk';
import { EventEmitter } from 'events';
import Message from './message';
import RequestError from './requestError';
import ConsumeResponseError from './consumeResponseError';
import TransMessage from './transMessage';

export const EVENT = {
  MESSAGE: Symbol('@AliRocketMQ/EVENT/MESSAGE'),
  HALF_MESSAGE: Symbol('@AliRocketMQ/EVENT/HALF_MESSAGE'),
  MESSAGE_ERROR: Symbol('@AliRocketMQ/EVENT/MESSAGE_ERROR'),
  HALF_MESSAGE_ERROR: Symbol('@AliRocketMQ/EVENT/HALF_MESSAGE_ERROR')
};

export interface Options {
  endpoint: string;
  accessKey: string;
  accessSecret: string;
  topic: string;
  group: string;
  instance: string;
}

export interface SubscribeOptions {
  numOfMessages: number;
  waitSeconds?: number;
}

export interface PublishMessageResponse {
  Code: string;
  RequestId: string;
}

export default class TopicClient extends EventEmitter {
  client: MQClient;
  producer: MQProducer;
  transProducer: MQTransProducer;
  consumer: MQConsumer;
  constructor(public options: Options) {
    super();
    const { endpoint, accessKey, accessSecret, topic, group, instance } = options;
    this.client = new MQClient(endpoint, accessKey, accessSecret) as MQClient;
    this.producer = this.client.getProducer(instance, topic);
    this.transProducer = this.client.getTransProducer(instance, topic, group);
    this.consumer = this.client.getConsumer(instance, topic, group);
  }

  parseMsgProps(props: MsgProps = {}): MessageProperties {
    const msgProps = new MessageProperties();
    for (const k in props) {
      if (k === 'sdTime') {
        msgProps.startDeliverTime(props[k]);
      } else if (k === 'tciTime') {
        msgProps.transCheckImmunityTime(props[k]);
      } else if (k === 'key') {
        msgProps.messageKey(props[k]);
      } else {
        msgProps.putProperty(k, props[k]);
      }
    }
    return msgProps;
  }

  send(msg: string, tag?: string, props?: MsgProps): Promise<ResponsePublish> {
    return this.producer.publishMessage(msg, tag, props ? this.parseMsgProps(props) : null);
  }

  async sendTrans(msg: string, tag?: string, props?: MsgProps): Promise<TransMessage> {
    const response = await this.transProducer.publishMessage(msg, tag, props ? this.parseMsgProps(props) : null);
    return new TransMessage(this, response.body);
  }

  ack(message: MessageBody): Promise<ResponseConfirm> {
    return this.consumer.ackMessage([message.ReceiptHandle]);
  }

  subscribe(options: SubscribeOptions): void {
    process.nextTick(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const result = await this.consumer.consumeMessage(options.numOfMessages, options.waitSeconds);
          if (result.code !== 200) {
            const err = new ConsumeResponseError(
              `consumer response status error, code: ${result.code}`,
              result.code,
              result.requestId,
              result.body
            );
            this.emit(EVENT.MESSAGE_ERROR, err);
            continue;
          }
          for (const message of result.body) {
            this.emit(EVENT.MESSAGE, new Message(this, message));
          }
        } catch (e) {
          this.emit(EVENT.MESSAGE_ERROR, e as RequestError);
        }
      }
    });
  }

  subscribeHalfMessage(options: SubscribeOptions): void {
    process.nextTick(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const result = await this.transProducer.consumeHalfMessage(options.numOfMessages, options.waitSeconds);
          if (result.code !== 200) {
            const err = new ConsumeResponseError(
              `consumer response status error, code: ${result.code}`,
              result.code,
              result.requestId,
              result.body
            );
            this.emit(EVENT.HALF_MESSAGE_ERROR, err);
            continue;
          }
          for (const message of result.body) {
            this.emit(EVENT.HALF_MESSAGE, new Message(this, message));
          }
        } catch (e) {
          this.emit(EVENT.HALF_MESSAGE_ERROR, e as RequestError);
        }
      }
    });
  }

  onMessage(fn: (message: Message) => void): this {
    return this.on(EVENT.MESSAGE, fn);
  }

  onHalfMessage(fn: (message: Message) => void): this {
    return this.on(EVENT.HALF_MESSAGE, fn);
  }

  onMessageError(fn: () => void): this {
    return this.on(EVENT.MESSAGE_ERROR, fn);
  }

  onHalfMessageError(fn: () => void): this {
    return this.on(EVENT.HALF_MESSAGE_ERROR, fn);
  }
}
