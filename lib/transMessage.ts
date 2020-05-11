import { ResponseConfirm, ResponsePublish } from '@aliyunmq/mq-http-sdk';
import { Client } from './index';

export class TransMessage {
  constructor(public readonly client: Client, public readonly message: ResponsePublish['body']) {}
  commit(): Promise<ResponseConfirm> {
    return this.client.transProducer.commit(this.message.ReceiptHandle);
  }
  rollback(): Promise<ResponseConfirm> {
    return this.client.transProducer.rollback(this.message.ReceiptHandle);
  }
}
