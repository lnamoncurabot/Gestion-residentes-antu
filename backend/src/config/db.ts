import mysql from "mysql2/promise";
import pg from "pg";
import type { Pool as PgPoolType, PoolClient } from "pg";

const { Pool: PgPool } = pg;

export const DB_ENGINE = (process.env.DB_ENGINE || "mysql").toLowerCase();

type QueryParams = Record<string, unknown> | unknown[];
type QueryResult<T> = Promise<[T, unknown[]]>;

type DbConnection = {
  beginTransaction(): Promise<void>;
  execute<T = unknown>(sql: string, params?: QueryParams): QueryResult<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
};

type DbPool = {
  execute<T = unknown>(sql: string, params?: QueryParams): QueryResult<T>;
  getConnection(): Promise<DbConnection>;
};

const seedResidents = [
  [1, "Isabel Del Carmen Viceion Osorio", "5.335.013-5", "83 anos", "Femenino", "2024-09-01", 60.6, "Diabetes Mellitus tipo 2, Hipertension Arterial, Demencia", "SAMU", "Activo", "Ruben Tapia", "9 8196 6212", "chelo.namoncura@gmail.com", "Karla Hormazabal", "9 3373 2387"],
  [2, "Irene Carolina Parkes Carrasco", "4.508.231-8", "80 anos", "Femenino", "2024-12-03", 34.6, "Hipertension Arterial, Parkinson, Deterioro Cognitivo", "EMECAR", "Activo", "Pablo Verdejo", "9 6619 7409", "pablo.verdejo@gmail.com", "Eduardo Verdejo", "9 9942 3334"],
  [3, "Maria Isabel Leinenweber Bravo", "5.036.161-6", "78 anos", "Femenino", "2019-07-14", 45.5, "Deterioro Cognitivo, Hipertension Arterial", "SAMU", "Activo", "Carlos Longhi", "9 7857 9279", "gclonghi@gmail.com", "Don Caco", "9 7857 9279"],
  [4, "Sara Quiros Muller", "4.898.901-2", "80 anos", "Femenino", "2025-01-26", 41.5, "Postracion, desnutricion, escaras, cancer de mama antiguo", "SAMU", "Activo", "Francisco Yuseff", "9 8868 5910", "franciscoyuseff@gmail.com", "Ignacio", "9 6407 7804"],
  [5, "Beatriz Del Carmen Vera Llanos", "5.486.820-0", "93 anos", "Femenino", "2019-07-19", 46.5, "Hipertension Arterial, Deterioro Cognitivo, Dismovilidad", "SAMU", "Activo", "Ivon Poblete", "9 6699 5192", "carenave@gmail.com", "Carlos Nakamura Vera", "9 52222138"],
  [6, "Rossana del Carmen Silva Vilches", "7.497.569-0", "68 anos", "Femenino", "2020-01-25", 53.6, "Demencia, enfermedad de Parkinson, Depresion", "SAMU", "Activo", "Katherine Figueroa", "9 4440 5227", "katherine.figueroa.silva@gmail.com", "Ivan Figueroa", "9 8889 0273"],
  [7, "Hortensia Martinez Franco", "3.166.817-4", "91 anos", "Femenino", "2026-04-06", 58.7, "Deterioro Cognitivo Mayor", "SAMU", "Activo", "Ximena Vargas", "9 8774 0278", "chelo.namoncura@gmail.com", "Ximena Vargas", "9 8774 0278"],
  [8, "Silvia Guzman Newson", "2.716.675-K", "93 anos", "Femenino", "2021-07-22", 47.1, "Hipertension Arterial", "SAMU", "Activo", "Oriana Aninat", "9 8369 7509", "toty2606@hotmail.com", "Oriana Aninat", "9 8369 7509"],
  [9, "Aida Cecilia Lara Ponce", "5.233.396-2", "85 anos", "Femenino", "2026-04-30", 43.6, "Deterioro Cognitivo Mayor", "SAMU", "Activo", "Nancy Alarcon", "9 9097 5021", "nalarcon1975@gmail.com", "Hans", "9 6591 8991"],
  [10, "Jerman Silva Navarrete", "4.126.362-8", "87 anos", "Masculino", "2025-12-02", 61.2, "Cancer de prostata, ACV, Deterioro Cognitivo, Hipertension Arterial, Diabetes Mellitus", "Policlinico Naval", "Activo", "Germania Silva", "9 7725 9932", "gema.silva.h@gmail.com", "Maritza Silva", "9 6619 9472"],
  [11, "Myriam Maruri Koppmann", "4.486.986-1", "86 anos", "Femenino", "2023-10-26", 56.8, "Deterioro Cognitivo Mayor Mixto, Dismovilidad Leve", "SAMU", "Activo", "Jessica Marchant", "9 9250 5518", "jessicamarchant@gmail.com", "Carlos Marchant", "9 9410 5064"],
  [12, "Jose Omar Bravo Rodriguez", "3.695.879-0", "100 anos", "Masculino", "2024-03-28", 59, "Diabetes Mellitus, Hipertension arterial, hipotiroidismo, hiperglicemia", "EMECAR", "Activo", "Ximena Bravo", "9 7695 3779", "ximebravosanhueza16@gmail.com", "Veronica Bravo", "9 8198 9874"],
  [13, "Carlos Senarega Vasquez", "5.442.578-3", "79 anos", "Masculino", "2025-05-05", 73.5, "Deterioro Cognitivo, Delirio hiperactivo", "EMECAR", "Activo", "Fabiola Llanos", "9 6607 5023", "fabiolallanosdonoso@gmail.com", "Humberto", "9 7977 2674"],
  [14, "Luis Pardo Arias", "3.855.451-4", "86 anos", "Masculino", "2022-10-25", 56.6, "Hipertension Arterial, Demencia Mixta, ACV antiguo", "Clinica ACME", "Activo", "Maria Cecilia Pardo", "9 9280 2564", "mariapardopeq@gmail.com", "Maria Cecilia Pardo", "9 9280 2564"],
  [15, "Nivea Susana Sepulveda Poirrier", "4.290.691-3", "88 anos", "Femenino", "2020-12-25", 46.3, "Antecedentes clinicos pendientes de normalizar", "SAMU", "Activo", "Claudia Soto", "9 9204 2455", "claudiasotosep2@gmail.com", "Sabrina Soto", "9 9677 3683"]
];

