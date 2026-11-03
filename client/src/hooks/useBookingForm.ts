import { useState, type FormEvent } from "react";
import {
  createReservation,
  errorMessage,
  type Resource,
} from "../api/campushubApi";
export function useBookingForm(
  resource: Resource,
  userId: string,
  onBooked: () => void,
) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setError("");
    const a = new Date(start),
      b = new Date(end);
    if (
      !start ||
      !end ||
      !Number.isFinite(a.getTime()) ||
      !Number.isFinite(b.getTime()) ||
      b <= a
    ) {
      setError("Choose valid times. End time must be after start time.");
      return;
    }
    if (!userId.trim()) {
      setError("Enter your student ID before booking.");
      return;
    }
    setLoading(true);
    try {
      await createReservation({
        resourceId: resource.id,
        userId: userId.trim(),
        startTime: a.toISOString(),
        endTime: b.toISOString(),
      });
      onBooked();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  return { start, setStart, end, setEnd, isLoading, error, submit };
}
