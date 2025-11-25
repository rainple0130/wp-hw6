# LINE Chatbot

這是一個使用 Next.js、TypeScript、Bottender 和 MongoDB Atlas 建立的 LINE Chatbot 專案。

## 技術棧

- **框架**: Next.js 16+ (App Router) with TypeScript
- **Chatbot 框架**: Bottender
- **資料庫**: MongoDB Atlas + Mongoose
- **套件管理**: Yarn
- **部署**: Vercel

## 專案結構

```
hw6/
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts          # LINE webhook endpoint
│   └── ...
├── bot/
│   ├── index.ts                  # Bottender bot 主程式
│   └── handlers/
│       └── messages.ts           # 訊息處理邏輯
├── lib/
│   └── mongodb.ts                # MongoDB 連線設定
├── .env.example                  # 環境變數範例
└── vercel.json                   # Vercel 部署設定
```

## 快速開始

### 1. 安裝依賴

```bash
yarn install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local` 並填入你的憑證：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入：
- `LINE_CHANNEL_SECRET`: LINE Channel Secret
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Channel Access Token
- `MONGODB_URI`: MongoDB Atlas 連線字串（可選）
- `NEXT_PUBLIC_APP_URL`: 應用程式 URL（本地開發時使用 `http://localhost:3000`）
- `GEMINI_API_KEY`: Google Gemini API Key（用於 LLM 回應功能）

### 3. 啟動開發伺服器

```bash
yarn dev
```

### 4. 設定 LINE Webhook（本地測試）

使用 ngrok 或其他工具將本地伺服器暴露到網際網路：

```bash
# 安裝 ngrok
yarn global add ngrok

# 啟動 ngrok
ngrok http 3000
```

在 LINE Developers Console 設定 Webhook URL 為：
```
https://your-ngrok-url.ngrok.io/api/webhook
```

## Bot 功能

目前實作的基本功能：

- **文字回應**: 發送 "你好" 或 "hello" 會收到問候訊息
- **按鈕模板**: 發送 "選單" 或 "menu" 會顯示按鈕選單
- **輪播模板**: 發送 "輪播" 或 "carousel" 會顯示輪播選單
- **快速回覆**: 發送 "快速回覆" 或 "quick reply" 會顯示快速回覆選項
- **Echo 功能**: 發送其他文字會收到 echo 回應

## 部署

詳細的部署說明請參考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署到 Vercel

1. 將專案推送到 GitHub
2. 在 Vercel 匯入專案
3. 設定環境變數
4. 部署完成後，在 LINE Developers Console 設定 Webhook URL

## 開發

### 專案指令

```bash
# 開發模式
yarn dev

# 建置專案
yarn build

# 啟動生產模式
yarn start

# 執行 lint
yarn lint
```

## 相關文件

- [Next.js Documentation](https://nextjs.org/docs)
- [Bottender Documentation](https://bottender.js.org/)
- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

## 授權

MIT
