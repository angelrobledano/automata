export declare function getMetaAppCredentials(hostOrigin?: string): {
    appId: string;
    appSecret: string;
    redirectUri: string;
};
export declare function getMetaLoginUrl(commerceId: string, hostOrigin?: string): string;
export declare function exchangeCodeForTokens(code: string, commerceId: string, userId: string, ip: string, hostOrigin?: string): Promise<{
    id: string;
    commerceId: string;
    status: import(".prisma/client").$Enums.ConnectionStatus;
    createdAt: Date;
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
    lastErrorReason: string | null;
    lastValidatedAt: Date | null;
    lastSyncedAt: Date | null;
    tokenExpiresAt: Date | null;
}>;
//# sourceMappingURL=oauth.d.ts.map