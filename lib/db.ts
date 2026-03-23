import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

const connectDB = async (): Promise<typeof mongoose | null> => {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.DB_STRING;
  if (!uri) {
    console.error("DB_STRING environment variable is not set!");
    return null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        console.log(`MongoDB Connected: ${m.connection.host}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error(
      "MongoDB connection error:",
      err instanceof Error ? err.message : err
    );
  }

  return cached.conn;
};

export default connectDB;