function translateSql(sql: string) {
  return sql
    .replace(/DATE_ADD\((:[a-zA-Z_]\w+),\s*INTERVAL\s+16\s+HOUR\)/gi, "($1::timestamp + INTERVAL '16 hours')")
    .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+5\s+DAY\)/gi, "(NOW() - INTERVAL '5 days')")
    .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+1\s+MONTH\)/gi, "(NOW() - INTERVAL '1 month')")
    .replace(/es_contacto_principal\s*=\s*1/gi, "es_contacto_principal = true");
}

function namedParamsToPg(sql: string, params: QueryParams = {}) {
  if (Array.isArray(params)) return { text: sql, values: params };
  const values: unknown[] = [];
  const indexes = new Map<string, number>();
  const text = sql.replace(/(?<!:):([a-zA-Z_]\w*)/g, (_match, name: string) => {
    if (!indexes.has(name)) {
      indexes.set(name, values.length + 1);
      values.push(params[name]);
    }
    return `$${indexes.get(name)}`;
  });
  return { text, values };
}

function isWriteQuery(sql: string) {
  return /^\s*(INSERT|UPDATE|DELETE)/i.test(sql);
}

function appendReturningId(sql: string) {
  if (!/^\s*INSERT/i.test(sql) || /\bRETURNING\b/i.test(sql)) return sql;
  return `${sql} RETURNING id`;
}

