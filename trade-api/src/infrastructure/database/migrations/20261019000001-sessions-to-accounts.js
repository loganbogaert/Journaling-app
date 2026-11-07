'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const run = (sql) => queryInterface.sequelize.query(sql, { transaction });

      // Sessions -> Accounts; every existing row becomes a manual account via the column default
      await run('ALTER TABLE "Sessions" RENAME TO "Accounts"');
      await run('ALTER SEQUENCE "Sessions_id_seq" RENAME TO "Accounts_id_seq"');
      await run('ALTER TABLE "Accounts" RENAME CONSTRAINT "Sessions_pkey" TO "Accounts_pkey"');

      await run(`CREATE TYPE "enum_Accounts_type" AS ENUM ('manual', 'connected')`);
      await run(`CREATE TYPE "enum_Accounts_platform" AS ENUM ('mt4', 'mt5')`);
      await run(`CREATE TYPE "enum_Accounts_syncStatus" AS ENUM ('pending', 'active', 'error', 'disabled')`);
      await run(`
        ALTER TABLE "Accounts"
          ADD COLUMN "type" "enum_Accounts_type" NOT NULL DEFAULT 'manual',
          ADD COLUMN "platform" "enum_Accounts_platform",
          ADD COLUMN "brokerServer" VARCHAR(255),
          ADD COLUMN "brokerLogin" VARCHAR(64),
          ADD COLUMN "syncStatus" "enum_Accounts_syncStatus",
          ADD COLUMN "lastSyncedAt" TIMESTAMP WITH TIME ZONE
      `);
      await run('CREATE INDEX "Accounts_userId_idx" ON "Accounts" ("userId")');

      // Trades.sessionId -> accountId
      await run('ALTER TABLE "Trades" RENAME COLUMN "sessionId" TO "accountId"');
      await run('ALTER TABLE "Trades" RENAME CONSTRAINT "Trades_sessionId_fkey" TO "Trades_accountId_fkey"');

      await run(`CREATE TYPE "enum_Trades_source" AS ENUM ('manual', 'sync')`);
      await run(`
        ALTER TABLE "Trades"
          ADD COLUMN "source" "enum_Trades_source" NOT NULL DEFAULT 'manual',
          ADD COLUMN "externalDealId" VARCHAR(64)
      `);

      // Synced trades may legitimately lack SL/TP (and therefore risk); manual ones never may
      await run(`
        ALTER TABLE "Trades"
          ALTER COLUMN "tp" DROP NOT NULL, ALTER COLUMN "tp" DROP DEFAULT,
          ALTER COLUMN "sl" DROP NOT NULL, ALTER COLUMN "sl" DROP DEFAULT,
          ALTER COLUMN "risk" DROP NOT NULL
      `);
      await run(`
        ALTER TABLE "Trades" ADD CONSTRAINT "Trades_manual_requires_tp_sl_risk"
          CHECK ("source" <> 'manual' OR ("tp" IS NOT NULL AND "sl" IS NOT NULL AND "risk" IS NOT NULL))
      `);
      await run(`
        ALTER TABLE "Trades" ADD CONSTRAINT "Trades_sync_requires_externalDealId"
          CHECK ("source" <> 'sync' OR "externalDealId" IS NOT NULL)
      `);
      await run('CREATE UNIQUE INDEX "Trades_accountId_externalDealId_key" ON "Trades" ("accountId", "externalDealId")');
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const run = (sql) => queryInterface.sequelize.query(sql, { transaction });

      // Synced trades can't exist in the old schema (nullable tp/sl/risk, no connected accounts)
      await run(`DELETE FROM "Trades" WHERE "source" = 'sync'`);
      await run(`DELETE FROM "Accounts" WHERE "type" = 'connected'`);

      await run('DROP INDEX "Trades_accountId_externalDealId_key"');
      await run('ALTER TABLE "Trades" DROP CONSTRAINT "Trades_sync_requires_externalDealId"');
      await run('ALTER TABLE "Trades" DROP CONSTRAINT "Trades_manual_requires_tp_sl_risk"');
      await run(`
        ALTER TABLE "Trades"
          ALTER COLUMN "tp" SET NOT NULL, ALTER COLUMN "tp" SET DEFAULT 0,
          ALTER COLUMN "sl" SET NOT NULL, ALTER COLUMN "sl" SET DEFAULT 0,
          ALTER COLUMN "risk" SET NOT NULL
      `);
      await run(`
        ALTER TABLE "Trades"
          DROP COLUMN "source",
          DROP COLUMN "externalDealId"
      `);
      await run('DROP TYPE "enum_Trades_source"');
      await run('ALTER TABLE "Trades" RENAME CONSTRAINT "Trades_accountId_fkey" TO "Trades_sessionId_fkey"');
      await run('ALTER TABLE "Trades" RENAME COLUMN "accountId" TO "sessionId"');

      await run('DROP INDEX "Accounts_userId_idx"');
      await run(`
        ALTER TABLE "Accounts"
          DROP COLUMN "type",
          DROP COLUMN "platform",
          DROP COLUMN "brokerServer",
          DROP COLUMN "brokerLogin",
          DROP COLUMN "syncStatus",
          DROP COLUMN "lastSyncedAt"
      `);
      await run('DROP TYPE "enum_Accounts_type"');
      await run('DROP TYPE "enum_Accounts_platform"');
      await run('DROP TYPE "enum_Accounts_syncStatus"');
      await run('ALTER TABLE "Accounts" RENAME CONSTRAINT "Accounts_pkey" TO "Sessions_pkey"');
      await run('ALTER SEQUENCE "Accounts_id_seq" RENAME TO "Sessions_id_seq"');
      await run('ALTER TABLE "Accounts" RENAME TO "Sessions"');
    });
  },
};
