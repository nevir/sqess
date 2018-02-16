import AWS from './AWS';

export enum Region {
  US_EAST_1 = 'us-east-1',
  US_WEST_1 = 'us-west-1',
  US_WEST_2 = 'us-west-2',
  EU_WEST_1 = 'eu-west-1',
  EU_CENTRAL_1 = 'eu-central-1',
  AP_NORTHEAST_1 = 'ap-northeast-1',
  AP_NORTHEAST_2 = 'ap-northeast-2',
  AP_SOUTHEAST_1 = 'ap-southeast-1',
  AP_SOUTHEAST_2 = 'ap-southeast-2',
  SA_EAST_1 = 'sa-east-1',
}

/**
 * Our default long-polling interval (the max allowed).
 */
export const DEFAULTS = {
  LONG_POLLING_INTERVAL_SECONDS: 20,
  VISIBILITY_TIMEOUT_SECONDS: 600,
  FIFO: false,
  REGION: Region.US_WEST_2,
  BATCH_SIZE: 1,
  DELETE_IMMEDIATELY: false,
  QUEUE_HANDLER: items => items,
  FINISH_HANDLER: () => null,
};
