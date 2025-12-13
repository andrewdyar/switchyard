# Switchyard Cache Redis

Use Redis as a Switchyard cache store.

## Installation

```
yarn add @switchyard/cache-redis
```

## Options

```
   {
      ttl?: number                // Time to keep data in cache (in seconds)

      redisUrl?: string           // Redis instance connection string

      redisOptions?: RedisOptions // Redis client options

      namespace?: string          // Prefix for event keys (the default is `medusa:`)
  }
```

### Other caching modules

- [Switchyard Cache In-Memory](../cache-inmemory/README.md)
