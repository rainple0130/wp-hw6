import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, listeners: [] };
}

/**
 * MongoDB 連線狀態監聽器
 * 當 MongoDB 連線成功時，會通知所有監聽器
 */
export function onMongoConnected(callback: () => void) {
  if (cached.conn) {
    // 如果已經連線，立即執行回調
    callback();
  } else {
    // 否則加入監聽器列表
    cached.listeners = cached.listeners || [];
    cached.listeners.push(callback);
  }
}

/**
 * 初始化 MongoDB 連線（在模組載入時自動執行）
 * 這樣可以在部署完成時就建立連線，而不是每次請求時才連線
 */
function initMongoConnection() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    // 如果沒有設定 MONGODB_URI，不進行連線
    return;
  }

  // 如果已經有連線或正在連線，不重複連線
  if (cached.conn || cached.promise) {
    return;
  }

  const opts = {
    bufferCommands: false,
    // 優化連線設定，加快失敗檢測
    serverSelectionTimeoutMS: 10000, // 10 秒超時，如果集群暫停會更快失敗
    socketTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    // 減少重試次數，加快失敗
    maxPoolSize: 1, // 減少連線池大小
    minPoolSize: 0,
    // 啟用連線池快取
    maxIdleTimeMS: 30000, // 30 秒後關閉閒置連線
    // 快速失敗設定
    heartbeatFrequencyMS: 10000, // 心跳檢測頻率
  };

  console.log('Initializing MongoDB connection on module load...');
  cached.promise = mongoose.connect(MONGODB_URI, opts)
    .then((mongoose) => {
      console.log('MongoDB connected successfully (initialized on deployment)');
      cached.conn = mongoose;
      
      // 廣播連線成功事件
      if (cached.listeners && cached.listeners.length > 0) {
        console.log(`Broadcasting MongoDB connection success to ${cached.listeners.length} listeners`);
        cached.listeners.forEach((listener: () => void) => {
          try {
            listener();
          } catch (error) {
            console.error('Error in MongoDB connection listener:', error);
          }
        });
        // 清空監聽器列表
        cached.listeners = [];
      }
      
      return mongoose;
    })
    .catch((error) => {
      cached.promise = null;
      // 記錄詳細錯誤資訊
      const errorMessage = error.message || String(error);
      console.error('MongoDB connection failed (initialization):', errorMessage);
      
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
      
      // 初始化失敗不拋出錯誤，讓應用程式可以繼續運作
      // 後續可以透過 dbConnect() 重試
    });
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    // 如果沒有設定 MONGODB_URI，直接返回，不拋出錯誤
    return null;
  }

  // 如果已經有連線，直接返回
  if (cached.conn) {
    return cached.conn;
  }

  // 如果正在連線，等待連線完成
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      cached.promise = null;
      console.error('MongoDB connection error:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  // 如果沒有連線，開始連線
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // 優化連線設定，加快失敗檢測
      serverSelectionTimeoutMS: 10000, // 10 秒超時，如果集群暫停會更快失敗
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      // 減少重試次數，加快失敗
      maxPoolSize: 1, // 減少連線池大小
      minPoolSize: 0,
      // 啟用連線池快取
      maxIdleTimeMS: 30000, // 30 秒後關閉閒置連線
      // 快速失敗設定
      heartbeatFrequencyMS: 10000, // 心跳檢測頻率
    };

    console.log('Attempting to connect to MongoDB (on-demand)...');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully (on-demand)');
        cached.conn = mongoose;
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null;
        // 記錄詳細錯誤資訊
        const errorMessage = error.message || String(error);
        console.error('MongoDB connection failed (on-demand):', errorMessage);
        
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
        
        // 不拋出錯誤，返回 null，讓應用程式可以繼續運作
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// 在模組載入時自動初始化連線
// 這樣可以在部署完成時就建立連線，而不是每次請求時才連線
initMongoConnection();

export default dbConnect;


