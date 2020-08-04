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
import { Message } from './message';
import { RequestError } from './requestError';
import { ConsumeResponseError } from './consumeResponseError';
import { TransMessage } from './transMessage';

export const EVENT = {
  MESSAGE: Symbol('@AliRocketMQ/EVENT/MESSAGE'),
  HALF_MESSAGE: Symbol('@AliRocketMQ/EVENT/HALF_MESSAGE'),
  MESSAGE_ERROR: Symbol('@AliRocketMQ/EVENT/MESSAGE_ERROR'),
  HALF_MESSAGE_ERROR: Symbol('@AliRocketMQ/EVENT/HALF_MESSAGE_ERROR'),
  CONSUME_ERROR: Symbol('@AliRocketMQ/EVENT/CONSUME_ERROR')
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

export type messageSyncHandler = (message: Message) => Promise<void>;

export class Client extends EventEmitter {
  public client: MQClient;
  public producer: MQProducer;
  public transProducer: MQTransProducer;
  public consumer: MQConsumer;
  private msgSyncHandler: messageSyncHandler;
  private msgTransSyncHandler: messageSyncHandler;

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

  async send(msg: unknown, tag?: string, props?: MsgProps, retry = true): Promise<ResponsePublish> {
    try {
      const res = await this.producer.publishMessage(JSON.stringify(msg), tag, props ? this.parseMsgProps(props) : null);
      return res;
    } catch (error) {
      if (retry) {
        return this.send(msg, tag, props, false);
      }
      throw error;
    }
  }

  async sendTrans(msg: unknown, tag?: string, props?: MsgProps): Promise<TransMessage> {
    const response = await this.transProducer.publishMessage(JSON.stringify(msg), tag, props ? this.parseMsgProps(props) : null);
    return new TransMessage(this, response.body);
  }

  ack(message: MessageBody): Promise<ResponseConfirm> {
    return this.consumer.ackMessage([message.ReceiptHandle]);
  }

  async next(options: SubscribeOptions): Promise<void> {
    while (1) {
      try {
        const result = await this.consumer.consumeMessage(options.numOfMessages, options.waitSeconds);
        if (result.code !== 200) {
          const err = new ConsumeResponseError(
            `consumer response status error, code: ${result.code}`,
            result.code,
            result.requestId,
            result.body
          );
          // this.emit(EVENT.MESSAGE_ERROR, err);
          throw err;
        }
        const workerRes = await Promise.allSettled(result.body.map(msg => this.msgSyncHandler(new Message(this, msg))));
        for (const item of workerRes) {
          if (item.status === 'rejected') {
            this.emit(EVENT.CONSUME_ERROR, item.reason);
          }
        }
      } catch (e) {
        if (e.message.search('MessageNotExist') >= 0) {
          // return null;
          continue;
        }
        this.emit(EVENT.MESSAGE_ERROR, e as RequestError);
      } finally {
        // await this.next(options);
      }
    }
  }

  async nextTrans(options: SubscribeOptions): Promise<void> {
    while (1) {
      try {
        const result = await this.transProducer.consumeHalfMessage(options.numOfMessages, options.waitSeconds || 10);
        if (result.code !== 200) {
          const err = new ConsumeResponseError(
            `consumer response status error, code: ${result.code}`,
            result.code,
            result.requestId,
            result.body
          );
          throw err;
        }
        const workerRes = await Promise.allSettled(result.body.map(msg => this.msgTransSyncHandler(new Message(this, msg))));
        for (const item of workerRes) {
          if (item.status === 'rejected') {
            this.emit(EVENT.CONSUME_ERROR, item.reason);
          }
        }
      } catch (e) {
        if (e.message.search('MessageNotExist') >= 0) {
          // return null;
          continue;
        }
        this.emit(EVENT.HALF_MESSAGE_ERROR, e as RequestError);
      } finally {
        // await this.nextTrans(options);
      }
    }
  }

  onMessageSync(options: SubscribeOptions, fn: messageSyncHandler): void {
    if (this.msgSyncHandler) {
      return null;
    }
    this.msgSyncHandler = fn;
    this.next(options);
  }

  onHalfMessageSync(options: SubscribeOptions, fn: messageSyncHandler): void {
    if (this.msgTransSyncHandler) {
      return null;
    }
    this.msgTransSyncHandler = fn;
    this.nextTrans(options);
  }

  subscribe(options: SubscribeOptions): void {
    process.nextTick(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const result = await this.consumer.consumeMessage(options.numOfMessages, options.waitSeconds || 10);
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
          if (e.message.search('MessageNotExist') >= 0) {
            continue;
          }
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
          const result = await this.transProducer.consumeHalfMessage(options.numOfMessages, options.waitSeconds || 10);
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
          if (e.message.search('MessageNotExist') >= 0) {
            continue;
          }
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

  onMessageError(fn: (err: Error) => void): this {
    return this.on(EVENT.MESSAGE_ERROR, fn);
  }

  onHalfMessageError(fn: (err: Error) => void): this {
    return this.on(EVENT.HALF_MESSAGE_ERROR, fn);
  }

  onConsumeError(fn: (err: Error) => void): this {
    return this.on(EVENT.CONSUME_ERROR, fn);
  }
}
