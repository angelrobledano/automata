export interface ResolvedFactResult {
    intent: string;
    targetDate: Date;
    targetDateFormatted: string;
    isSummer: boolean;
    timeContext: 'morning' | 'afternoon' | 'full_day';
    activeRules: any[];
    overriddenRuleNames: string[];
    resolvedFactsText: string;
    isClosed: boolean;
    isDeterministicAnswerable: boolean;
    deterministicAnswer?: string | null;
}
/**
 * 1. CLASIFICACIÓN DE INTENCIÓN Y CONTEXTO TEMPORAL
 */
export declare function detectIntentAndContext(userQuestion: string, referenceDate?: Date): {
    intent: string;
    targetDate: Date;
    timeContext: 'morning' | 'afternoon' | 'full_day';
};
/**
 * 2. DETERMINACIÓN DE HECHOS Y JERARQUÍA DE PRIORIDADES
 */
export declare function resolveApplicableFacts(commerceId: string, userQuestion: string, referenceDate?: Date): Promise<ResolvedFactResult>;
//# sourceMappingURL=knowledge-resolver.d.ts.map