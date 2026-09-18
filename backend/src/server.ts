import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase } from "./config/db.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { registrosRouter } from "./routes/registros.routes.js";
import { reportesRouter } from "./routes/reportes.routes.js";
import { residentesRouter } from "./routes/residentes.routes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticRoot = path.resolve(__dirname, "../../mockups/web");

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(staticRoot));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gestion-residentes-antu-api" });
});

app.use("/api/residentes", residentesRouter);
app.use("/api/residentes", dashboardRouter);
app.use("/api/registros", registrosRouter);
app.use("/api/reportes", reportesRouter);

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`API Gestion Residentes Antu escuchando en http://localhost:${port}/api`);
    });
  })
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos.", error);
    process.exit(1);
  });
