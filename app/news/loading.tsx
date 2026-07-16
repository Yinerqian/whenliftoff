export default function NewsLoading() {
  return (
    <main className="app-shell news-shell">
      <div className="news-page news-loading" aria-label="正在加载航天新闻">
        <div className="news-heading-skeleton" />
        <div className="news-lead-skeleton"><div /><aside /></div>
        <div className="news-grid-skeleton">{Array.from({ length: 6 }, (_, index) => <div key={index} />)}</div>
      </div>
    </main>
  );
}

