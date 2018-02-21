import _ from 'lodash';

jest.mock('aws-sdk');
jest.unmock('../src/Queue');

const AWS = require('aws-sdk');
const Queue = require('../src/Queue').default;

const promiseFn = jest.fn();
const createQueueFn = jest.fn();
const deleteQueueFn = jest.fn();
const getQueueAttributesFn = jest.fn();
const sendMessageBatchFn = jest.fn();
const receiveMessageFn = jest.fn();
const deleteMessageBatchFn = jest.fn();

promiseFn.mockImplementation(() => ({ promise: promiseFn }));
createQueueFn.mockImplementation(() => ({ promise: promiseFn }));
deleteQueueFn.mockImplementation(() => ({ promise: promiseFn }));
getQueueAttributesFn.mockImplementation(() => ({ promise: promiseFn }));
sendMessageBatchFn.mockImplementation(() => ({ promise: promiseFn }));
receiveMessageFn.mockImplementation(() => ({ promise: promiseFn }));
deleteMessageBatchFn.mockImplementation(() => ({ promise: promiseFn }));

AWS.SQS = jest.fn();
AWS.SQS.mockImplementation(() => ({
  createQueue: createQueueFn,
  deleteQueue: deleteQueueFn,
  getQueueAttributes: getQueueAttributesFn,
  sendMessageBatch: sendMessageBatchFn,
  receiveMessage: receiveMessageFn,
  deleteMessageBatch: deleteMessageBatchFn,
}));

const clearMocks = () => {
  promiseFn.mockReset();
  createQueueFn.mockClear();
  deleteQueueFn.mockClear();
  getQueueAttributesFn.mockClear();
  sendMessageBatchFn.mockClear();
  receiveMessageFn.mockClear();
  deleteMessageBatchFn.mockClear();
  AWS.SQS.mockClear();
};

