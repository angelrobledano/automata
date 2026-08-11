export declare function getOrCreateSession(commerceId: string, customerIdentifier: string, channelConnectionId: string): Promise<{
    id: string;
    commerceId: string;
    status: string;
    createdAt: Date;
    channelConnectionId: string;
    customerIdentifier: string;
    controlBy: string;
    humanReason: string | null;
    aiSummary: import("@prisma/client/runtime/library").JsonValue | null;
    suggestedReply: string | null;
    waitingSince: Date | null;
    assignedUserId: string | null;
    isTest: boolean;
    context: string | null;
    updatedAt: Date;
}>;
export declare function getSessionMessages(sessionId: string): Promise<{
    id: string;
    role: string;
    createdAt: Date;
    sessionId: string;
    type: string;
    content: string;
    tokensUsed: number | null;
    estimatedCost: number | null;
    latencyMs: number | null;
}[]>;
export declare function addMessageToSession(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<{
    id: string;
    role: string;
    createdAt: Date;
    sessionId: string;
    type: string;
    content: string;
    tokensUsed: number | null;
    estimatedCost: number | null;
    latencyMs: number | null;
}>;
//# sourceMappingURL=session.d.ts.map