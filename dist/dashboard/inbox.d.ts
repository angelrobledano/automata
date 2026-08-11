export declare function getInboxSessions(commerceId: string): Promise<({
    messages: {
        type: string;
        id: string;
        createdAt: Date;
        role: string;
        sessionId: string;
        content: string;
        tokensUsed: number | null;
        estimatedCost: number | null;
        latencyMs: number | null;
    }[];
} & {
    id: string;
    status: string;
    createdAt: Date;
    commerceId: string;
    channelConnectionId: string;
    customerIdentifier: string;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
})[]>;
export declare function requestHuman(sessionId: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    commerceId: string;
    channelConnectionId: string;
    customerIdentifier: string;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
}>;
//# sourceMappingURL=inbox.d.ts.map