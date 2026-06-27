"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalPrisma = new client_1.PrismaClient();
// RLS Wrapper for strict Tenant Isolation
exports.prisma = globalPrisma.$extends({
    model: {
        $allModels: {
            /**
             * Execute queries strictly within the context of a specific tenant.
             * This uses Row-Level Security via Postgres set_config inside a transaction.
             */
            async withTenant(commerceId) {
                return globalPrisma.$extends({
                    query: {
                        $allModels: {
                            async $allOperations({ args, query }) {
                                const [, result] = await globalPrisma.$transaction([
                                    globalPrisma.$executeRaw `SELECT set_config('app.current_tenant', ${commerceId}, TRUE)`,
                                    query(args),
                                ]);
                                return result;
                            },
                        },
                    },
                });
            }
        }
    }
});
// Fallback method at the top level
exports.prisma.$withTenant = async (commerceId) => {
    return globalPrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    const [, result] = await globalPrisma.$transaction([
                        globalPrisma.$executeRaw `SELECT set_config('app.current_tenant', ${commerceId}, TRUE)`,
                        query(args),
                    ]);
                    return result;
                },
            },
        },
    });
};
//# sourceMappingURL=prisma.js.map