class MySqlConnection implements DbConnection {
  constructor(private readonly connection: mysql.PoolConnection) {}
  beginTransaction() {
    return this.connection.beginTransaction();
  }
  execute<T = unknown>(sql: string, params?: QueryParams) {
    return this.connection.execute(sql, params) as QueryResult<T>;
  }
  commit() {
    return this.connection.commit();
  }
  rollback() {
    return this.connection.rollback();
  }
  release() {
    this.connection.release();
  }
}

class MySqlDbPool implements DbPool {
  private readonly inner = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gestion_residentes_antu",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });

  execute<T = unknown>(sql: string, params?: QueryParams) {
    return this.inner.execute(sql, params) as QueryResult<T>;
  }

  async getConnection() {
    return new MySqlConnection(await this.inner.getConnection());
  }
}

class PgConnection implements DbConnection {
  constructor(private readonly client: PoolClient) {}
  async beginTransaction() {
    await this.client.query("BEGIN");
  }
  async execute<T = unknown>(sql: string, params?: QueryParams) {
    return pgExecute<T>(this.client, sql, params);
  }
  async commit() {
    await this.client.query("COMMIT");
  }
  async rollback() {
    await this.client.query("ROLLBACK");
  }
  release() {
    this.client.release();
  }
}

class PgDbPool implements DbPool {
  private readonly inner = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  async execute<T = unknown>(sql: string, params?: QueryParams) {
    return pgExecute<T>(this.inner, sql, params);
  }

  async getConnection() {
    return new PgConnection(await this.inner.connect());
  }
}

async function pgExecute<T = unknown>(runner: PgPoolType | PoolClient, sql: string, params?: QueryParams): QueryResult<T> {
  const translated = translateSql(appendReturningId(sql));
  const { text, values } = namedParamsToPg(translated, params);
  const result = await runner.query(text, values);
  if (!isWriteQuery(sql)) return [result.rows as T, []];
  const insertId = result.rows[0]?.id ? Number(result.rows[0].id) : 0;
  return [{ insertId, affectedRows: result.rowCount || 0 } as T, []];
}

export const pool: DbPool = DB_ENGINE === "postgres" ? new PgDbPool() : new MySqlDbPool();

export async function initializeDatabase() {
  if (DB_ENGINE !== "postgres") return;
  await createPostgresSchema();
  await seedPostgresResidents();
}

