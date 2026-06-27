export declare function getOrCreateSession(commerceId: string, customerIdentifier: string, channelConnectionId: string): Promise<{
    id: string;
    createdAt: Date;
    commerceId: string;
    status: string;
    channelConnectionId: string;
    customerIdentifier: string;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
}>;
export declare function getSessionMessages(sessionId: string): Promise<{
    type: string;
    id: string;
    createdAt: Date;
    role: string;
    sessionId: string;
    content: string;
    tokensUsed: number | null;
    estimatedCost: number | null;
    latencyMs: number | null;
}[]>;
export declare function addMessageToSession(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<{
    type: string;
    id: string;
    createdAt: Date;
    role: string;
    sessionId: string;
    content: string;
    tokensUsed: number | null;
    estimatedCost: number | null;
    latencyMs: number | null;
}>;
//# sourceMappingURL=session.d.ts.map