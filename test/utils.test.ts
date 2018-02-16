import * as _ from 'lodash';

import * as utils from '../src/utils';

describe('Utils', () => {
  describe('validateQueueName', () => {
    it('throws for a queue name with invalid characters', () => {
      const queueName = 'foo.bar-baz';
      expect(() => utils.validateQueueName(queueName)).toThrowError(
        /contains invalid characters/,
      );
    });

    it('throws for a queue name that is empty', () => {
      const queueName = '';
      expect(() => utils.validateQueueName(queueName)).toThrowError(
        /must provide a queue name/,
      );
    });

    it('throws for a queue name that is too long', () => {
      const queueName = _.times(81, () => 'a').join('');
      expect(() => utils.validateQueueName(queueName)).toThrowError(
        /cannot be longer than 80 characters/,
      );
    });

    it(`doesn't throw for a valid standard queue name`, () => {
      const queueName = 'foo-bar-baz-123';
      expect(() => utils.validateQueueName(queueName)).not.toThrow();
    });

    it(`doesn't throw for a valid FIFO queue name`, () => {
      const queueName = 'foo-bar-baz-123.fifo';
      expect(() => utils.validateQueueName(queueName)).not.toThrow();
    });
  });
});
