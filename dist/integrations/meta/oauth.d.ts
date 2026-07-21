export declare function getMetaLoginUrl(commerceId: string): string;
export declare function exchangeCodeForTokens(code: string, commerceId: string, userId: string, ip: string): Promise<{
    id: string;
    createdAt: Date;
    commerceId: string;
    provider: import(".prisma/client").$Enums.ChannelProvider;
    accessToken: string | null;
    refreshToken: string | null;
    scopesGranted: string | null;
    tokenType: string | null;
    metaUserId: string | null;
    metaBusinessId: string | null;
    metaAppId: string | null;
    channelAccountId: string | null;
    channelPhoneId: string | null;
    status: import(".prisma/client").$Enums.ConnectionStatus;
    lastErrorReason: string | null;
    lastValidatedAt: Date | null;
    lastSyncedAt: Date | null;
    tokenExpiresAt: Date | null;
}>;
//# sourceMappingURL=oauth.d.ts.map