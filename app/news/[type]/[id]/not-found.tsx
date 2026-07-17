import Link from "next/link";

export default function NewsNotFound() {
  return (
    <main className="news-detail-route-main">
      <div className="news-not-found"><span>404</span><h1>这篇航天新闻不在这里</h1><p>内容可能已不在最新 30 条中，或链接中的类型与编号不匹配。</p><Link className="news-primary-button" href="/news">返回航天新闻</Link></div>
    </main>
  );
}
