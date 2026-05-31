# word-search
## 概要
[Wordle](https://www.nytimes.com/games/wordle/index.html)を解くときにお世話になってた単語検索サイトが実質的に潰れてしまったので、バイブコーディングの勉強がてら自分用の検索ツールを作ってみよう、と言うことで作ってみました。

## Cloudflare deployment
Frontend と backend は別々の Worker としてデプロイします。

Frontend の Worker は `code/frontend/wrangler.jsonc` で Vite の `dist` を Workers Static Assets として配信します。

```text
Root directory: code/frontend
Build command: npm run build
Deploy command: npx wrangler versions upload
```

Backend の Worker は `code/backend/wrangler.jsonc` で cron handler と R2 binding を定義します。

```text
Root directory: code/backend
Build command: npm test
Deploy command: npx wrangler versions upload
```

## Backend development
Cloudflare Workers のバッチハンドラーは `code/backend` にあります。ローカルでは Docker Compose 経由で `wrangler dev` を起動します。

```sh
docker compose up backend
```

Worker はコンテナ内の `8787` で起動し、ホスト側では `http://localhost:3001` からアクセスできます。現時点では公開 API は定義していないため HTTP リクエストは JSON の 404 を返します。ホスト上で直接 `wrangler` を実行する場合は Node.js 22 以上が必要です。

Dockerfile や Node.js の依存関係を変えた後は、匿名 volume の `node_modules` を作り直します。

```sh
docker compose down -v
docker compose up --build backend
```

cron handler をローカルで動かす場合は、backend 起動後に次の URL を叩きます。

```sh
curl "http://localhost:3001/__scheduled?cron=0+10+*+*+*"
```

Cloudflare にログインする場合は次を使います。

```sh
make login
```
