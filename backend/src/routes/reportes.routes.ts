import { Router } from "express";
import { enviarReportePorEmail } from "../services/email.service.js";

export const reportesRouter = Router();

reportesRouter.post("/email", async (req, res, next) => {
  try {
    const { to, residentName, days, html } = req.body || {};
    if (!to || !residentName || !days || !html) {
      res.status(400).json({ message: "Faltan datos para enviar el reporte." });
      return;
    }

    const result = await enviarReportePorEmail({
      to: String(to),
      residentName: String(residentName),
      days: Number(days),
      html: String(html)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});
