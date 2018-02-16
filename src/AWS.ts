import AWS from 'aws-sdk';

import { DEFAULTS } from './constants';

/**
 * By default, load credentials from the Shared Credentials File
 * {@link https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html as recommended}.
 */
const defaultCredentials = new AWS.SharedIniFileCredentials();
AWS.config.credentials = defaultCredentials;
AWS.config.region = DEFAULTS.REGION;

export default AWS;
