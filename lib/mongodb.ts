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
        // 記錄詳細錯誤資訊
        const errorMessage = error.message || String(error);
        console.error('MongoDB connection failed (non-blocking):', errorMessage);
        
        // 提供更詳細的錯誤資訊
        if (errorMessage.includes('authentication failed')) {
          console.error('MongoDB 認證失敗，請檢查：');
          console.error('1. 用戶名和密碼是否正確');
          console.error('2. 連線字串中的特殊字元是否需要 URL 編碼');
        } else if (errorMessage.includes('whitelist') || errorMessage.includes('IP')) {
          console.error('MongoDB IP 白名單問題，請檢查：');
          console.error('1. Network Access 是否已設定 0.0.0.0/0');
          console.error('2. 設定後是否已等待 1-2 分鐘讓設定生效');
        }
        
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


