import AWS from 'aws-sdk';

import { DEFAULTS } from './constants';

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_DEFAULT_REGION,
} = process.env;

/**
 * By default, load credentials from environment variables or the Shared Credentials File.
 * {@link https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html as recommended}.
 */
const defaultCredentials: AWS.Credentials = AWS_ACCESS_KEY_ID
  ? new AWS.Credentials(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  : new AWS.SharedIniFileCredentials();
AWS.config.credentials = defaultCredentials;
AWS.config.region = AWS_DEFAULT_REGION || DEFAULTS.REGION;

export default AWS;
