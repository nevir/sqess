import _ from 'lodash';
import AWS from './AWS';

import * as utils from './utils';
import { Region, DEFAULTS } from './constants';

/**
 * The handler will be invoked with each item from the queue (or with an array
 * of queue items if {@link QueueConfig.batchSize} is specified) and should
 * return a Promise.
 */
export type QueueHandler = (queueItem: string | string[]) => Promise<void>;

export interface QueueConfig {
  /**
   * Must be a valid SQS queue name, i.e. only composed of alphanumeric
   * characters, hyphens (`-`), and/or underscores (`_`). The only exception is
   * for the `.fifo` suffix on FIFO queues. Note that the entire queue name,
   * even with a `.fifo` suffix, must still be 80 characters or less in length.
   */
  queueName: string;

  /**
   * Not required in case the client is only creating and/or populating the
   * queue.
   */
  handler?: QueueHandler;

  /**
   * Invoked whenever we poll the queue and it's empty.
   */
  onFinish?: Function;

  /**
   * A user-provided instance of AWS.SQS. If not provided, a default instance
   * will be used which attempts to use the default profile of the credentials
   * stored in `~/.aws/credentials` and region `us-west-2`.
   */
  sqs?: AWS.SQS;

  /**
   * Create a FIFO queue in order to leverage their benefits (guaranteed order,
   * deduplication, etc). Note that `.fifo` will be appended to the name of any
   * FIFO queues if not included already.
   *
   * @see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
   */
  fifo?: boolean;

  /**
   * The duration in seconds that a message will be 'invisible' to other queue
   * consumers after it starts being processed by the initial consumer. Our
   * default will be 600s (10 minutes).
   */
  visibilityTimeout?: number;

  /**
   * The number of seconds we'll wait for a message with each call to
   * `SQS.receiveMessage`. Defaults to the maximum allowed value of 20 seconds.
   */
  longPollingInterval?: number;

  /**
   * Specify a batch size in order to have your handler invoked with an array of
   * items. If `batchSize` isn't specified, your handler will be invoked with
   * only a single (non-array) queue item at a time.
   */
  batchSize?: number;

  /**
   * Item(s) from the queue will be deleted as soon as they're passed to the
   * handler. Use this only if you plan on processing each item only once or
   * have special logic within your handler function to deal with any failure
   * cases.
   */
  deleteImmediately?: boolean;
}

export interface QueueStats {
  messageCount: number;
  queueArn: string;
}

export default class Queue implements QueueConfig {
  public queueName: string;
  public queueUrl: string;

  public fifo: boolean;
  public sqs: AWS.SQS;
  public visibilityTimeout: number;
  public longPollingInterval: number;

  public handler: QueueHandler;
  public onFinish: Function;
  public batchSize: number;
  public deleteImmediately: boolean;

  constructor(config: QueueConfig) {
    utils.validateQueueName(config.queueName);
    // If this is a FIFO queue and the provided queue name
    // doesn't end with `.fifo`, append it now.
    if (config.fifo && !utils.isFifoQueueName(config.queueName)) {
      config.queueName = config.queueName + '.fifo';
    }
    _.defaults(this, config, {
      sqs: new AWS.SQS(),
      fifo: DEFAULTS.FIFO,
      batchSize: DEFAULTS.BATCH_SIZE,
      longPollingInterval: DEFAULTS.LONG_POLLING_INTERVAL_SECONDS,
      visibilityTimeout: DEFAULTS.VISIBILITY_TIMEOUT_SECONDS,
      handler: DEFAULTS.QUEUE_HANDLER,
      deleteImmediately: DEFAULTS.DELETE_IMMEDIATELY,
      onFinish: DEFAULTS.FINISH_HANDLER,
    });
  }

  /**
   * This must be called immediately after instantiation. This is what actually
   * creates the queue.
   */
  async create() {
    const Attributes: AWS.SQS.QueueAttributeMap = {
      VisibilityTimeout: String(this.visibilityTimeout),
      ReceiveMessageWaitTimeSeconds: String(this.longPollingInterval),
    };

    if (this.fifo) {
      Attributes.FifoQueue = 'true';
      Attributes.ContentBasedDeduplication = 'true';
    }

    const { QueueUrl } = await this.sqs
      .createQueue({ QueueName: this.queueName, Attributes })
      .promise();

    this.queueUrl = QueueUrl;
  }

