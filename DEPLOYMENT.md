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
GEMINI_API_KEY=your_gemini_api_key_here
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

### 取得 Google Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 使用 Google 帳號登入
3. 點擊 "Get API Key"
4. 選擇 "Create API Key in new project" 或使用現有專案
5. 複製生成的 API Key
6. 在 Vercel 環境變數中設定 `GEMINI_API_KEY`

**注意**：Gemini API 提供免費額度，適合開發和測試使用。

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
   vercel env add GEMINI_API_KEY
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

### 查看 Vercel 日誌

#### 方法 1：使用 Vercel CLI（推薦）
```bash
# 安裝 Vercel CLI（如果還沒安裝）
yarn global add vercel

# 登入
vercel login

# 查看即時日誌
vercel logs --follow

# 查看特定部署的日誌
vercel logs [deployment-url]
```

#### 方法 2：使用 Vercel Dashboard
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案
3. 點擊頂部選單的 "Logs" 標籤
4. 或進入專案 → 點擊右上角的 "View Function Logs"

#### 方法 3：查看部署詳情
1. 進入專案 → Deployments
2. 點擊最新的部署
3. 在部署詳情頁面，應該可以看到：
   - "Runtime Logs" 或 "Function Logs"
   - 或點擊右上角的 "View Logs"

### Webhook 驗證失敗

- 確認 LINE_CHANNEL_SECRET 環境變數設定正確
- 確認 webhook URL 是 HTTPS（Vercel 預設提供 HTTPS）

### MongoDB 連線失敗

- 確認 MONGODB_URI 格式正確
- 確認 MongoDB Atlas Network Access 設定：
  - **開發/測試環境**：設定 `0.0.0.0/0`（允許所有 IP）
  - **生產環境**：也可以使用 `0.0.0.0/0`，或只允許特定 IP 範圍
  - 設定後需等待 1-2 分鐘讓設定生效
- 確認資料庫使用者名稱和密碼正確
- 如果密碼包含特殊字元（如 `@`, `#`, `%` 等），需要進行 URL 編碼：
  - `@` → `%40`
  - `#` → `%23`
  - `%` → `%25`
  - `&` → `%26`
- **注意**：Vercel 使用 serverless functions，IP 是動態的，無法固定 IP，因此建議使用 `0.0.0.0/0`

### Bot 沒有回應

- 使用 Vercel CLI 查看即時日誌：`vercel logs --follow`
- 確認環境變數都已正確設定（在 Vercel Dashboard → Settings → Environment Variables）
- 確認 LINE Webhook 已啟用
- 確認 LINE Webhook URL 正確：`https://your-app.vercel.app/api/webhook`
- 確認 LINE Access Token 沒有過期（在 LINE Developers Console 重新產生）


