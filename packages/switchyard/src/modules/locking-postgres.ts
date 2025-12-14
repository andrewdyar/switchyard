import PostgresLockingProvider from "@switchyard/locking-postgres"

export * from "@switchyard/locking-postgres"

export default PostgresLockingProvider
export const discoveryPath = require.resolve("@switchyard/locking-postgres")
