import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    // 如果沒有設定 MONGODB_URI，直接返回，不拋出錯誤
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000, // 3 秒超時，更快失敗
      socketTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null;
        // 記錄錯誤但不拋出，讓 bot 可以繼續運作
        console.error('MongoDB connection failed (non-blocking):', error.message || error);
        return null; // 返回 null 而不是拋出錯誤
      });
  }

  try {
    cached.conn = await cached.promise;
    // 如果連線失敗，promise 會 resolve 為 null
    if (!cached.conn) {
      return null;
    }
  } catch (e) {
    cached.promise = null;
    // 不拋出錯誤，讓 bot 可以繼續運作
    console.error('MongoDB connection error (non-blocking):', e instanceof Error ? e.message : e);
    return null;
  }

  return cached.conn;
}

export default dbConnect;


