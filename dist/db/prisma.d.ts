import { PrismaClient } from '@prisma/client';
declare const globalPrisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const prisma: PrismaClient & {
    $withTenant: (commerceId: string) => ReturnType<typeof globalPrisma.$extends>;
};
export {};
//# sourceMappingURL=prisma.d.ts.map