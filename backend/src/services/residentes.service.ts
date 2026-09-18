import { pool } from "../config/db.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

const ESTADOS_RESIDENTE = ["Activo", "Inactivo", "Egresado", "Fallecido"] as const;
const SEXOS_RESIDENTE = ["Femenino", "Masculino", "Otro", "No informado"] as const;

type EstadoResidente = (typeof ESTADOS_RESIDENTE)[number];
type SexoResidente = (typeof SEXOS_RESIDENTE)[number];

type ResidentePayload = {
  nombre_completo: string;
  rut: string;
  fecha_nacimiento?: string | null;
  edad_texto?: string | null;
  sexo?: SexoResidente;
  fecha_ingreso?: string | null;
  peso_inicial_kg?: number | null;
  patologias_ingreso?: string | null;
  alergias?: string | null;
  habitacion?: string | null;
  servicio_urgencia?: string | null;
  estado?: EstadoResidente;
  apoderado_nombre?: string | null;
  apoderado_parentesco?: string | null;
  apoderado_telefono?: string | null;
  apoderado_email?: string | null;
  contacto_sos_nombre?: string | null;
  contacto_sos_telefono?: string | null;
};

function normalizarFecha(fecha?: string | null) {
  const value = String(fecha || "").trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return value;

  const localMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (!localMatch) return value;

  const [, day, month, year] = localMatch;
  return `${year}-${month}-${day}`;
}

function normalizarResidentePayload(payload: ResidentePayload) {
  const nombre = String(payload.nombre_completo || "").trim();
  const rut = String(payload.rut || "").trim();

  if (!nombre) {
    throw new Error("Debe ingresar el nombre completo del residente.");
  }

  if (!rut) {
    throw new Error("Debe ingresar el RUT del residente.");
  }

  const sexo = payload.sexo || "No informado";
  if (!SEXOS_RESIDENTE.includes(sexo)) {
    throw new Error("Sexo de residente no valido.");
  }

  const estado = payload.estado || "Activo";
  if (!ESTADOS_RESIDENTE.includes(estado)) {
    throw new Error("Estado de residente no valido.");
  }

  return {
    nombre_completo: nombre,
    rut,
    fecha_nacimiento: normalizarFecha(payload.fecha_nacimiento),
    edad_texto: payload.edad_texto || null,
    sexo,
    fecha_ingreso: normalizarFecha(payload.fecha_ingreso),
    peso_inicial_kg: payload.peso_inicial_kg ?? null,
    patologias_ingreso: payload.patologias_ingreso || null,
    alergias: payload.alergias || null,
    habitacion: payload.habitacion || null,
    servicio_urgencia: payload.servicio_urgencia || null,
    estado,
    apoderado_nombre: payload.apoderado_nombre || "Sin apoderado informado",
    apoderado_parentesco: payload.apoderado_parentesco || null,
    apoderado_telefono: payload.apoderado_telefono || null,
    apoderado_email: payload.apoderado_email || null,
    contacto_sos_nombre: payload.contacto_sos_nombre || null,
    contacto_sos_telefono: payload.contacto_sos_telefono || null
  };
}

export async function buscarResidentes(search: string) {
  const like = `%${search.trim()}%`;
  const [rows] = await pool.execute(
    `SELECT
        r.id,
        r.nombre_completo,
        r.rut,
        r.edad_texto,
        r.sexo,
        r.fecha_ingreso,
        r.peso_inicial_kg,
        r.patologias_ingreso,
        r.servicio_urgencia,
        r.estado,
        a.nombre AS apoderado_nombre,
        a.telefono AS apoderado_telefono,
        a.email AS apoderado_email,
        a.contacto_sos_nombre,
        a.contacto_sos_telefono
     FROM residentes r
     LEFT JOIN apoderados a
       ON a.residente_id = r.id
      AND a.es_contacto_principal = 1
     WHERE :search = '' OR r.nombre_completo LIKE :like OR r.rut LIKE :like
     ORDER BY r.nombre_completo`,
    { search: search.trim(), like }
  );
  return rows as RowDataPacket[];
}

