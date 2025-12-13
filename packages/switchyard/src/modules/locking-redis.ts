import RedisLockingProvider from "@switchyard/locking-redis"

export * from "@switchyard/locking-redis"

export default RedisLockingProvider
export const discoveryPath = require.resolve("@switchyard/locking-redis")