  /**
   * Add item(s) to the queue. For the sake of simplicity, we'll accept either a
   * string or array of strings which we'll then cast as an array and pass to
   * `SQS.sendMessageBatch`.
   */
  async fill(items: string | string[]) {
    // Ensure we have an array of items so that we can process them uniformly
    items = _.castArray(items);
    // SQS only allows sending a max of 10 messages in each batch, so we'll
    // `_.chunk` them
    const chunkedItems = _.chunk(items, 10);
    // Don't `Promise.all` in case this is a FIFO queue and we're trying to
    // maintain our order
    for (const chunk of chunkedItems) {
      const batchMessageRequest = this.encodeBatchOfMessages(chunk);
      const { Successful, Failed } = await this.sqs
        .sendMessageBatch(batchMessageRequest)
        .promise();
      if (Failed.length) {
        throw new Error(
          `Failed to enqueue the following messages: ${Failed.map(
            failedMessage => JSON.stringify(failedMessage, null, 2),
          ).join('\n')}`,
        );
      }
    }
  }

  async process() {
    if (!this.queueUrl) {
      throw new Error(
        `The queue hasn't been created yet. Call 'queue.create()' before processing the queue.`,
      );
    }
    await this.receiveMessages();
  }

  /**
   * Attempt to delete the queue. Note that this will throw if the queue has
   * already been deleted or was never created in the first place.
   */
  async delete() {
    try {
      await this.sqs.deleteQueue({ QueueUrl: this.queueUrl }).promise();
    } catch (e) {
      throw new Error(
        `Encountered an error while attempting to delete the queue: ${e}`,
      );
    }
  }

  /**
   * Fetches the current approximate count of visible items in the queue.
   */
  async getQueueSize() {
    const { messageCount } = await this.getQueueStats();
    return messageCount;
  }

  /**
   * Fetches stats about the queue. For now this just grabs the current
   * approximate visible message count as well as the queue's ARN.
   */
  private async getQueueStats(): Promise<QueueStats> {
    const { Attributes } = await this.sqs
      .getQueueAttributes({
        QueueUrl: this.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'QueueArn'],
      })
      .promise();
    return {
      messageCount: Number(Attributes.ApproximateNumberOfMessages),
      queueArn: Attributes.QueueArn,
    };
  }

  /**
   * Takes an array of strings (messages) and returns a batch message request.
   */
  private encodeBatchOfMessages(
    messages: string[],
  ): AWS.SQS.SendMessageBatchRequest {
    return {
      QueueUrl: this.queueUrl,
      Entries: _.map(messages, (MessageBody, Id) => {
        const Message: AWS.SQS.SendMessageBatchRequestEntry = {
          MessageBody,
          Id: String(Id),
        };
        // If this is a FIFO queue, `MessageGroupId` is a required message
        // parameter. We're assuming that all messages belong to the same message
        // group and must therefore be unique.
        if (this.fifo) Message.MessageGroupId = '1';
        return Message;
      }),
    };
  }

  /**
   * Our private message long-polling method. Long-polls the queue for
   * {@link QueueConfig.longPollingInterval} seconds at a time (up to a max of
   * 20). We'll have this method call itself again at the end of the interval
   * after checking to make sure that there are still items left in the queue.
   */
  private async receiveMessages() {
    const data = await this.sqs
      .receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.batchSize,
      })
      .promise();

    if (data.Messages) {
      // If `deleteImmediately` was set, front-load the deletion of received messages.
      if (this.deleteImmediately) await this.deleteMessages(data.Messages);

      if (this.batchSize === 1) {
        if (data.Messages.length !== 1) {
          throw new Error(
            `The configured batchSize is 1 but 'receiveMessages' returned more than 1 message`,
          );
        }
        const message = this.extractMessageBody(data.Messages[0]);
        await this.handler(message);
      } else {
        await this.handler(data.Messages.map(this.extractMessageBody));
      }

      // If `deleteImmediately` was not set, back-load the deletion of received messages.
      if (!this.deleteImmediately) await this.deleteMessages(data.Messages);
    }

    // Whether or not we just got done handling any messages, check the current
    // queue size and call `this.onFinish` if it's empty, otherwise call
    // `this.receiveMessages` again.
    if (!await this.getQueueSize()) return this.onFinish();
    return this.receiveMessages();
  }

  private extractMessageBody(rawMessage: AWS.SQS.Message): string {
    return rawMessage.Body;
  }

  /**
   * Deletes an array of messages.
   */
  private async deleteMessages(messages: AWS.SQS.Message[]) {
    const { Failed } = await this.sqs
      .deleteMessageBatch({
        QueueUrl: this.queueUrl,
        Entries: <any>_.map(messages, ({ ReceiptHandle }, index) => ({
          Id: String(index),
          ReceiptHandle,
        })),
      })
      .promise();
    if (Failed.length) {
      throw new Error(
        `Failed to delete the following messages: ${Failed.map(failedMessage =>
          JSON.stringify(failedMessage, null, 2),
        ).join('\n')}`,
      );
    }
  }
}
