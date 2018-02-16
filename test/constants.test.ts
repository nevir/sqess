import * as constants from '../src/constants';

describe(`constants`, () => {
  describe(`DEFAULTS`, () => {
    it(`QUEUE_HANDLER returns whatever was passed to it`, () => {
      const items = ['foo', 'bar'];
      expect(constants.DEFAULTS.QUEUE_HANDLER(items)).toMatchObject(items);
    });

    it(`FINISH_HANDLER returns null`, () => {
      expect(constants.DEFAULTS.FINISH_HANDLER()).toBeNull;
    });
  });
});