export async function obtenerResidente(id: number) {
  const [rows] = await pool.execute(
    `SELECT
        r.*,
        a.nombre AS apoderado_nombre,
        a.parentesco AS apoderado_parentesco,
        a.telefono AS apoderado_telefono,
        a.email AS apoderado_email,
        a.contacto_sos_nombre,
        a.contacto_sos_telefono
     FROM residentes r
     LEFT JOIN apoderados a
       ON a.residente_id = r.id
      AND a.es_contacto_principal = 1
     WHERE r.id = :id
     LIMIT 1`,
    { id }
  );
  const typedRows = rows as RowDataPacket[];
  return typedRows[0] ?? null;
}

export async function crearResidente(payload: ResidentePayload) {
  const data = normalizarResidentePayload(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [residenteResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO residentes (
        nombre_completo, rut, fecha_nacimiento, edad_texto, sexo, fecha_ingreso,
        peso_inicial_kg, patologias_ingreso, alergias, habitacion, servicio_urgencia, estado
      ) VALUES (
        :nombre_completo, :rut, :fecha_nacimiento, :edad_texto, :sexo, :fecha_ingreso,
        :peso_inicial_kg, :patologias_ingreso, :alergias, :habitacion, :servicio_urgencia, :estado
      )`,
      data
    );

    await connection.execute(
      `INSERT INTO apoderados (
        residente_id, nombre, parentesco, telefono, email,
        contacto_sos_nombre, contacto_sos_telefono, es_contacto_principal
      ) VALUES (
        :residente_id, :apoderado_nombre, :apoderado_parentesco, :apoderado_telefono, :apoderado_email,
        :contacto_sos_nombre, :contacto_sos_telefono, 1
      )`,
      { ...data, residente_id: residenteResult.insertId }
    );

    await connection.commit();
    return obtenerResidente(residenteResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function actualizarResidente(id: number, payload: ResidentePayload) {
  const data = normalizarResidentePayload(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [residenteResult] = await connection.execute<ResultSetHeader>(
      `UPDATE residentes
       SET nombre_completo = :nombre_completo,
           rut = :rut,
           fecha_nacimiento = :fecha_nacimiento,
           edad_texto = :edad_texto,
           sexo = :sexo,
           fecha_ingreso = :fecha_ingreso,
           peso_inicial_kg = :peso_inicial_kg,
           patologias_ingreso = :patologias_ingreso,
           alergias = :alergias,
           habitacion = :habitacion,
           servicio_urgencia = :servicio_urgencia,
           estado = :estado
       WHERE id = :id`,
      { ...data, id }
    );

    if (residenteResult.affectedRows === 0) {
      throw new Error("Residente no encontrado.");
    }

    const [apoderados] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM apoderados
       WHERE residente_id = :id
         AND es_contacto_principal = 1
       LIMIT 1`,
      { id }
    );

    if (apoderados[0]) {
      await connection.execute(
        `UPDATE apoderados
         SET nombre = :apoderado_nombre,
             parentesco = :apoderado_parentesco,
             telefono = :apoderado_telefono,
             email = :apoderado_email,
             contacto_sos_nombre = :contacto_sos_nombre,
             contacto_sos_telefono = :contacto_sos_telefono
         WHERE id = :apoderado_id`,
        { ...data, apoderado_id: apoderados[0].id }
      );
    } else {
      await connection.execute(
        `INSERT INTO apoderados (
          residente_id, nombre, parentesco, telefono, email,
          contacto_sos_nombre, contacto_sos_telefono, es_contacto_principal
        ) VALUES (
          :id, :apoderado_nombre, :apoderado_parentesco, :apoderado_telefono, :apoderado_email,
          :contacto_sos_nombre, :contacto_sos_telefono, 1
        )`,
        { ...data, id }
      );
    }

    await connection.commit();
    return obtenerResidente(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cambiarEstadoResidente(id: number, estado: EstadoResidente) {
  if (!ESTADOS_RESIDENTE.includes(estado)) {
    throw new Error("Estado de residente no valido.");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE residentes
     SET estado = :estado
     WHERE id = :id`,
    { id, estado }
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return obtenerResidente(id);
}
