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
      serverSelectionTimeoutMS: 60000, // 60 秒超時，等待 MongoDB Atlas 免費層集群自動恢復
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
    };

    console.log('Attempting to connect to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null;
        // 記錄詳細錯誤資訊
        const errorMessage = error.message || String(error);
        console.error('MongoDB connection failed:', errorMessage);
        
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
        
        // 阻塞模式下，拋出錯誤讓呼叫者知道連線失敗
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    // 在阻塞模式下，重新拋出錯誤
    console.error('MongoDB connection error:', e instanceof Error ? e.message : e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;


