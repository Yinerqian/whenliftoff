export default function NewsDetailLoading() {
  return (
    <main className="news-detail-route-main">
      <div className="news-detail-page news-detail-loading" aria-label="正在加载新闻详情">
        <div className="news-detail-title-skeleton" />
        <div className="news-detail-layout"><div className="news-detail-article-skeleton" /><aside className="news-detail-side-skeleton" /></div>
      </div>
    </main>
  );
}
