export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}
export interface Reservation {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}
export type CreateReservationRequest = Omit<Reservation, "id" | "status">;
export interface ErrorResponse {
  code: string;
  message: string;
}
export type ApiStatusCode = 200 | 201 | 204 | 400 | 404 | 409 | 413 | 415 | 500;
