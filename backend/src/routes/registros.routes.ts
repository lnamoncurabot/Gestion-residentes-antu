import { Router } from "express";
import { crearRegistro, eliminarRegistro, listarRegistros } from "../services/registros.service.js";

export const registrosRouter = Router();

registrosRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listarRegistros());
  } catch (error) {
    next(error);
  }
});

registrosRouter.post("/", async (req, res, next) => {
  try {
    const registro = await crearRegistro(req.body);
    res.status(201).json(registro);
  } catch (error) {
    next(error);
  }
});

registrosRouter.delete("/:origen/:id", async (req, res, next) => {
  try {
    const origen = req.params.origen as "cam" | "pro" | "nutri";
    const id = Number(req.params.id);
    res.json(await eliminarRegistro(origen, id));
  } catch (error) {
    next(error);
  }
});