async function createPostgresSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS residentes (
      id SERIAL PRIMARY KEY,
      nombre_completo TEXT NOT NULL,
      rut TEXT NOT NULL UNIQUE,
      fecha_nacimiento DATE NULL,
      edad_texto TEXT NULL,
      sexo TEXT NOT NULL DEFAULT 'No informado',
      fecha_ingreso DATE NULL,
      peso_inicial_kg NUMERIC(7,2) NULL,
      patologias_ingreso TEXT NULL,
      alergias TEXT NULL,
      habitacion TEXT NULL,
      servicio_urgencia TEXT NULL,
      estado TEXT NOT NULL DEFAULT 'Activo'
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS apoderados (
      id SERIAL PRIMARY KEY,
      residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      parentesco TEXT NULL,
      telefono TEXT NULL,
      email TEXT NULL,
      contacto_sos_nombre TEXT NULL,
      contacto_sos_telefono TEXT NULL,
      es_contacto_principal BOOLEAN NOT NULL DEFAULT true
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      ventana_edicion_horas INTEGER NOT NULL DEFAULT 16
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS registros_cam (
      id SERIAL PRIMARY KEY,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      fecha_hora TIMESTAMP NOT NULL,
      turno TEXT NULL,
      nombre_cuidadora TEXT NULL,
      tipo_registro TEXT NULL,
      observaciones TEXT NULL,
      editable_hasta TIMESTAMP NULL
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS controles_ciclos (
      id SERIAL PRIMARY KEY,
      registro_cam_id INTEGER NULL REFERENCES registros_cam(id) ON DELETE CASCADE,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      fecha_hora TIMESTAMP NOT NULL,
      temperatura_c NUMERIC(5,2) NULL,
      saturacion_oxigeno NUMERIC(5,2) NULL,
      presion_sistolica INTEGER NULL,
      presion_diastolica INTEGER NULL,
      hgt_glucosa_mg_dl NUMERIC(6,2) NULL,
      observaciones TEXT NULL
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS administraciones_medicamentos (
      id SERIAL PRIMARY KEY,
      registro_cam_id INTEGER NULL REFERENCES registros_cam(id) ON DELETE CASCADE,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      fecha_hora TIMESTAMP NOT NULL,
      nombre_medicamento TEXT NOT NULL,
      suministrado_por TEXT NULL,
      observaciones TEXT NULL
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS registros_profesionales (
      id SERIAL PRIMARY KEY,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      rol_profesional TEXT NOT NULL,
      fecha_hora TIMESTAMP NOT NULL,
      evolucion TEXT NULL,
      datos_json JSONB NULL,
      editable_hasta TIMESTAMP NULL
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS registros_nutricion (
      id SERIAL PRIMARY KEY,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      fecha_hora TIMESTAMP NOT NULL,
      peso_kg NUMERIC(7,2) NULL,
      talla_m NUMERIC(4,2) NULL,
      imc NUMERIC(5,2) NULL,
      observaciones TEXT NULL,
      datos_json JSONB NULL,
      editable_hasta TIMESTAMP NULL
    )`);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS controles_peso (
      id SERIAL PRIMARY KEY,
      residente_id INTEGER NOT NULL REFERENCES residentes(id),
      usuario_id INTEGER NULL REFERENCES usuarios(id),
      fecha_control DATE NOT NULL,
      peso_kg NUMERIC(7,2) NULL,
      regimen_indicado TEXT NULL,
      origen TEXT NULL
    )`);
}

async function seedPostgresResidents() {
  await pool.execute(
    `INSERT INTO usuarios (nombre, email, password_hash, activo, ventana_edicion_horas)
     VALUES
       ('administracion', 'administracion@hogarantu.cl', NULL, true, 16),
       ('cuidadoras', 'cuidadoras@hogarantu.cl', NULL, true, 16),
       ('dt', 'dt@hogarantu.cl', NULL, true, 16),
       ('enfermero', 'enfermero@hogarantu.cl', NULL, true, 16),
       ('nutricion', 'nutricion@hogarantu.cl', NULL, true, 16)
     ON CONFLICT (email) DO NOTHING`
  );

  for (const row of seedResidents) {
    await pool.execute(
      `INSERT INTO residentes
         (id, nombre_completo, rut, edad_texto, sexo, fecha_ingreso, peso_inicial_kg, patologias_ingreso, servicio_urgencia, estado)
       VALUES
         (:id, :nombre, :rut, :edad, :sexo, :ingreso, :peso, :patologias, :urgencia, :estado)
       ON CONFLICT (rut) DO NOTHING`,
      {
        id: row[0],
        nombre: row[1],
        rut: row[2],
        edad: row[3],
        sexo: row[4],
        ingreso: row[5],
        peso: row[6],
        patologias: row[7],
        urgencia: row[8],
        estado: row[9]
      }
    );
    await pool.execute(
      `INSERT INTO apoderados
         (residente_id, nombre, telefono, email, contacto_sos_nombre, contacto_sos_telefono, es_contacto_principal)
       VALUES
         (:residenteId, :nombre, :telefono, :email, :contactoNombre, :contactoTelefono, true)
       ON CONFLICT DO NOTHING`,
      {
        residenteId: row[0],
        nombre: row[10],
        telefono: row[11],
        email: row[12],
        contactoNombre: row[13],
        contactoTelefono: row[14]
      }
    );
  }

  await pool.execute("SELECT setval(pg_get_serial_sequence('residentes', 'id'), COALESCE((SELECT MAX(id) FROM residentes), 1), true)");
}
