import { Router } from "express";
import {
  actualizarResidente,
  buscarResidentes,
  cambiarEstadoResidente,
  crearResidente,
  obtenerResidente
} from "../services/residentes.service.js";

export const residentesRouter = Router();

residentesRouter.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "");
    const residentes = await buscarResidentes(search);
    res.json(residentes);
  } catch (error) {
    next(error);
  }
});

residentesRouter.get("/:id", async (req, res, next) => {
  try {
    const residente = await obtenerResidente(Number(req.params.id));
    if (!residente) {
      res.status(404).json({ message: "Residente no encontrado" });
      return;
    }
    res.json(residente);
  } catch (error) {
    next(error);
  }
});

residentesRouter.post("/", async (req, res, next) => {
  try {
    const residente = await crearResidente(req.body);
    res.status(201).json(residente);
  } catch (error) {
    next(error);
  }
});

residentesRouter.put("/:id", async (req, res, next) => {
  try {
    const residente = await actualizarResidente(Number(req.params.id), req.body);
    res.json(residente);
  } catch (error) {
    next(error);
  }
});

residentesRouter.patch("/:id/estado", async (req, res, next) => {
  try {
    const residente = await cambiarEstadoResidente(Number(req.params.id), req.body.estado);
    if (!residente) {
      res.status(404).json({ message: "Residente no encontrado" });
      return;
    }
    res.json(residente);
  } catch (error) {
    next(error);
  }
});
