export declare function getInboxSessions(commerceId: string): Promise<({
    messages: {
        id: string;
        role: string;
        createdAt: Date;
        sessionId: string;
        type: string;
        content: string;
        tokensUsed: number | null;
        estimatedCost: number | null;
        latencyMs: number | null;
    }[];
} & {
    id: string;
    commerceId: string;
    status: string;
    createdAt: Date;
    channelConnectionId: string;
    customerIdentifier: string;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
})[]>;
export declare function requestHuman(sessionId: string): Promise<{
    id: string;
    commerceId: string;
    status: string;
    createdAt: Date;
    channelConnectionId: string;
    customerIdentifier: string;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
}>;
//# sourceMappingURL=inbox.d.ts.map