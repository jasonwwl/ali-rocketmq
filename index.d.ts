// declare class AlimqRequestError extends Error {
//   Code: string;
//   RequestId: string;
// }

declare module '@aliyunmq/mq-http-sdk' {
  export class MQClient {
    endpoint: string;
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
    constructor(endpoint: string, accessKeyId: string, accessKeySecret: string, securityToken?: string);
    getConsumer(instanceId: string, topic: string, consumer: string, messageTag?: string): MQConsumer;
    getProducer(instanceId: string, topic: string): MQProducer;
    getTransProducer(instanceId: string, topic: string, group: string): MQTransProducer;
  }

  export class MessageProperties {
    messageKey(key: string): void;
    startDeliverTime(timeMillis: number): void;
    transCheckImmunityTime(timeSeconds: number): void;
    putProperty(key: string, value: string | number): void;
  }

  export class MQProducer {
    client: string;
    instanceId: string;
    topic: string;
    constructor(client: string, instanceId: string, topic: string);
    publishMessage(body: string, tag?: string, msgProps?: MessageProperties): Promise<ResponsePublish>;
  }

  export class MQTransProducer {
    client: string;
    instanceId: string;
    topic: string;
    groupId: string;
    constructor(client: string, instanceId: string, topic: string, groupId: string);
    publishMessage(body: string, tag?: string, msgProps?: MessageProperties): Promise<ResponsePublish>;
    /**
     * 消费检查事务半消息,默认如果该条消息没有被 {commit} 或者 {rollback} 在NextConsumeTime时会再次消费到该条消息
     * @param numOfMessages 每次从服务端消费条消息
     * @param waitSeconds 长轮询的等待时间（可空），如果服务端没有消息请求会在该时间之后返回等于请求阻塞在服务端，如果期间有消息立刻返回
     */
    consumeHalfMessage(numOfMessages: number, waitSeconds?: number): Promise<ResponseMessages>;
    commit(receiptHandles: ReceiptHandle): Promise<ResponseConfirm>;
    rollback(receiptHandles: ReceiptHandle): Promise<ResponseConfirm>;
  }

  export class MQConsumer {
    instanceId: string;
    topic: string;
    consumer: string;
    messageTag?: string;
    constructor(instanceId: string, topic: string, consumer: string, messageTag?: string);
    /**
     *
     * @param numOfMessages
     * @param waitSeconds
     */
    consumeMessage(numOfMessages: number, waitSeconds?: number): Promise<ResponseMessages>;
    ackMessage(receiptHandles: ReceiptHandle[]): Promise<ResponseConfirm>;
  }

  type ReceiptHandle = string;

  interface MsgProps {
    /**
     * 定时消息，单位毫秒（ms），在指定时间戳（当前时间之后）进行投递。
     * 如果被设置成当前时间戳之前的某个时刻，消息将立刻投递给消费者
     */
    sdTime?: number;

    /**
     * 在消息属性中添加第一次消息回查的最快时间，单位秒，并且表征这是一条事务消息
     */
    tciTime?: number;

    /**
     * 设置消息KEY
     */
    key?: string;

    /**
     * 自定义消息属性
     */
    [k: string]: string | number;
  }

  interface Response {
    readonly code: number;
    readonly requestId: string;
  }

  interface ResponseConfirmError {
    readonly ErrorCode: string;
    readonly ErrorMessage: string;
    readonly ReceiptHandle: ReceiptHandle;
  }

  interface ResponseConfirm extends Response {
    readonly body?: ResponseConfirmError[];
  }

  interface ResponsePublish extends Response {
    readonly body: {
      /**
       * 消息ID
       */
      readonly MessageId: string;
      /**
       * 消息体MD5
       */
      readonly MessageBodyMD5: string;
      /**
       *  消息句柄，仅事务消息存在
       */
      readonly ReceiptHandle?: ReceiptHandle;
    };
  }

  interface MessageBody {
    /**
     * 消息ID
     */
    readonly MessageId: string;
    /**
     * 消息体MD5
     */
    readonly MessageBodyMD5: string;
    /**
     * 发送消息的时间戳，毫秒
     */
    readonly PublishTime: number;
    /**
     * 下次重试消费的时间，前提是这次不调用{ackMessage} 确认消费消费成功，毫秒
     */
    readonly NextConsumeTime: number;
    /**
     * 第一次消费的时间，毫秒
     */
    readonly FirstConsumeTime: number;
    /**
     * 消费的次数
     */
    readonly ConsumedTimes: number;
    /**
     * 消息句柄，调用 {ackMessage} 需要将消息句柄传入，用于确认该条消息消费成功
     */
    readonly ReceiptHandle: ReceiptHandle;
    /**
     * 消息内容
     */
    readonly MessageBody: string;
    /**
     * 消息标签
     */
    readonly MessageTag: string;
    /**
     * 表示定时消息的定时绝对时间，UNIX 毫秒时间戳 或
     * 表示第一次事务消息的回查时间，相对时间，单位秒，取值范围：10～300
     */
    readonly StartDeliverTime?: number;
    /**
     * 消息的 Key
     */
    readonly MessageKey?: number;
    /**
     * 消息自定义属性
     */
    readonly Properties?: {
      [k: string]: string;
    };
  }

  interface ResponseMessages extends Response {
    readonly body: MessageBody[];
  }
}
