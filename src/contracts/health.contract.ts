export interface HealthResponse {
  status: "ok";
  service: "campushub-backend";
  timestamp: string;
}

export interface ErrorResponse {
  status: "error";
  message: string;
}
