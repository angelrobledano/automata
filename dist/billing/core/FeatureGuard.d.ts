export declare class FeatureGuard {
    /**
     * Checks if a commerce can consume an amount of a specific feature.
     * Evaluates limits and overage behavior.
     */
    static canExecute(commerceId: string, featureKey: string, requestedAmount?: number): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    /**
     * Tracks consumption of a metric
     */
    static trackConsumption(commerceId: string, metricKey: string, amount?: number): Promise<void>;
}
//# sourceMappingURL=FeatureGuard.d.ts.map