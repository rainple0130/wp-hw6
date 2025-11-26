# LaTeX 數學式語法查詢與渲染工具

這是一個使用 Next.js、TypeScript、Bottender 和 MongoDB Atlas 建立的 LINE Chatbot 專案，提供 LaTeX 數學式語法查詢與渲染功能。

## LINE Bot 資訊

- **LINE ID**: `@628pirna`
- **部署連結**: https://hw6-test.vercel.app
- **Webhook URL**: https://hw6-test.vercel.app/api/webhook

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

### 主要功能

1. **語法查詢**
   - 智慧型查詢 LaTeX 語法
   - 支援中文關鍵字（如「箭頭」、「alpha」）
   - 支援英文關鍵字（如「arrow」、「sum」）
   - 支援直接輸入 LaTeX 命令（如「\rightarrow」）
   - 回傳格式：LaTeX 語法 + Unicode 符號 + 說明

2. **渲染器**
   - 使用 KaTeX 渲染 LaTeX 數學式
   - 輸出高解析度 PNG 圖片（300 DPI）
   - 自動添加白底和 padding
   - 支援數學模式（$...$ 或 $$...$$）

3. **數學計算**（開發中）
   - 未來將整合數學計算 API

### 使用方式

- 發送「選單」或「menu」顯示主選單
- 發送「你好」或「hello」也會顯示主選單
- 在語法查詢模式中，輸入「結束查詢」、「返回」或「主選單」退出
- 在渲染器模式中，輸入「結束查詢」、「返回」或「主選單」退出

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
