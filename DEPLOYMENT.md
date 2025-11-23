# LINE Chatbot 部署指南

## 環境變數設定

在部署到 Vercel 之前，請確保設定以下環境變數：

### 在 Vercel 專案設定中設定環境變數

1. 前往 Vercel 專案設定頁面
2. 進入 "Environment Variables" 區塊
3. 新增以下環境變數：

```
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
MONGODB_URI=your_mongodb_atlas_connection_string_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 取得 LINE Channel 憑證

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立或選擇一個 Provider
3. 建立一個 Messaging API Channel
4. 在 Channel 設定頁面取得：
   - Channel Secret
   - Channel Access Token

### 取得 MongoDB Atlas 連線字串

1. 前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 建立一個免費的 Cluster
3. 建立資料庫使用者
4. 設定 Network Access（允許所有 IP 或指定 Vercel IP）
5. 在 Cluster 頁面點擊 "Connect"
6. 選擇 "Connect your application"
7. 複製連線字串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

## 部署步驟

### 使用 Vercel CLI

1. 安裝 Vercel CLI：
   ```bash
   yarn global add vercel
   ```

2. 登入 Vercel：
   ```bash
   vercel login
   ```

3. 部署專案：
   ```bash
   vercel
   ```

4. 設定環境變數（如果尚未設定）：
   ```bash
   vercel env add LINE_CHANNEL_SECRET
   vercel env add LINE_CHANNEL_ACCESS_TOKEN
   vercel env add MONGODB_URI
   vercel env add NEXT_PUBLIC_APP_URL
   ```

### 使用 Vercel Dashboard

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "New Project"
3. 匯入你的 Git repository
4. 設定環境變數（如上所述）
5. 點擊 "Deploy"

## 設定 LINE Webhook

部署完成後，需要設定 LINE Webhook URL：

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Messaging API Channel
3. 進入 "Messaging API" 標籤
4. 在 "Webhook URL" 區塊中設定：
   ```
   https://your-app.vercel.app/api/webhook
   ```
5. 啟用 "Use webhook"
6. 點擊 "Verify" 確認 webhook 連線正常

## 本地開發

### 設定環境變數

1. 複製 `.env.example` 為 `.env.local`
2. 填入你的 LINE Channel 憑證和 MongoDB 連線字串

### 啟動開發伺服器

```bash
yarn dev
```

### 測試 Webhook（使用 ngrok）

1. 安裝 ngrok：
   ```bash
   yarn global add ngrok
   ```

2. 啟動 ngrok：
   ```bash
   ngrok http 3000
   ```

3. 複製 ngrok 提供的 HTTPS URL（例如：`https://xxxx.ngrok.io`）

4. 在 LINE Developers Console 設定 Webhook URL：
   ```
   https://xxxx.ngrok.io/api/webhook
   ```

5. 測試你的 bot！

## Bot 功能測試

部署完成後，可以測試以下功能：

- 發送 "你好" 或 "hello" - 測試基本問候
- 發送 "選單" 或 "menu" - 測試按鈕模板
- 發送 "輪播" 或 "carousel" - 測試輪播模板
- 發送 "快速回覆" 或 "quick reply" - 測試快速回覆
- 發送任意文字 - 測試 echo 功能

## 疑難排解

### Webhook 驗證失敗

- 確認 LINE_CHANNEL_SECRET 環境變數設定正確
- 確認 webhook URL 是 HTTPS（Vercel 預設提供 HTTPS）

### MongoDB 連線失敗

- 確認 MONGODB_URI 格式正確
- 確認 MongoDB Atlas Network Access 設定允許 Vercel IP
- 確認資料庫使用者名稱和密碼正確

### Bot 沒有回應

- 檢查 Vercel 部署日誌是否有錯誤
- 確認環境變數都已正確設定
- 確認 LINE Webhook 已啟用


