const timelineGroups = [2, 1, 2];

function LaunchRowSkeleton() {
  return (
    <article className="launch-row launch-row-skeleton">
      <div className="launch-skeleton-block launch-row-media-skeleton" />
      <div className="launch-row-copy-skeleton">
        <span className="launch-skeleton-block launch-skeleton-line is-heading" />
        <div className="launch-row-time-skeleton">
          <span className="launch-skeleton-block launch-skeleton-line is-medium" />
          <span className="launch-skeleton-block launch-skeleton-line is-short" />
        </div>
        <div className="launch-row-info-skeleton">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="launch-skeleton-block launch-skeleton-line" key={index} />
          ))}
        </div>
      </div>
      <span className="launch-skeleton-block launch-row-state-skeleton" />
    </article>
  );
}

export default function LaunchesLoading() {
  return (
    <main className="launch-route-main">
      <section className="dashboard launch-page-content launch-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">正在加载发射日程</span>
        <div className="filters-row launch-filter-skeleton" aria-hidden="true">
          <div>
            {[82, 106, 94, 116, 88].map((width) => (
              <span className="launch-skeleton-block" style={{ width }} key={width} />
            ))}
          </div>
        </div>

        <div className="content-grid" aria-hidden="true">
          <section className="timeline launch-timeline-skeleton">
            {timelineGroups.map((cardCount, groupIndex) => (
              <div className="timeline-group launch-timeline-group-skeleton" key={groupIndex}>
                <aside className="date-rail">
                  <span className="launch-skeleton-block launch-date-skeleton" />
                  <i />
                </aside>
                <div className="event-stack">
                  {Array.from({ length: cardCount }, (_, cardIndex) => (
                    <LaunchRowSkeleton key={cardIndex} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="side-column launch-side-skeleton">
            <section className="launch-upcoming-skeleton">
              <div className="launch-skeleton-block launch-upcoming-media-skeleton">
                <span className="launch-skeleton-chip" />
                <span className="launch-skeleton-action" />
              </div>
              <div className="launch-upcoming-copy-skeleton">
                <span className="launch-skeleton-block launch-skeleton-line is-short" />
                <span className="launch-skeleton-block launch-skeleton-line is-heading" />
                <div className="launch-countdown-skeleton">
                  {Array.from({ length: 4 }, (_, index) => (
                    <span className="launch-skeleton-block" key={index} />
                  ))}
                </div>
              </div>
            </section>
            <section className="next-list launch-next-list-skeleton">
              <span className="launch-skeleton-block launch-skeleton-line is-medium" />
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index}>
                  <span className="launch-skeleton-block" />
                  <span className="launch-skeleton-block" />
                  <span className="launch-skeleton-block" />
                </div>
              ))}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
