import { useBookingForm } from "../hooks/useBookingForm";
import type { Resource } from "../api/campushubApi";
import styles from "../styles.module.css";
export interface BookingFormProps {
  resource: Resource;
  userId: string;
  onBooked: () => void;
  onClose: () => void;
}
export function BookingForm({
  resource,
  userId,
  onBooked,
  onClose,
}: BookingFormProps) {
  const { start, setStart, end, setEnd, isLoading, error, submit } =
    useBookingForm(resource, userId, onBooked);
  return (
    <div className={styles.modalBackdrop}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className={styles.modal}
      >
        <span className={styles.eyebrow}>MAKE TIME FOR WHAT MATTERS</span>
        <h2 id="booking-title">Book {resource.name}</h2>
        <p>
          {resource.location} · Student: {userId}
        </p>
        <form onSubmit={submit}>
          <label>
            Start time
            <input
              autoFocus
              required
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <label>
            End time
            <input
              required
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <p className={styles.muted}>
            Times use your device’s local timezone (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" disabled={isLoading} onClick={onClose}>
              Close
            </button>
            <button
              className={styles.primary}
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
