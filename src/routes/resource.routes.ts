import { Router } from "express";
import { listResources } from "../controllers/resource.controller.js";
export const resourceRouter = Router();
resourceRouter.get("/", listResources);
