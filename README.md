# whenliftoff

全球火箭发射日程页面，使用 Next.js、Supabase、Vercel Cron、Launch Library 2 和 DeepSeek V4 Flash。

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 Supabase SQL Editor 中执行 `supabase/migrations/202607110001_create_launch_schedule.sql`，然后配置 `.env.local` 中的变量。同步接口需以 `Authorization: Bearer $CRON_SECRET` 调用：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-launches
```

## 验证

```bash
npm test
npm run typecheck
npm run build
```
