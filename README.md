# whenliftoff

全球火箭发射日程，使用 Next.js、Supabase、Launch Library 2 和 DeepSeek 翻译服务。

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

按时间顺序执行 `supabase/migrations` 中的数据库迁移，然后配置 `.env.local`。

同步接口需要 `Authorization: Bearer $CRON_SECRET`，并支持热点同步和完整同步：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-launches?mode=hot"
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-launches?mode=full"
```

## 生产环境准实时同步

为了避免调度器在新接口部署前提前运行，请按以下顺序发布：

1. 应用数据库迁移 `20260718234608_support_realtime_launch_sync.sql`。
2. 部署本站代码，并确认生产环境的 `CRON_SECRET` 已配置。
3. 在 Supabase Vault 创建生产站点地址和同一份 Cron 密钥（不要把真实值提交到仓库）：

```sql
select vault.create_secret(
  'https://your-production-domain.example',
  'whenliftoff_base_url',
  'whenliftoff production base URL'
);

select vault.create_secret(
  'replace-with-the-same-CRON_SECRET',
  'whenliftoff_cron_secret',
  'whenliftoff protected cron secret'
);
```

4. 在 Supabase SQL Editor 执行 `supabase/cron/setup_launch_sync.sql`。该脚本启用 `pg_cron`、`pg_net`，创建每 9 分钟热点同步与每日完整同步。
5. 手动请求一次 `mode=hot`，并检查 `cron.job`、`cron.job_run_details`、`net._http_response` 和 `sync_runs`。

重新执行调度脚本是安全的：同名任务会先被移除再创建。

## 验证

```bash
npm test
npm run typecheck
npm run build
```
