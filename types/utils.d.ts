/**
 * Matches against valid standard queue names. The only valid non-standard queue
 * names belong to FIFO queues which have `.fifo` appended.
 */
export declare const STANDARD_QUEUE_NAME_MATCHER: RegExp;
/**
 * Ensures that a queue name is between 1-80 characters long and doesn't contain
 * any illegal characters. See {@link QueueConfig.queueName}.
 */
export declare function validateQueueName(queueName: string): void;
export declare function isFifoQueueName(queueName: string): boolean;
