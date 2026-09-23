import { pool } from "../config/db.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type RegistroPayload = {
  origen: "cam" | "pro" | "nutri";
  residente_id: number;
  usuario_email?: string;
  fecha_hora: string;
  turno?: string;
  cuidadora?: string;
  tipo?: string;
  detalle?: string;
  rol?: "Directora Tecnica" | "Enfermero";
  registro?: string;
  imc?: string;
  observacion?: string;
  peso_kg?: number | null;
  talla_m?: number | null;
  cicloTemp?: string;
  cicloSpo2?: string;
  cicloPa?: string;
  cicloHgt?: string;
  medicamento?: string;
  horaMedicamento?: string;
  datos?: Record<string, unknown>;
};

function mysqlDateTime(value: string) {
  const normalized = String(value || "").replace("T", " ").slice(0, 16);
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : null;
}

function parseDecimal(value?: string) {
  const text = String(value || "").replace(",", ".");
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parsePressure(value?: string) {
  const [sistolica, diastolica] = String(value || "").split("/").map((item) => Number(item));
  return {
    sistolica: Number.isFinite(sistolica) ? sistolica : null,
    diastolica: Number.isFinite(diastolica) ? diastolica : null
  };
}

async function usuarioIdPorEmail(email = "administracion@hogarantu.cl") {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM usuarios WHERE email = :email LIMIT 1",
    { email }
  );
  if (rows[0]) return Number(rows[0].id);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO usuarios (nombre, email, password_hash, activo, ventana_edicion_horas)
     VALUES (:nombre, :email, NULL, 1, 16)`,
    { nombre: email.split("@")[0], email }
  );
  return result.insertId;
}

export async function listarRegistros() {
  const [cam] = await pool.execute<RowDataPacket[]>(
    `SELECT rc.id, rc.residente_id, r.nombre_completo AS residente, u.email AS usuario,
            rc.fecha_hora, rc.turno, rc.nombre_cuidadora, rc.tipo_registro, rc.observaciones
     FROM registros_cam rc
     JOIN residentes r ON r.id = rc.residente_id
     JOIN usuarios u ON u.id = rc.usuario_id
     ORDER BY rc.fecha_hora DESC
     LIMIT 100`
  );
  const [pro] = await pool.execute<RowDataPacket[]>(
    `SELECT rp.id, rp.residente_id, r.nombre_completo AS residente, u.email AS usuario,
            rp.rol_profesional, rp.fecha_hora, rp.evolucion, rp.datos_json
     FROM registros_profesionales rp
     JOIN residentes r ON r.id = rp.residente_id
     JOIN usuarios u ON u.id = rp.usuario_id
     ORDER BY rp.fecha_hora DESC
     LIMIT 100`
  );
  const [nutri] = await pool.execute<RowDataPacket[]>(
    `SELECT rn.id, rn.residente_id, r.nombre_completo AS residente, u.email AS usuario,
            rn.fecha_hora, rn.peso_kg, rn.imc, rn.observaciones, rn.datos_json
     FROM registros_nutricion rn
     JOIN residentes r ON r.id = rn.residente_id
     JOIN usuarios u ON u.id = rn.usuario_id
     ORDER BY rn.fecha_hora DESC
     LIMIT 100`
  );
  return { cam, pro, nutri };
}

export async function crearRegistro(payload: RegistroPayload) {
  const residenteId = Number(payload.residente_id);
  const fechaHora = mysqlDateTime(payload.fecha_hora);
  if (!residenteId || !fechaHora) {
    throw new Error("Debe indicar residente y fecha/hora validos.");
  }

  const usuarioId = await usuarioIdPorEmail(payload.usuario_email);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (payload.origen === "cam") {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO registros_cam
           (residente_id, usuario_id, fecha_hora, turno, nombre_cuidadora, tipo_registro, observaciones, editable_hasta)
         VALUES
           (:residenteId, :usuarioId, :fechaHora, :turno, :cuidadora, :tipo, :detalle, DATE_ADD(:fechaHora, INTERVAL 16 HOUR))`,
        {
          residenteId,
          usuarioId,
          fechaHora,
          turno: payload.turno || "Dia",
          cuidadora: payload.cuidadora || "Sin cuidadora informada",
          tipo: payload.tipo || "Registro CAM",
          detalle: payload.detalle || ""
        }
      );

      const registroCamId = result.insertId;
      const pressure = parsePressure(payload.cicloPa);
      if (payload.cicloTemp || payload.cicloSpo2 || payload.cicloHgt || payload.cicloPa) {
        await connection.execute(
          `INSERT INTO controles_ciclos
             (registro_cam_id, residente_id, usuario_id, fecha_hora, temperatura_c, saturacion_oxigeno,
              presion_sistolica, presion_diastolica, hgt_glucosa_mg_dl, observaciones)
           VALUES
             (:registroCamId, :residenteId, :usuarioId, :fechaHora, :temp, :spo2, :sistolica, :diastolica, :hgt, :detalle)`,
          {
            registroCamId,
            residenteId,
            usuarioId,
            fechaHora,
            temp: parseDecimal(payload.cicloTemp),
            spo2: parseDecimal(payload.cicloSpo2),
            sistolica: pressure.sistolica,
            diastolica: pressure.diastolica,
            hgt: parseDecimal(payload.cicloHgt),
            detalle: payload.detalle || ""
          }
        );
      }

      if (payload.medicamento) {
        await connection.execute(
          `INSERT INTO administraciones_medicamentos
             (registro_cam_id, residente_id, usuario_id, fecha_hora, nombre_medicamento, suministrado_por, observaciones)
           VALUES
             (:registroCamId, :residenteId, :usuarioId, :fechaHora, :medicamento, :cuidadora, :detalle)`,
          {
            registroCamId,
            residenteId,
            usuarioId,
            fechaHora,
            medicamento: payload.medicamento,
            cuidadora: payload.cuidadora || "Sin responsable informado",
            detalle: payload.detalle || ""
          }
        );
      }

      await connection.commit();
      return { id: registroCamId, ...payload };
    }

    if (payload.origen === "pro") {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO registros_profesionales
           (residente_id, usuario_id, rol_profesional, fecha_hora, evolucion, datos_json, editable_hasta)
         VALUES
           (:residenteId, :usuarioId, :rol, :fechaHora, :registro, :datos, DATE_ADD(:fechaHora, INTERVAL 16 HOUR))`,
        {
          residenteId,
          usuarioId,
          rol: payload.rol || "Enfermero",
          fechaHora,
          registro: payload.registro || "Registro sin detalle.",
          datos: JSON.stringify(payload.datos || {})
        }
      );
      await connection.commit();
      return { id: result.insertId, ...payload };
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO registros_nutricion
         (residente_id, usuario_id, fecha_hora, peso_kg, talla_m, imc, observaciones, datos_json, editable_hasta)
       VALUES
         (:residenteId, :usuarioId, :fechaHora, :peso, :talla, :imc, :observacion, :datos, DATE_ADD(:fechaHora, INTERVAL 16 HOUR))`,
      {
        residenteId,
        usuarioId,
        fechaHora,
        peso: payload.peso_kg ?? null,
        talla: payload.talla_m ?? null,
        imc: parseDecimal(payload.imc),
        observacion: payload.observacion || "Sin observaciones.",
        datos: JSON.stringify(payload.datos || {})
      }
    );
    await connection.commit();
    return { id: result.insertId, ...payload };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function eliminarRegistro(origen: RegistroPayload["origen"], id: number) {
  const tableByOrigin = {
    cam: "registros_cam",
    pro: "registros_profesionales",
    nutri: "registros_nutricion"
  };
  const table = tableByOrigin[origen];
  if (!table || !id) {
    throw new Error("Debe indicar un registro valido para eliminar.");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM ${table} WHERE id = :id`,
    { id }
  );

  if (!result.affectedRows) {
    throw new Error("No se encontro el registro solicitado.");
  }

  return { ok: true, origen, id };
}
