import Redis from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __toko_redis: Redis | undefined;
}

export const redis: Redis =
  global.__toko_redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") global.__toko_redis = redis;
