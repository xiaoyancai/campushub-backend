import { Router } from "express";
import { createReservationControllers } from "../controllers/reservation.controller.js";
import { createReservationService } from "../services/reservation.service.js";

export function createReservationRouter(): Router {
  const router = Router();
  const controller = createReservationControllers(createReservationService());
  router.get("/resources", controller.listResources);
  router.post("/reservations", controller.createReservation);
  router.get("/reservations/user/:userId", controller.listUserReservations);
  router.get("/reservations/:id", controller.getReservation);
  router.delete("/reservations/:id", controller.cancelReservation);
  return router;
}
export default createReservationRouter;
