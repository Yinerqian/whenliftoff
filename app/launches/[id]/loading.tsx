function SectionHeadingSkeleton() {
  return (
    <div className="launch-detail-section-heading-skeleton">
      <span className="launch-skeleton-block launch-skeleton-line is-heading" />
      <span className="launch-skeleton-block launch-skeleton-line is-short" />
    </div>
  );
}

export default function LaunchDetailLoading() {
  return (
    <main className="launch-detail-route-main">
      <div className="detail-page launch-page-content launch-detail-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">正在加载发射任务详情</span>
        <div className="launch-skeleton-block launch-detail-breadcrumb-skeleton" aria-hidden="true" />

        <section className="detail-hero-card launch-detail-hero-skeleton" aria-hidden="true">
          <div className="launch-skeleton-block launch-detail-hero-media-skeleton" />
          <div className="detail-hero-copy launch-detail-hero-copy-skeleton">
            <span className="launch-skeleton-block launch-detail-title-skeleton" />
            <span className="launch-skeleton-block launch-detail-subtitle-skeleton" />
            <div className="launch-detail-provider-skeleton">
              <span className="launch-skeleton-block" />
              <div>
                <span className="launch-skeleton-block launch-skeleton-line is-medium" />
                <span className="launch-skeleton-block launch-skeleton-line is-short" />
              </div>
            </div>
            <div className="launch-detail-countdown-skeleton">
              {Array.from({ length: 4 }, (_, index) => (
                <span className="launch-skeleton-block" key={index} />
              ))}
            </div>
            <div className="launch-detail-actions-skeleton">
              <span className="launch-skeleton-block" />
              <span className="launch-skeleton-block" />
            </div>
          </div>
        </section>

        <div className="detail-layout launch-detail-layout-skeleton" aria-hidden="true">
          <article className="detail-content">
            <section className="detail-description-card launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              <span className="launch-skeleton-block launch-skeleton-line" />
              <span className="launch-skeleton-block launch-skeleton-line" />
              <span className="launch-skeleton-block launch-skeleton-line is-medium" />
            </section>

            <section className="mission-facts launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              <div className="key-facts-grid launch-detail-facts-skeleton">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="key-fact" key={index}>
                    <span className="launch-skeleton-block launch-fact-icon-skeleton" />
                    <div>
                      <span className="launch-skeleton-block launch-skeleton-line is-short" />
                      <span className="launch-skeleton-block launch-skeleton-line is-medium" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-timeline-card launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              <div className="launch-detail-timeline-skeleton">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index}>
                    <span className="launch-skeleton-block" />
                    <span className="launch-skeleton-block" />
                    <span className="launch-skeleton-block" />
                  </div>
                ))}
              </div>
            </section>
          </article>

          <aside className="detail-sidebar">
            <section className="detail-live-card launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              <div className="launch-skeleton-block launch-detail-live-preview-skeleton" />
              <span className="launch-skeleton-block launch-skeleton-line is-medium" />
              <span className="launch-skeleton-block launch-detail-button-skeleton" />
            </section>
            <section className="detail-map-card launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              <div className="launch-skeleton-block launch-detail-map-preview-skeleton" />
              <span className="launch-skeleton-block launch-skeleton-line is-medium" />
            </section>
            <section className="detail-resource-card launch-detail-panel-skeleton">
              <SectionHeadingSkeleton />
              {Array.from({ length: 3 }, (_, index) => (
                <div className="launch-detail-resource-row-skeleton" key={index}>
                  <span className="launch-skeleton-block" />
                  <div>
                    <span className="launch-skeleton-block launch-skeleton-line is-medium" />
                    <span className="launch-skeleton-block launch-skeleton-line is-short" />
                  </div>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
