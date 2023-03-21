# redis-pub-sub-request-with-bun

An example for how to use redis-pubsub for request style communication. I use this to communicate between two docker containers that don't have a server running but both have access to a redis database.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v0.2.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
