import { Router } from "express";
import { createReservationControllers } from "../controllers/reservation.controller.js";

export function createReservationRouter(): Router {
  const router = Router();
  const controller = createReservationControllers();
  router.post("/reservations", controller.createReservation);
  router.get("/reservations/user/:userId", controller.listUserReservations);
  router.get("/reservations/:id", controller.getReservation);
  router.patch("/reservations/:id/cancel", controller.cancelReservation);
  router.patch("/reservations/:id/confirm", controller.confirmReservation);
  router.delete("/reservations/:id", controller.cancelReservation);
  return router;
}
export default createReservationRouter;
