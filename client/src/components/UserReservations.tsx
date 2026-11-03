import { useReservations } from "../hooks/useReservations";
import styles from "../styles.module.css";

export interface UserReservationsProps {
  userId: string;
  revision: number;
}

export function UserReservations({ userId, revision }: UserReservationsProps) {
  const {
    active,
    resources,
    isLoading,
    hasLoaded,
    loadError,
    resourceError,
    cancelError,
    cancelling,
    cancel,
    refresh,
  } = useReservations(userId, revision);
  return (
    <section>
      <div className={styles.sectionTitle}>
        <div>
          <span className={styles.eyebrow}>YOUR CAMPUS PLANS</span>
          <h2>My bookings</h2>
        </div>
        <button disabled={isLoading || !!cancelling} onClick={refresh}>
          Refresh
        </button>
      </div>
      {loadError && (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      )}
      {cancelError && (
        <p role="alert" className={styles.error}>
          {cancelError}
        </p>
      )}
      {resourceError && (
        <p role="status" className={styles.error}>
          {resourceError}
        </p>
      )}
      {isLoading ? (
        <p role="status">Loading your bookings…</p>
      ) : (
        hasLoaded &&
        (active.length === 0 ? (
          <div className={styles.empty}>
            <h3>A little space for your next idea.</h3>
            <p>
              Your active bookings will appear here. Explore resources to get
              started.
            </p>
          </div>
        ) : (
          <div className={styles.bookings}>
            {active.map((item) => (
              <article key={item.id} className={styles.booking}>
                <div>
                  <span className={styles.available}>{item.status}</span>
                  <h3>
                    {resources.find(
                      (resource) => resource.id === item.resourceId,
                    )?.name || item.resourceId}
                  </h3>
                  <p>
                    {new Date(item.startTime).toLocaleString()} —{" "}
                    {new Date(item.endTime).toLocaleString()}
                  </p>
                </div>
                <button
                  disabled={!!cancelling}
                  onClick={() => void cancel(item.id)}
                >
                  {cancelling === item.id
                    ? "Cancelling…"
                    : "Cancel reservation"}
                </button>
              </article>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
