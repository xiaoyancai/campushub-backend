import { useEffect, useState } from "react";
import {
  cancelReservation,
  fetchUserReservations,
  fetchResources,
  errorMessage,
  type Reservation,
  type Resource,
} from "../api/campushubApi";
export function useReservations(userId: string, revision: number) {
  const [items, setItems] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHasLoaded(false);
    setLoadError("");
    setCancelError("");
    setItems([]);
    fetchUserReservations(userId, controller.signal)
      .then((bookings) => {
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
    setResourceError("");
    setResources([]);
    fetchResources(undefined, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setResources(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResourceError(
            "Resource names could not be loaded. Bookings are shown by resource ID. You can still cancel them.",
          );
        }
      });
    return () => controller.abort();
  }, [refresh]);

  async function cancel(id: string): Promise<void> {
    if (cancelling) return;
    setCancelling(id);
    setCancelError("");
    try {
      await cancelReservation(id);
      setRefresh((value) => value + 1);
    } catch (error: unknown) {
      setCancelError(errorMessage(error));
    } finally {
      setCancelling("");
    }
  }

  const active = items.filter((item) => item.status !== "CANCELLED");
  return {
    active,
    resources,
    isLoading,
    hasLoaded,
    loadError,
    resourceError,
    cancelError,
    cancelling,
    cancel,
    refresh: () => setRefresh((value) => value + 1),
  };
}
