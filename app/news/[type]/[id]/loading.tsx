export default function NewsDetailLoading() {
  return (
    <main className="news-detail-route-main">
      <div className="news-detail-page news-detail-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">正在加载新闻详情</span>
        <div className="news-skeleton-block news-breadcrumb-skeleton" aria-hidden="true" />
        <header className="news-detail-title-skeleton" aria-hidden="true">
          <span className="news-skeleton-block news-detail-chip-skeleton" />
          <span className="news-skeleton-block news-detail-heading-skeleton" />
          <span className="news-skeleton-block news-detail-heading-skeleton is-second" />
          <span className="news-skeleton-block news-detail-original-skeleton" />
          <span className="news-skeleton-block news-detail-byline-skeleton" />
        </header>
        <div className="news-detail-layout" aria-hidden="true">
          <article className="news-detail-article-skeleton">
            <div className="news-skeleton-block news-detail-hero-skeleton" />
            <div className="news-detail-body-skeleton">
              <span className="news-skeleton-block news-skeleton-line is-title" />
              <span className="news-skeleton-block news-skeleton-line" />
              <span className="news-skeleton-block news-skeleton-line" />
              <span className="news-skeleton-block news-skeleton-line is-medium" />
              <div className="news-detail-callout-skeleton">
                <span className="news-skeleton-block news-skeleton-line is-title" />
                <span className="news-skeleton-block news-skeleton-line is-medium" />
              </div>
            </div>
          </article>
          <aside className="news-detail-side-skeleton">
            <div className="news-upcoming-skeleton">
              <div className="news-skeleton-block news-upcoming-visual-skeleton" />
              <div className="news-upcoming-body-skeleton">
                <span className="news-skeleton-block news-skeleton-line is-short" />
                <span className="news-skeleton-block news-skeleton-line is-title" />
                <div className="news-skeleton-countdown">{Array.from({ length: 4 }, (_, index) => <span className="news-skeleton-block" key={index} />)}</div>
              </div>
            </div>
            <div className="news-share-skeleton">
              <span className="news-skeleton-block news-skeleton-line is-medium" />
              <div><span className="news-skeleton-block" /><span className="news-skeleton-block" /></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
