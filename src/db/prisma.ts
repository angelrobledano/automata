import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

// RLS Wrapper for strict Tenant Isolation
export const prisma = globalPrisma.$extends({
  model: {
    $allModels: {
      /**
       * Execute queries strictly within the context of a specific tenant.
       * This uses Row-Level Security via Postgres set_config inside a transaction.
       */
      async withTenant(commerceId: string) {
        return globalPrisma.$extends({
          query: {
            $allModels: {
              async $allOperations({ args, query }) {
                const [, result] = await globalPrisma.$transaction([
                  globalPrisma.$executeRaw`SELECT set_config('app.current_tenant', ${commerceId}, TRUE)`,
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
}) as unknown as PrismaClient & {
  $withTenant: (commerceId: string) => ReturnType<typeof globalPrisma.$extends>
};

// Fallback method at the top level
(prisma as any).$withTenant = async (commerceId: string) => {
  return globalPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await globalPrisma.$transaction([
            globalPrisma.$executeRaw`SELECT set_config('app.current_tenant', ${commerceId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
};
