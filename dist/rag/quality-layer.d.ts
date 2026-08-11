import { ResolvedFactResult } from './knowledge-resolver';
export interface QualityValidationResult {
    passed: boolean;
    failures: string[];
    feedback: string;
}
/**
 * 1. RESPONSE QUALITY LAYER: VALIDACIÓN POST-GENERACIÓN
 */
export declare function validateResponseQuality(response: string, resolvedFacts: ResolvedFactResult): QualityValidationResult;
/**
 * 2. FLUJO COMPLETO CON AUTO-REGENERACIÓN Y AUDITORÍA INMUTABLE
 */
export declare function generateValidatedResponse(params: {
    commerceId: string;
    sessionId?: string | null;
    userQuestion: string;
    systemPrompt: string;
    messageHistory: any[];
    resolvedFacts: ResolvedFactResult;
    ragChunks: any[];
    aiModel?: string;
    temperature?: number;
}): Promise<string>;
//# sourceMappingURL=quality-layer.d.ts.map