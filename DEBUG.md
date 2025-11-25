# Bot 除錯指南

## 查看 Vercel 日誌

### 方法 1：使用 Vercel CLI（最簡單）

```bash
# 查看即時日誌（推薦）
vercel logs --follow

# 查看最近的日誌
vercel logs

# 查看特定數量的日誌
vercel logs --limit 100
```

### 方法 2：使用 Vercel Dashboard

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案（hw6-test）
3. 點擊頂部選單的 **"Logs"** 標籤
4. 或進入專案 → 點擊右上角的 **"View Function Logs"**

### 方法 3：查看部署詳情

1. 進入專案 → **Deployments**
2. 點擊最新的部署
3. 在部署詳情頁面，應該可以看到：
   - **"Runtime Logs"** 或 **"Function Logs"**
   - 或點擊右上角的 **"View Logs"**

## 測試 Bot 是否收到訊息

### 1. 發送測試訊息
在 LINE 中發送 "hello" 或 "你好"

### 2. 查看日誌
使用 `vercel logs --follow` 應該會看到：

```
Processing webhook request... { eventsCount: 1, ... }
Bot event received: { type: 'message', ... }
Processing text message: { text: 'hello', ... }
Handling text message: { original: 'hello', lowercased: 'hello' }
Matched greeting pattern, sending greeting message
Text message handled successfully
```

### 3. 如果沒有看到日誌
可能的原因：
- LINE Webhook URL 設定錯誤
- LINE Webhook 未啟用
- 環境變數未設定

## 檢查 LINE Webhook 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 進入 **"Messaging API"** 標籤
4. 確認：
   - **Webhook URL**: `https://hw6-test.vercel.app/api/webhook`
   - **Use webhook**: 已啟用（綠色）
   - 點擊 **"Verify"** 確認連線正常
   - **Webhook events**: 確認已勾選 "Message"

## 檢查環境變數

在 Vercel Dashboard → Settings → Environment Variables：

- `LINE_CHANNEL_SECRET` - 應該有值
- `LINE_CHANNEL_ACCESS_TOKEN` - 應該有值
- `MONGODB_URI` - 可選

**重要**：確認這些變數是 **Production** 環境（不是 Preview 或 Development）

## 常見問題

### Bot 沒有回應

1. **檢查 Access Token 是否過期**
   - 在 LINE Developers Console → Messaging API → Channel Access Token
   - 點擊 "Issue" 產生新的 Token
   - 更新 Vercel 環境變數

2. **檢查 Webhook 是否啟用**
   - 確認 "Use webhook" 已開啟

3. **檢查事件是否勾選**
   - 確認 "Webhook events" 中已勾選 "Message"

4. **檢查日誌**
   - 使用 `vercel logs --follow` 查看即時日誌
   - 查看是否有錯誤訊息

### 看到錯誤訊息

- **Invalid signature**: LINE_CHANNEL_SECRET 錯誤
- **Authentication failed**: LINE_CHANNEL_ACCESS_TOKEN 錯誤或過期
- **MongoDB connection failed**: MongoDB 連線問題（不影響 bot 運作）

