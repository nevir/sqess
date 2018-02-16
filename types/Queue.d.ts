import AWS from './AWS';
/**
 * The handler will be invoked with each item from the queue (or with an array
 * of queue items if {@link QueueConfig.batchSize} is specified) and should
 * return a Promise.
 */
export declare type QueueHandler = (queueItem: string | string[]) => Promise<void>;
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
    queueName: string;
    queueUrl: string;
    fifo: boolean;
    sqs: AWS.SQS;
    visibilityTimeout: number;
    longPollingInterval: number;
    handler: QueueHandler;
    onFinish: Function;
    batchSize: number;
    deleteImmediately: boolean;
    constructor(config: QueueConfig);
    /**
     * This must be called immediately after instantiation. This is what actually
     * creates the queue.
     */
    create(): Promise<void>;
    /**
     * Add item(s) to the queue. For the sake of simplicity, we'll accept either a
     * string or array of strings which we'll then cast as an array and pass to
     * `SQS.sendMessageBatch`.
     */
    fill(items: string | string[]): Promise<void>;
    process(): Promise<void>;
    /**
     * Attempt to delete the queue. Note that this will throw if the queue has
     * already been deleted or was never created in the first place.
     */
    delete(): Promise<void>;
    /**
     * Fetches the current approximate count of visible items in the queue.
     */
    getQueueSize(): Promise<number>;
    /**
     * Fetches stats about the queue. For now this just grabs the current
     * approximate visible message count as well as the queue's ARN.
     */
    private getQueueStats();
    /**
     * Takes an array of strings (messages) and returns a batch message request.
     */
    private encodeBatchOfMessages(messages);
    /**
     * Our private message long-polling method. Long-polls the queue for
     * {@link QueueConfig.longPollingInterval} seconds at a time (up to a max of
     * 20). We'll have this method call itself again at the end of the interval
     * after checking to make sure that there are still items left in the queue.
     */
    private receiveMessages();
    private extractMessageBody(rawMessage);
    /**
     * Deletes an array of messages.
     */
    private deleteMessages(messages);
}
