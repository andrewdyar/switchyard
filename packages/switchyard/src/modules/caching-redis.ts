import RedisCachingProvider from "@switchyard/caching-redis"

export * from "@switchyard/caching-redis"

export default RedisCachingProvider
export const discoveryPath = require.resolve("@switchyard/caching-redis")
