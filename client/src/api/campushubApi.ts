import axios from "axios";
import type {
  Resource,
  Reservation,
  CreateReservationRequest,
  ErrorResponse,
} from "../../../src/contracts/reservation.contract";
export type {
  ResourceType,
  Resource,
  Reservation,
  ErrorResponse,
} from "../../../src/contracts/reservation.contract";
export type CreateReservationDTO = CreateReservationRequest;
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
});
export async function fetchResources(
  type?: string,
  signal?: AbortSignal,
): Promise<Resource[]> {
  return (
    await api.get<Resource[]>("/resources", {
      params: type ? { type } : {},
      signal,
    })
  ).data;
}
export async function createReservation(
  payload: CreateReservationDTO,
): Promise<Reservation> {
  return (await api.post<Reservation>("/reservations", payload)).data;
}
export async function fetchUserReservations(
  userId: string,
  signal?: AbortSignal,
): Promise<Reservation[]> {
  return (
    await api.get<Reservation[]>(
      "/reservations/user/" + encodeURIComponent(userId),
      { signal },
    )
  ).data;
}
export async function cancelReservation(reservationId: string): Promise<void> {
  await api.delete("/reservations/" + encodeURIComponent(reservationId));
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    if (error.response?.status === 409)
      return error.response.data.code === "RESOURCE_UNAVAILABLE"
        ? "This resource is currently unavailable. Please choose another resource."
        : "This resource is already reserved for the selected time window. Please choose a different time.";
    if (!error.response)
      return "Unable to connect to CampusHub. Check that the API is running and try again.";
    return (
      error.response.data?.message ||
      "The request could not be completed. Please try again."
    );
  }
  return "Something went wrong. Please try again.";
}
