import { Queue } from 'bullmq';
import IORedis from 'ioredis';
export declare const connection: IORedis;
export declare const metaMessageQueue: Queue<any, any, string, any, any, string>;
export declare const enqueueMetaMessage: (payload: any) => Promise<void>;
export declare const documentQueue: Queue<any, any, string, any, any, string>;
export declare const enqueueDocument: (payload: {
    commerceId: string;
    filename: string;
    fileBuffer: string;
    category: string;
}) => Promise<void>;
//# sourceMappingURL=queue.d.ts.map