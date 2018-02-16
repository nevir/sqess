/**
 * Matches against valid standard queue names. The only valid non-standard queue
 * names belong to FIFO queues which have `.fifo` appended.
 */
export const STANDARD_QUEUE_NAME_MATCHER = /^[a-zA-Z0-9_-]{1,80}$/;

/**
 * Ensures that a queue name is between 1-80 characters long and doesn't contain
 * any illegal characters. See {@link QueueConfig.queueName}.
 */
export function validateQueueName(queueName: string) {
  if (!queueName) throw new Error(`You must provide a queue name`);
  if (queueName.length > 80) {
    throw new Error(`Queue names cannot be longer than 80 characters`);
  }
  // For FIFO queues, remove the `.fifo` before validating the character set
  if (isFifoQueueName(queueName)) queueName = queueName.slice(0, -5);
  if (!STANDARD_QUEUE_NAME_MATCHER.test(queueName)) {
    throw new Error(`Queue name '${queueName}' contains invalid characters`);
  }
}

export function isFifoQueueName(queueName: string) {
  return queueName.slice(queueName.length - 5) === '.fifo';
}
