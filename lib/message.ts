import { MessageBody, ResponseConfirm } from '@aliyunmq/mq-http-sdk';
import { Client } from './index';

export default class Message {
  constructor(public readonly client: Client, public readonly message: MessageBody) {}
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