describe(`Queue`, () => {
  let queue,
    params,
    sqs,
    queueName = 'foo-bar-1',
    queueUrl = 'https://MOCK-REGION.amazonaws.com/15802785/MOCK_QUEUE_NAME';

  beforeEach(async () => {
    clearMocks();
    sqs = new AWS.SQS();
    params = {
      queueName,
      handler: jest.fn(),
      onFinish: jest.fn(),
      sqs,
    };
    queue = new Queue(params);
    promiseFn.mockReturnValueOnce(Promise.resolve({ QueueUrl: queueUrl }));
    await queue.create();
  });

  describe(`constructor`, () => {
    it(`validates the name, even when injecting the .fifo suffix`, () => {
      expect(() => {
        new Queue({
          ...params,
          fifo: true,
          queueName:
            'a-queue-name-with-79-chars-that-exceeds-the-limit-when-the-fifo-suffix-is-added',
        });
      }).toThrow(/characters/i);
    });
  });

  describe(`create`, () => {
    it(`creates a queue with the provided name`, () => {
      expect(queue.queueUrl).toBe(queueUrl);
    });

    it(`creates a queue with the provided name and a '.fifo' suffix if 'fifo' is true`, () => {
      params.fifo = true;
      queue = new Queue(params);
      expect(queue.queueName).toBe(queueName + '.fifo');
    });

    it(`passes the proper fifo-related attributes to the 'createQueue' method`, async () => {
      params.fifo = true;
      queue = new Queue(params);
      promiseFn.mockReturnValueOnce(Promise.resolve({ QueueUrl: queueUrl }));
      await queue.create();
      expect(createQueueFn.mock.calls[1][0]).toMatchObject({
        Attributes: { FifoQueue: 'true', ContentBasedDeduplication: 'true' },
      });
    });
  });

  describe(`fill`, () => {
    it(`invokes sqs.sendMessageBatch with 10 items at a time`, async () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Successful: [], Failed: [] }),
      );
      const items = _.times(12, index => String(index));
      await queue.fill(items);
      expect(sendMessageBatchFn.mock.calls[0][0]).toMatchObject({
        Entries: items.slice(0, 10).map(item => ({ MessageBody: item })),
      });
    });

    it(`throws if any failures are reported`, () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Successful: [], Failed: [{ foo: 'fake-message' }] }),
      );
      const items = _.times(12, index => String(index));
      expect(queue.fill(items)).rejects;
    });
  });

  describe(`process`, () => {
    it(`throws if there's no queueUrl`, () => {
      queue.queueUrl = '';
      expect(queue.process()).rejects;
    });

    it(`calls queue.receiveMessages()`, async () => {
      queue.receiveMessages = jest.fn();
      await queue.process();
      expect(queue.receiveMessages).toHaveBeenCalled();
    });
  });

  describe(`delete`, () => {
    it(`throws if there's a problem deleting the queue`, async () => {
      promiseFn.mockReturnValue(Promise.reject(`FOO BAR BAZ`));
      expect(queue.delete()).rejects;
    });

    it(`invokes sqs.deleteQueue with the queueUrl`, async () => {
      await queue.delete();
      expect(deleteQueueFn.mock.calls[0][0]).toMatchObject({
        QueueUrl: queueUrl,
      });
    });
  });

  describe(`getQueueSize`, () => {
    it(`calls queue.getQueueStats()`, async () => {
      queue.getQueueStats = jest.fn();
      queue.getQueueStats.mockReturnValue({ messageCount: 4 });
      await queue.getQueueSize();
      expect(queue.getQueueStats).toHaveBeenCalled();
    });
  });

  describe(`getQueueStats`, () => {
    it(`invoked sqs.getQueueAttributes with the correct arguments`, async () => {
      promiseFn.mockReturnValue(Promise.resolve({ Attributes: {} }));
      await queue.getQueueStats();
      expect(getQueueAttributesFn.mock.calls[0][0]).toMatchObject({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'QueueArn'],
      });
    });
  });

  describe(`encodeBatchOfMessages`, () => {
    it(`includes 'MessageGroupId' if 'fifo' is true`, () => {
      queue.fifo = true;
      const items = ['foo'];
      const encodedItems = queue.encodeBatchOfMessages(items);
      expect(encodedItems).toMatchObject({
        QueueUrl: queueUrl,
        Entries: [
          {
            MessageBody: 'foo',
            MessageGroupId: '1',
          },
        ],
      });
    });
  });

  describe(`extractMessageBody`, () => {
    it(`returns the body of the message`, () => {
      const messageBody = queue.extractMessageBody({ Body: 'foo' });
      expect(messageBody).toMatch('foo');
    });
  });

  describe(`receiveMessages`, () => {
    it(`calls sqs.receiveMessage with the correct arguments`, async () => {
      promiseFn.mockReturnValue(Promise.resolve({ Messages: null }));
      queue.getQueueSize = jest.fn(async () => 0);
      await queue.receiveMessages();
      expect(receiveMessageFn.mock.calls[0][0]).toMatchObject({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: queue.batchSize,
      });
    });

    it(`calls queue.extractMessageBody with any messages received`, async () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Messages: [{ MessageBody: 'foo' }] }),
      );
      queue.extractMessageBody = jest.fn(() => 'foo');
      queue.deleteMessages = jest.fn();
      queue.getQueueSize = jest.fn(async () => 0);
      await queue.receiveMessages();
      expect(queue.extractMessageBody.mock.calls[0][0]).toMatchObject({
        MessageBody: 'foo',
      });
    });

    it(`throws if the batchSize is 1 but more than 1 message is received at a time`, async () => {
      promiseFn.mockReturnValue(
        Promise.resolve({
          Messages: [{ MessageBody: 'foo' }, { MessageBody: 'foo2' }],
        }),
      );
      queue.extractMessageBody = jest.fn(() => 'foo');
      queue.getQueueSize = jest.fn(async () => 0);
      queue.deleteMessages = jest.fn();
      queue.handler = jest.fn(async () => {});
      expect(queue.receiveMessages()).rejects;
    });

    it(`calls the handler function with any messages received`, async () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Messages: [{ MessageBody: 'foo' }] }),
      );
      queue.extractMessageBody = jest.fn(() => 'foo');
      queue.getQueueSize = jest.fn(async () => 0);
      queue.deleteMessages = jest.fn();
      queue.handler = jest.fn(async () => {});
      queue.batchSize = 2;
      await queue.receiveMessages();
      expect(queue.handler.mock.calls[0][0]).toMatchObject(['foo']);
    });

    it(`returns a promise if there are more items in the queue`, async () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Messages: [{ MessageBody: 'foo' }] }),
      );
      queue.extractMessageBody = jest.fn(() => 'foo');
      queue.getQueueSize = jest.fn(async () => 1);
      queue.deleteMessages = jest.fn();
      setTimeout(() => {
        queue.getQueueSize = jest.fn(async () => 0);
      }, 0);
      queue.receiveMessages().then(returnVal => {
        expect(typeof returnVal.then).toBe('function');
      });
    });
  });

  describe(`deleteMessages`, () => {
    it(`invokes sqs.deleteMessageBatch with the proper arguments`, async () => {
      promiseFn.mockReturnValue(Promise.resolve({ Failed: [] }));
      const messages = [{ ReceiptHandle: 'foo1' }];
      await queue.deleteMessages(messages);
      expect(deleteMessageBatchFn.mock.calls[0][0]).toMatchObject({
        QueueUrl: queueUrl,
        Entries: [{ Id: '0', ...messages[0] }],
      });
    });

    it(`throws if it receives any failures`, () => {
      promiseFn.mockReturnValue(
        Promise.resolve({ Failed: [{ foo: `bar-doesn't-matter` }] }),
      );
      expect(queue.deleteMessages([{}])).rejects;
    });
  });
});
