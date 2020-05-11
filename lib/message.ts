import { MessageBody, ResponseConfirm } from '@aliyunmq/mq-http-sdk';
import { Client } from './index';

export class Message {
  public content: object | string | Array<unknown> | number | null;
  public tag: string | null;
  public props: MessageBody['Properties'];
  public key: string | null;

  constructor(public readonly client: Client, public readonly message: MessageBody) {
    this.content = JSON.parse(message.MessageBody);
    this.key = message.MessageKey;
    this.tag = message.MessageTag;
    this.props = message.Properties;
  }

  done(): Promise<ResponseConfirm> {
    return this.client.consumer.ackMessage([this.message.ReceiptHandle]);
  }

  commit(): Promise<ResponseConfirm> {
    return this.client.transProducer.commit(this.message.ReceiptHandle);
  }

  rollback(): Promise<ResponseConfirm> {
    return this.client.transProducer.rollback(this.message.ReceiptHandle);
  }
}
