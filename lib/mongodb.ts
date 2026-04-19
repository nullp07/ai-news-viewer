import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "smart_reviewer";

if (!uri) {
  // We don't throw at import-time so `next build` succeeds without env vars.
  // Routes that actually need Mongo will throw a clear error on first use.
  console.warn("[mongodb] MONGODB_URI is not set; database calls will fail until it is.");
}

// Cache the client on globalThis in development so HMR doesn't open a new
// connection on every reload. In production each lambda gets its own instance.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  return new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
