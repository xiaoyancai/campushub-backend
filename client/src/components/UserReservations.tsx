import { useEffect, useState } from 'react';
import {
  cancelReservation, fetchUserReservations, fetchResources, errorMessage,
  type Reservation, type Resource,
} from '../api/campushubApi';
import styles from '../styles.module.css';

export interface UserReservationsProps { userId: string; revision: number }

export function UserReservations({ userId, revision }: UserReservationsProps) {
  const [items, setItems] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [resourceError, setResourceError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHasLoaded(false);
    setLoadError('');
    setCancelError('');
    setItems([]);
    fetchUserReservations(userId, controller.signal)
      .then(bookings => {
        if (!controller.signal.aborted) {
          setItems(bookings);
          setHasLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, revision, refresh]);

  // Resource names are supplementary: their failure must never hide bookings.
  useEffect(() => {
    const controller = new AbortController();
    setResourceError('');
    fetchResources(undefined, controller.signal)
      .then(list => {
        if (!controller.signal.aborted) setResources(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResourceError('Resource names could not be loaded. Bookings are shown by resource ID. You can still cancel them.');
        }
      });
    return () => controller.abort();
  }, [refresh]);

  async function cancel(id: string): Promise<void> {
    if (cancelling) return;
    setCancelling(id);
    setCancelError('');
    try {
      await cancelReservation(id);
      setRefresh(value => value + 1);
    } catch (error: unknown) {
      setCancelError(errorMessage(error));
    } finally {
      setCancelling('');
    }
  }

  const active = items.filter(item => item.status !== 'CANCELLED');
  return <section>
    <div className={styles.sectionTitle}>
      <div><span className={styles.eyebrow}>YOUR CAMPUS PLANS</span><h2>My bookings</h2></div>
      <button disabled={isLoading || !!cancelling} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
    </div>
    {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
    {cancelError && <p role="alert" className={styles.error}>{cancelError}</p>}
    {resourceError && <p role="status" className={styles.error}>{resourceError}</p>}
    {isLoading ? <p role="status">Loading your bookings…</p> : hasLoaded && (
      active.length === 0 ? <div className={styles.empty}>
        <h3>A little space for your next idea.</h3>
        <p>Your active bookings will appear here. Explore resources to get started.</p>
      </div> : <div className={styles.bookings}>{active.map(item => <article key={item.id} className={styles.booking}>
        <div>
          <span className={styles.available}>{item.status}</span>
          <h3>{resources.find(resource => resource.id === item.resourceId)?.name || item.resourceId}</h3>
          <p>{new Date(item.startTime).toLocaleString()} — {new Date(item.endTime).toLocaleString()}</p>
        </div>
        <button disabled={!!cancelling} onClick={() => void cancel(item.id)}>
          {cancelling === item.id ? 'Cancelling…' : 'Cancel reservation'}
        </button>
      </article>)}</div>
    )}
  </section>;
}
