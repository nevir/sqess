# sqess 

> A wrapper around SQS

### [Complete Documentation](https://vincecoppola.github.io/sqess/classes/queue.html)

-----

### Install

```bash
npm install --save sqess

# Or, if you fancy
yarn add sqess
```

### Usage

Basic usage is as follows, check out the [complete documentation](https://vincecoppola.github.io/sqess/classes/queue.html) if you feel so inclined.

```ts
import Queue from 'sqess';

async function main() {
  
  // Initializes the sqess instance but doesn't create the queue
  const queue = new Queue({
    queueName: 'test-queue-1',
    handler: async (queueItem) => Promise.resolve(true),
    onFinish: () => true,
  });

  // Actually creates the queue
  await queue.create();

  // Fill that queue up
  await queue.fill([/* Either a single item or an array of items */]);

  // Process queue items until there's no tomorrow
  await queue.process();
}

main();
```
