export default function HomeLoading() {
  return (
    <main className="home-page home-loading" aria-busy="true" aria-label="首页加载中">
      <section className="home-loading-hero home-loading-shimmer" />
      <section className="home-loading-kpis">
        {Array.from({ length: 6 }, (_, index) => <span className="home-loading-shimmer" key={index} />)}
      </section>
      <section className="home-loading-charts">
        <span className="home-loading-shimmer" />
        <span className="home-loading-shimmer" />
        <span className="home-loading-shimmer" />
        <span className="home-loading-shimmer" />
      </section>
      <section className="home-loading-news home-loading-shimmer" />
    </main>
  );
}
