export default function NewsLoading() {
  return (
    <main className="news-route-main">
      <div className="news-page news-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">正在加载航天新闻</span>
        <header className="news-loading-heading" aria-hidden="true">
          <span className="news-skeleton-block news-heading-skeleton" />
          <span className="news-skeleton-block news-subheading-skeleton" />
        </header>
        <div className="news-lead-skeleton" aria-hidden="true">
          <div className="news-feature-skeleton news-skeleton-block">
            <span className="news-skeleton-chip" />
            <span className="news-skeleton-feature-title" />
            <span className="news-skeleton-feature-meta" />
          </div>
          <aside className="news-upcoming-skeleton">
            <div className="news-skeleton-block news-upcoming-visual-skeleton" />
            <div className="news-upcoming-body-skeleton">
              <span className="news-skeleton-block news-skeleton-line is-short" />
              <span className="news-skeleton-block news-skeleton-line is-title" />
              <div className="news-skeleton-countdown">{Array.from({ length: 4 }, (_, index) => <span className="news-skeleton-block" key={index} />)}</div>
            </div>
          </aside>
        </div>
        <div className="news-grid-skeleton" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <article className={`news-card-skeleton is-variant-${index % 3}`} key={index}>
              <div className="news-skeleton-block news-card-media-skeleton" />
              <div className="news-card-copy-skeleton">
                <span className="news-skeleton-block news-skeleton-line is-short" />
                <span className="news-skeleton-block news-skeleton-line is-title" />
                <span className="news-skeleton-block news-skeleton-line" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
