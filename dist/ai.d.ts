import { Commerce } from '@prisma/client';
export declare function generateAIResponse(commerce: Commerce, customerPhone: string, messageHistory: {
    role: 'user' | 'assistant' | 'system';
    content: string | null;
}[]): Promise<string>;
//# sourceMappingURL=ai.d.ts.map