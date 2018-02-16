export declare enum Region {
    US_EAST_1 = "us-east-1",
    US_WEST_1 = "us-west-1",
    US_WEST_2 = "us-west-2",
    EU_WEST_1 = "eu-west-1",
    EU_CENTRAL_1 = "eu-central-1",
    AP_NORTHEAST_1 = "ap-northeast-1",
    AP_NORTHEAST_2 = "ap-northeast-2",
    AP_SOUTHEAST_1 = "ap-southeast-1",
    AP_SOUTHEAST_2 = "ap-southeast-2",
    SA_EAST_1 = "sa-east-1",
}
/**
 * Our default long-polling interval (the max allowed).
 */
export declare const DEFAULTS: {
    LONG_POLLING_INTERVAL_SECONDS: number;
    VISIBILITY_TIMEOUT_SECONDS: number;
    FIFO: boolean;
    REGION: Region;
    BATCH_SIZE: number;
    DELETE_IMMEDIATELY: boolean;
    QUEUE_HANDLER: (items: any) => any;
    FINISH_HANDLER: () => any;
};
