const state = {
  isAuthenticated: false,
  loggedUser: null,
  role: "administrador",
  view: "dashboard",
  residentId: 1,
  dashboardTab: "evolucion",
  pdfResidentId: 1,
  pdfPeriodDays: null,
  pdfEmail: "",
  pdfGenerated: false,
  pdfGeneratedResidentId: null,
  pdfGeneratedDays: null,
  powerBiDays: null,
  closedAlertKeys: [],
  closedAlerts: [],
  alertExportFrom: "2026-06-01",
  alertExportTo: "2026-06-15",
  registrosPage: 1,
  registrosExportMode: "all",
  registrosExportFrom: "2026-06-01",
  registrosExportTo: "2026-06-15",
  editReturnView: "registros"
};

const $ = (id) => document.getElementById(id);
const DEMO_PASSWORD = "antu2026";
const DEMO_USERS = [
  { email: "administracion@hogarantu.cl", role: "administrador" },
  { email: "administracion_respaldo@hogarantu.cl", role: "administrador_respaldo" },
  { email: "cuidadoras@hogarantu.cl", role: "cam" },
  { email: "dt@hogarantu.cl", role: "directora" },
  { email: "enfermero@hogarantu.cl", role: "enfermero" },
  { email: "nutricion@hogarantu.cl", role: "nutricionista" }
];
const API_BASE_URL = window.ANTU_API_BASE_URL || "https://gestion-residentes-antu-production-827b.up.railway.app/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }
  return data;
}

function replaceResidentsFromApi(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  RESIDENTES.splice(0, RESIDENTES.length, ...rows.map(normalizeApiResident));
  if (!RESIDENTES.some((resident) => resident.id === state.residentId)) {
    state.residentId = RESIDENTES[0]?.id || 1;
  }
}

function normalizeApiResident(row) {
  return {
    id: Number(row.id),
    nombre: row.nombre || row.nombre_completo || "",
    rut: row.rut || "",
    edad: row.edad || row.edad_texto || "",
    sexo: row.sexo || "No informado",
    ingreso: formatApiDate(row.ingreso || row.fecha_ingreso),
    peso: formatPeso(row.peso || row.peso_inicial_kg),
    patologias: row.patologias || row.patologias_ingreso || "",
    apoderado: row.apoderado || row.apoderado_nombre || "",
    mail: row.mail || row.apoderado_email || "",
    telefonoApoderado: row.telefonoApoderado || row.apoderado_telefono || "",
    telefonoSos: row.telefonoSos || row.contacto_sos_telefono || "",
    contactoSos: row.contactoSos || row.contacto_sos_nombre || "",
    urgencia: row.urgencia || row.servicio_urgencia || "SAMU",
    estado: row.estado || "Activo"
  };
}

function formatApiDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatPeso(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = formatDecimalText(value);
  return /kg/i.test(text) ? text : `${text} kg`;
}

function parsePesoNumber(value) {
  const match = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function residentToApiPayload(payload) {
  return {
    nombre_completo: payload.nombre,
    rut: payload.rut,
    edad_texto: payload.edad,
    sexo: payload.sexo,
    fecha_ingreso: payload.ingreso || null,
    peso_inicial_kg: parsePesoNumber(payload.peso),
    patologias_ingreso: payload.patologias,
    servicio_urgencia: payload.urgencia,
    estado: payload.estado,
    apoderado_nombre: payload.apoderado,
    apoderado_email: payload.mail,
    apoderado_telefono: payload.telefonoApoderado,
    contacto_sos_nombre: payload.contactoSos,
    contacto_sos_telefono: payload.telefonoSos
  };
}

async function loadResidentsFromApi() {
  try {
    const rows = await apiRequest("/residentes");
    replaceResidentsFromApi(rows);
  } catch (error) {
    console.warn("No se pudieron cargar residentes desde la API. Se usaran datos locales.", error);
  }
}

function init() {
  renderRoleSelect();
  $("loginForm").addEventListener("submit", handleLogin);
  $("roleSelect").addEventListener("change", (event) => {
    state.role = event.target.value;
    state.view = ROLES[state.role].menu[0][0];
    renderShell();
  });
  $("modalCancel").addEventListener("click", closeModal);
  $("logoutBtn").addEventListener("click", logout);
  renderAuthState();
}

function renderRoleSelect() {
  $("roleSelect").innerHTML = Object.entries(ROLES)
    .map(([key, role]) => `<option value="${key}">${role.label}</option>`)
    .join("");
  $("roleSelect").value = state.role;
  $("roleSelect").disabled = true;
}

function renderShell() {
  if (!state.isAuthenticated) return;
  const role = ROLES[state.role];
  document.body.classList.toggle("admin-left-menu", state.role === "administrador" || state.role === "administrador_respaldo");
  $("roleBadge").innerHTML = `<strong>${role.label}</strong><span>${role.user}</span>`;
  $("menu").innerHTML = role.menu
    .map(([id, label]) => `<button class="${state.view === id ? "active" : ""}" data-view="${id}">${label}</button>`)
    .join("");
  $("menu").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderShell();
    });
  });
  renderView();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value.trim();
  const user = DEMO_USERS.find((item) => item.email === email);
  if (!user || password !== DEMO_PASSWORD) {
    $("loginError").textContent = "Usuario o contrasena incorrecta. Para la maqueta use clave demo: antu2026.";
    return;
  }
  state.isAuthenticated = true;
  state.loggedUser = user.email;
  state.role = user.role;
  resetSessionState();
  $("loginError").textContent = "";
  renderRoleSelect();
  await loadResidentsFromApi();
  renderAuthState();
}

function renderAuthState() {
  document.body.classList.toggle("authenticated", state.isAuthenticated);
  document.body.classList.toggle("logged-out", !state.isAuthenticated);
  if (state.isAuthenticated) {
    renderShell();
    return;
  }
  document.body.classList.remove("admin-left-menu");
  $("loginPassword").value = "";
  setTimeout(() => $("loginEmail").focus(), 0);
}

function resetSessionState() {
  state.view = ROLES[state.role].menu[0][0];
  state.residentId = 1;
  state.dashboardTab = "evolucion";
  state.pdfResidentId = 1;
  state.pdfPeriodDays = null;
  state.pdfEmail = "";
  state.pdfGenerated = false;
  state.pdfGeneratedResidentId = null;
  state.pdfGeneratedDays = null;
  state.powerBiDays = null;
  state.closedAlertKeys = [];
  state.closedAlerts = [];
  state.alertExportFrom = "2026-06-01";
  state.alertExportTo = "2026-06-15";
  state.registrosPage = 1;
  state.registrosExportMode = "all";
  state.registrosExportFrom = "2026-06-01";
  state.registrosExportTo = "2026-06-15";
  state.editReturnView = "registros";
}

function logout() {
  state.role = "administrador";
  state.isAuthenticated = false;
  state.loggedUser = null;
  resetSessionState();
  renderRoleSelect();
  $("loginError").textContent = "Sesion cerrada.";
  renderAuthState();
}

function renderView() {
  const view = $("view");
  const map = {
    dashboard: renderAdminDashboard,
    inicio: renderInicio,
    residentes: renderResidentes,
    bdresidentes: renderBaseDatosResidentes,
    formularios: renderFormulariosAdmin,
    registros: renderRegistrosUsuarios,
    alertas: renderAlertas,
    rangos: renderRangos,
    usuarios: renderUsuarios,
    pdf: renderPdf,
    powerbi: renderPowerBi,
    formularioCam: renderFormularioCam,
    misRegistrosCam: renderMisRegistrosCam,
    formularioDt: () => renderFormularioProfesional("Directora Tecnica"),
    formularioEnfermero: () => renderFormularioProfesional("Enfermero"),
    dashboardResidente: renderDashboardResidente,
    misRegistrosProfesional: renderMisRegistrosProfesional,
    formularioNutri: renderFormularioNutri,
    misRegistrosNutri: renderMisRegistrosNutri
  };
  view.innerHTML = "";
  (map[state.view] || renderInicio)(view);
}

function page(title, text, action = "") {
  return `
    <div class="page-title">
      <div>
        <h1>${title}</h1>
        <p>${text}</p>
      </div>
      ${action}
    </div>
  `;
}

function metrics(items) {
  return `<div class="metrics">${items.map((item) => `
    <div class="metric"><strong>${item.value}</strong><span>${item.label}</span></div>
  `).join("")}</div>`;
}

function renderAdminDashboard(view) {
  const resident = selectedResident();
  view.innerHTML = page("Dashboard administrador", "Vista general del hogar, residentes activos, alertas y actividad de usuarios.") +
    metrics([
      { value: `${RESIDENTES.length}/18`, label: "Residentes activos" },
      { value: alertasAbiertas().length, label: "Alertas abiertas" },
      { value: "7", label: "Usuarios iniciales" },
      { value: "4", label: "Formularios operativos" }
    ]) +
    residentSearchPanel() +
    residentProfile(resident) +
    dashboardTabs(resident);
  attachResidentSearch();
  attachDashboardTabs();
}

function renderInicio(view) {
  const role = ROLES[state.role];
  const isCam = state.role === "cam";
  const isNutri = state.role === "nutricionista";
  view.innerHTML = page(`Panel ${role.label}`, "Pantalla inicial respetando los accesos definidos en el prototipo del usuario.") +
    metrics([
      { value: `${RESIDENTES.length}/18`, label: "Residentes activos" },
      { value: isCam || isNutri ? "16 h" : alertasAbiertas().length, label: isCam || isNutri ? "Edicion permitida" : "Alertas visibles" },
      { value: isNutri ? REGISTROS_NUTRI.length : isCam ? REGISTROS_CAM.length : REGISTROS_PRO.length, label: "Mis registros" },
      { value: "Activo", label: "Estado sesion" }
    ]) +
    `<div class="card">
      <h2>Accesos rapidos</h2>
      <div class="toolbar">
        ${quickActions()}
      </div>
    </div>`;
}

function quickActions() {
  if (state.role === "cam") {
    return `<button class="btn primary" onclick="go('formularioCam')">Ingresar registro CAM</button>
      <button class="btn secondary" onclick="go('misRegistrosCam')">Ver mis registros</button>`;
  }
  if (state.role === "directora") {
    return `<button class="btn primary" onclick="go('formularioDt')">Ingresar evolucion DT</button>
      <button class="btn secondary" onclick="go('dashboardResidente')">Buscar residente</button>`;
  }
  if (state.role === "enfermero") {
    return `<button class="btn primary" onclick="go('formularioEnfermero')">Ingresar evolucion Enfermero</button>
      <button class="btn secondary" onclick="go('dashboardResidente')">Buscar residente</button>`;
  }
  return `<button class="btn primary" onclick="go('formularioNutri')">Ingresar registro nutricional</button>
    <button class="btn secondary" onclick="go('residentes')">Buscar residente</button>`;
}

function renderResidentes(view) {
  view.innerHTML = page("Residentes", "Busqueda y ficha resumida del residente seleccionado.") +
    residentToolbar() +
    residentProfile(selectedResident()) +
    residentsTable(false);
  attachResidentButtons();
}

function renderBaseDatosResidentes(view) {
  view.innerHTML = page("Base datos residentes", "Vista administrativa para revisar datos maestros importados desde Excel.",
    `<button class="btn primary" onclick="startResidentCreate()">Agregar residente</button>`) +
    residentsTable(true);
  attachResidentButtons();
}

function residentToolbar() {
  return `<div class="toolbar">
    ${RESIDENTES.map((r) => `<button class="btn secondary resident-picker ${r.id === state.residentId ? "selected" : ""}" data-id="${r.id}">${r.nombre}</button>`).join("")}
  </div>`;
}

function residentSearchPanel() {
  const resident = selectedResident();
  return `<div class="card">
    <h2>Buscar residente</h2>
    <div class="grid3">
      <div>
        <label>Nombre o RUT</label>
        <input id="residentSearchInput" list="residentSearchOptions" value="${resident.nombre}" placeholder="Escriba para buscar residente">
        <datalist id="residentSearchOptions">
          ${RESIDENTES.map((r) => `<option value="${r.nombre}">${r.rut}</option>`).join("")}
          ${RESIDENTES.map((r) => `<option value="${r.rut}">${r.nombre}</option>`).join("")}
        </datalist>
      </div>
      <div>
        <label>Residente activo</label>
        <input value="${resident.nombre}" readonly>
      </div>
      <div class="form-actions">
        <button class="btn primary" id="acceptResidentSearch">Aceptar</button>
      </div>
    </div>
    <div class="notice">Al aceptar se actualizan la ficha, bitacora ejecutiva de los ultimos 7 dias, alertas y graficas del residente seleccionado.</div>
  </div>`;
}

function selectedResident() {
  return RESIDENTES.find((r) => r.id === state.residentId) || RESIDENTES[0];
}

function residentProfile(r) {
  const sexClass = r.sexo === "Femenino" ? "femenino" : "masculino";
  return `<div class="card profile ${sexClass}">
    <h2>Ficha resumida <span class="badge">${r.estado}</span></h2>
    <div class="grid3">
      ${field("Nombre", r.nombre)}
      ${field("RUT", r.rut)}
      ${field("Edad", r.edad)}
      ${field("Sexo", r.sexo)}
      ${field("Fecha ingreso", r.ingreso)}
      ${field("Peso inicial", r.peso)}
      ${field("Patologias ingreso", r.patologias)}
      ${field("Apoderado", r.apoderado)}
      ${field("Mail apoderado", r.mail)}
      ${field("Telefono apoderado", r.telefonoApoderado)}
      ${field("Contacto SOS", r.contactoSos)}
      ${field("Servicio urgencia", r.urgencia)}
    </div>
  </div>`;
}

function field(label, value) {
  return `<div class="field"><small>${label}</small><b>${formatFieldValue(label, value)}</b></div>`;
}

function formatFieldValue(label, value) {
  if (/peso|imc/i.test(String(label || ""))) return formatDecimalText(value);
  return value;
}

function formatDecimalText(value) {
  return String(value ?? "").replace(/(\d+)\.(\d+)/g, "$1,$2");
}

function parseDecimalValue(value) {
  return Number(String(value || "").replace(",", "."));
}

function hasDecimalPoint(value) {
  return /\d+\.\d+/.test(String(value || ""));
}

function bindDecimalCommaValidation(ids) {
  ids.forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.setAttribute("inputmode", "decimal");
    input.addEventListener("change", () => {
      if (hasDecimalPoint(input.value)) {
        openModal("Separador decimal", "El separador decimal es la coma. Ejemplo: 36,8.");
      }
    });
  });
}

function validateDecimalCommaFields(fields) {
  const invalid = fields.filter(({ id }) => {
    const input = $(id);
    return input && hasDecimalPoint(input.value);
  });
  if (!invalid.length) return "";
  return `El separador decimal es la coma. Corrija: ${invalid.map((field) => field.label).join(", ")}.`;
}

function residentsTable(admin) {
  return `<div class="card">
    <h2>${admin ? "Tabla maestra" : "Listado de residentes activos"}</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>RUT</th><th>Sexo</th><th>Edad</th><th>Estado</th><th>Apoderado</th>${admin ? "<th>Accion</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${RESIDENTES.map((r) => `<tr>
            <td>${r.nombre}</td><td>${r.rut}</td><td>${r.sexo}</td><td>${r.edad}</td>
            <td><span class="badge green">${r.estado}</span></td><td>${r.apoderado}</td>
            ${admin ? `<td><div class="action-stack compact-actions">
              <button class="btn ghost resident-view" data-id="${r.id}">Ver</button>
              <button class="btn secondary resident-edit" data-id="${r.id}">Editar</button>
            </div></td>` : ""}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>`;
}

function attachResidentButtons() {
  document.querySelectorAll(".resident-picker").forEach((button) => {
    button.addEventListener("click", () => {
      state.residentId = Number(button.dataset.id);
      renderView();
    });
  });
  document.querySelectorAll(".resident-edit").forEach((button) => {
    button.addEventListener("click", () => startResidentEdit(Number(button.dataset.id)));
  });
  document.querySelectorAll(".resident-view").forEach((button) => {
    button.addEventListener("click", () => startResidentView(Number(button.dataset.id)));
  });
}

function startResidentCreate() {
  renderResidentForm(null);
}

function startResidentView(id) {
  const resident = RESIDENTES.find((r) => r.id === id);
  renderResidentForm(resident, true);
}

function startResidentEdit(id) {
  const resident = RESIDENTES.find((r) => r.id === id);
  renderResidentForm(resident);
}

function renderResidentForm(resident, readonly = false) {
  const isEdit = Boolean(resident);
  const title = readonly ? "Ver residente" : isEdit ? "Editar residente" : "Agregar residente";
  const subtitle = readonly ? "Ficha de solo lectura del residente seleccionado." : "Complete la ficha del residente. Antes de guardar se solicitara confirmacion.";
  $("view").innerHTML = page(title, subtitle, `<button class="btn ghost" onclick="go('bdresidentes')">Volver al listado</button>`) +
    `<div class="form-section">
      <h2>Ficha residente</h2>
      <div class="grid3">
        <div><label>Nombre completo</label><input id="resNombre" value="${resident?.nombre || ""}"></div>
        <div><label>RUT</label><input id="resRut" value="${resident?.rut || ""}"></div>
        <div><label>Edad</label><input id="resEdad" value="${resident?.edad || ""}"></div>
        <div><label>Sexo</label><select id="resSexo"><option ${resident?.sexo === "Femenino" ? "selected" : ""}>Femenino</option><option ${resident?.sexo === "Masculino" ? "selected" : ""}>Masculino</option></select></div>
        <div><label>Fecha ingreso</label><input id="resIngreso" type="date" value="${resident?.ingreso || ""}"></div>
        <div><label>Peso inicial</label><input id="resPeso" value="${resident ? formatDecimalText(resident.peso) : ""}" placeholder="Ej: 56,6"></div>
        <div><label>Apoderado</label><input id="resApoderado" value="${resident?.apoderado || ""}"></div>
        <div><label>Mail apoderado</label><input id="resMail" type="email" value="${resident?.mail || ""}"></div>
        <div><label>Telefono apoderado</label><input id="resTelefono" value="${resident?.telefonoApoderado || ""}"></div>
        <div><label>Contacto SOS</label><input id="resContactoSos" value="${resident?.contactoSos || ""}"></div>
        <div><label>Telefono SOS</label><input id="resTelefonoSos" value="${resident?.telefonoSos || ""}"></div>
        <div><label>Servicio urgencia</label><input id="resUrgencia" value="${resident?.urgencia || "SAMU"}"></div>
        <div><label>Estado</label><select id="resEstado">
          ${["Activo", "Inactivo", "Egresado", "Fallecido"].map((estado) => `<option ${resident?.estado === estado ? "selected" : ""}>${estado}</option>`).join("")}
        </select></div>
      </div>
      <label>Patologias de ingreso</label>
      <textarea id="resPatologias">${resident?.patologias || ""}</textarea>
      <div class="form-actions">
        ${readonly ? "" : `<button class="btn primary" onclick="saveResidentDraft(${resident?.id || "null"})">${isEdit ? "Guardar cambios" : "Crear residente"}</button>`}
        <button class="btn ghost" onclick="go('bdresidentes')">${readonly ? "Volver" : "Cancelar"}</button>
      </div>
    </div>`;
  bindDecimalCommaValidation(["resPeso"]);
  if (readonly) lockForm($("view"));
}

function saveResidentDraft(id) {
  const nombre = $("resNombre").value.trim();
  if (!nombre) {
    openModal("Ficha residente", "Debe ingresar el nombre completo del residente.");
    return;
  }
  const decimalError = validateDecimalCommaFields([{ id: "resPeso", label: "peso inicial" }]);
  if (decimalError) {
    openModal("Separador decimal", decimalError);
    return;
  }
  const payload = {
    nombre,
    rut: $("resRut").value.trim(),
    edad: $("resEdad").value.trim(),
    sexo: $("resSexo").value,
    ingreso: $("resIngreso").value,
    peso: $("resPeso").value.trim(),
    patologias: $("resPatologias").value.trim(),
    apoderado: $("resApoderado").value.trim(),
    mail: $("resMail").value.trim(),
    telefonoApoderado: $("resTelefono").value.trim(),
    telefonoSos: $("resTelefonoSos").value.trim(),
    contactoSos: $("resContactoSos").value.trim(),
    urgencia: $("resUrgencia").value.trim(),
    estado: $("resEstado").value
  };
  openModal("Confirmar ficha residente", id ? "Desea guardar los cambios de este residente?" : "Desea crear este nuevo residente?", () => persistResidentDraft(id, payload));
}

async function persistResidentDraft(id, payload) {
  try {
    const saved = await apiRequest(id ? `/residentes/${id}` : "/residentes", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(residentToApiPayload(payload))
    });
    const normalized = normalizeApiResident(saved);
    const existingIndex = RESIDENTES.findIndex((resident) => resident.id === normalized.id);
    if (existingIndex >= 0) {
      RESIDENTES.splice(existingIndex, 1, normalized);
    } else {
      RESIDENTES.push(normalized);
    }
    state.residentId = normalized.id;
    state.view = "bdresidentes";
    renderShell();
  } catch (error) {
    openModal("No se pudo guardar", `El residente no fue guardado en la base de datos. Detalle: ${error.message}`);
  }
}

function attachResidentSearch() {
  const input = $("residentSearchInput");
  const button = $("acceptResidentSearch");
  if (!input || !button) return;
  const accept = () => {
    const query = normalizeSearch(input.value);
    const exact = RESIDENTES.find((r) => normalizeSearch(r.nombre) === query || normalizeSearch(r.rut) === query);
    const partial = RESIDENTES.find((r) => normalizeSearch(r.nombre).includes(query) || normalizeSearch(r.rut).includes(query));
    const resident = exact || partial;
    if (!resident) {
      openModal("Residente no encontrado", "Escriba parte del nombre o seleccione una opcion sugerida antes de aceptar.");
      return;
    }
    state.residentId = resident.id;
    renderView();
  };
  button.addEventListener("click", accept);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") accept();
  });
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderFormularioCam(view, editContext = null) {
  const isEdit = Boolean(editContext);
  const isReadOnly = Boolean(editContext?.readonly);
  view.dataset.readonly = isReadOnly ? "true" : "false";
  const title = isReadOnly ? "Ver registro CAM" : isEdit ? "Editar registro CAM" : "Registro CAM";
  const subtitle = isReadOnly ? "Vista de solo lectura del registro ingresado." : isEdit ? "Formulario completo precargado para corregir el registro seleccionado." : "Formulario modular: control de ciclos, medicamentos y observaciones segun corresponda.";
  view.innerHTML = page(title, subtitle, adminFormBackButton()) +
    `<div class="notice">Habilite solo las secciones que aplican. Antes de guardar se solicita confirmacion.</div>
    <div class="form-section">
      <h2>Datos base</h2>
      <div class="grid3">
        <div><label>Usuario de acceso</label><input value="cuidadoras@hogarantu.cl" readonly></div>
        <div><label>Nombre y apellido cuidadora *</label><input id="camCuidadora" required placeholder="Ej: Maria Gonzalez Soto"></div>
        <div><label>Turno</label><select id="camTurno"><option>Dia</option><option>Noche</option></select></div>
        <div><label>Fecha *</label><input id="camFecha" required type="date"></div>
        <div><label>Hora *</label><input id="camHora" required type="time"></div>
        <div><label>Residente *</label>${residentSelect("camResidente")}</div>
      </div>
    </div>
    <div class="form-section">
      <h2>Diuresis / Deposición</h2>
      <div class="grid2">
        <div><label>Diuresis (orina)</label><select id="camDiuresisResultado"><option>Si</option><option>No</option></select></div>
        <div><label>Deposición (heces fecales)</label><select id="camDeposicionResultado"><option>Si</option><option>No</option></select></div>
      </div>
    </div>
    ${toggle("chkCiclos", "Registrar control de ciclos")}
    <div id="secCiclos" class="form-section hidden">
      <h2>Control de ciclos</h2>
      <div class="grid3">
        <div><label>Temperatura C</label><input id="camTemp" inputmode="decimal" placeholder="36,8"></div>
        <div><label>Saturación %</label><input id="camSpo2" type="number" min="0" max="100" step="1" placeholder="96"></div>
        <div><label>Presión arterial mmHg</label>${pressureInputs("camPa")}</div>
        <div><label>HGT / Glucosa mg/dL</label><input id="camHgt" type="number" min="20" max="1000" step="1" placeholder="110"></div>
      </div>
      ${isReadOnly ? "" : `<div class="form-actions compact-actions">
        <button class="btn ghost" type="button" onclick="clearCamCycles()">Limpiar datos</button>
      </div>`}
    </div>
    ${toggle("chkMed", "Administracion de medicamentos")}
    <div id="secMed" class="form-section hidden">
      <h2>Administracion de medicamentos</h2>
      <div class="grid2">
        <div><label>Hora administracion</label><input id="camHoraMed" type="time"></div>
        <div><label>Nombre medicamento</label><input id="camMed" placeholder="Ej: Losartan 50 mg"></div>
      </div>
    </div>
    ${toggle("chkPosicion", "Cambio de Posición")}
    <div id="secPosicion" class="form-section hidden">
      <h2>Cambio de Posición</h2>
      <div class="grid2 position-layout">
        <div>
          <label>Posición registrada</label>
          <select id="camPosicion">
            <option>Decúbito supino (boca arriba)</option>
            <option>Decúbito lateral derecho</option>
            <option>Decúbito lateral izquierdo</option>
          </select>
          <label>Hora del cambio de posición</label>
          <input id="camHoraPosicion" type="time">
        </div>
        <div class="position-reference">
          <img src="./assets/cambios-posicion.png" alt="Referencia de cambios de posición">
        </div>
      </div>
    </div>
    ${toggle("chkMudas", "Mudas")}
    <div id="secMudas" class="form-section hidden">
      <h2>Mudas</h2>
      <div class="grid2">
        <div>
          <label>¿Se realizó muda?</label>
          <select id="camMuda">
            <option>Si</option>
            <option>No</option>
          </select>
        </div>
        <div><label>Hora de la muda</label><input id="camHoraMuda" type="time"></div>
      </div>
      <div id="camMudaMotivoWrap" class="hidden">
        <label>Motivo por el cual no se realizó muda</label>
        <textarea id="camMudaMotivo" placeholder="Ej: no aplica, residente autovalente, no requiere cambio de muda"></textarea>
      </div>
    </div>
    ${toggle("chkObs", "Agregar observaciones")}
    <div id="secObs" class="form-section hidden">
      <h2>Observaciones</h2>
      <label>Detalle</label>
      <textarea id="camObs" placeholder="Cambios conductuales, orina de mal olor, salidas, accidentes o urgencias medicas"></textarea>
    </div>
    ${isReadOnly ? "" : `<button class="btn primary" onclick="confirmCam(${isEdit ? editContext.index : "null"})">${isEdit ? "Guardar cambios" : "Guardar registro"}</button>`}
    ${isEdit ? `<button class="btn ghost" onclick="go('${editContext.returnView}')">${isReadOnly ? "Volver" : "Cancelar"}</button>` : ""}`;
  bindToggles();
  bindCamDateRules();
  bindMudaReason();
  bindDecimalCommaValidation(["camTemp"]);
  if (editContext) hydrateCamForm(editContext.row);
  if (isReadOnly) lockForm(view);
}

function toggle(id, label) {
  const details = {
    chkCiclos: "Temperatura, saturación, presión y HGT.",
    chkMed: "Hora de administración y remedio suministrado.",
    chkPosicion: "Decúbito supino o laterales con horario.",
    chkMudas: "Registro Si/No y horario de muda.",
    chkObs: "Comentarios adicionales del cuidado.",
    chkProCiclos: "Temperatura, saturación, presión y HGT.",
    chkProMed: "Hora de administración y remedio suministrado.",
    chkProPosicion: "Decúbito supino o laterales con horario.",
    chkProMudas: "Registro Si/No y horario de muda.",
    chkProObs: "Comentarios adicionales del cuidado."
  };
  return `<label class="toggle-card" for="${id}">
    <input type="checkbox" id="${id}">
    <span class="toggle-card-main">
      <strong>${label}</strong>
      <small>${details[id] || "Haga clic para desplegar el formulario."}</small>
      <span class="toggle-card-summary" id="${id}Summary"></span>
    </span>
    <span class="toggle-card-mark" aria-hidden="true">+</span>
  </label>`;
}

function bindToggles() {
  [["chkCiclos", "secCiclos"], ["chkMed", "secMed"], ["chkPosicion", "secPosicion"], ["chkMudas", "secMudas"], ["chkObs", "secObs"]].forEach(([chk, sec]) => {
    const checkbox = $(chk);
    const section = $(sec);
    if (checkbox && section) {
      const card = checkbox.closest(".toggle-card");
      const mark = card?.querySelector(".toggle-card-mark");
      const updateToggle = () => {
        section.classList.toggle("hidden", !checkbox.checked);
        card?.classList.toggle("active", checkbox.checked);
        if (mark) mark.textContent = checkbox.checked ? "✓" : "+";
        if (checkbox.checked && chk === "chkPosicion" && $("camHoraPosicion") && !$("camHoraPosicion").value) {
          $("camHoraPosicion").value = $("camHora")?.value || "";
        }
        if (checkbox.checked && chk === "chkMudas" && $("camHoraMuda") && !$("camHoraMuda").value) {
          $("camHoraMuda").value = $("camHora")?.value || "";
        }
        updateCamToggleSummaries();
      };
      checkbox.addEventListener("change", updateToggle);
      updateToggle();
    }
  });
  bindCamSummaryInputs();
  updateCamToggleSummaries();
}

function bindMudaReason() {
  const select = $("camMuda");
  const wrap = $("camMudaMotivoWrap");
  if (!select || !wrap) return;
  const update = () => {
    wrap.classList.toggle("hidden", select.value !== "No");
    updateCamToggleSummaries();
  };
  select.addEventListener("change", update);
  update();
}

function hydrateCamForm(row) {
  const [fecha = todayIso(), hora = currentTimeInput()] = String(row.fecha || "").split(" ");
  const resident = RESIDENTES.find((item) => item.nombre === row.residente) || RESIDENTES[0];
  const cycles = extractCamCycleFormValues(row);
  const med = extractMedicationFormValues(row);
  const posicion = extractPositionFormValues(row);
  const muda = extractMudaFormValues(row);
  const obs = extractCamObservationValue(row);

  setValue("camCuidadora", row.cuidadora || "");
  setValue("camTurno", row.turno || "Dia");
  setValue("camFecha", fecha);
  setValue("camHora", hora || "");
  setValue("camResidente", resident.id);
  setValue("camDiuresisResultado", row.diuresisResultado || inferDespicheResultado(row.detalle, "Diuresis", row));
  setValue("camDeposicionResultado", row.deposicionResultado || inferDespicheResultado(row.detalle, "Deposición", row));

  if (cycles.hasData) {
    setToggleChecked("chkCiclos", true);
    setValue("camTemp", cycles.temp);
    setValue("camSpo2", cycles.spo2);
    setPressureValue("camPa", cycles.pa);
    setValue("camHgt", cycles.hgt);
  }
  if (med.hasData) {
    setToggleChecked("chkMed", true);
    setValue("camHoraMed", med.hora);
    setValue("camMed", med.nombre);
  }
  if (posicion.hasData) {
    setToggleChecked("chkPosicion", true);
    setValue("camPosicion", posicion.nombre);
    setValue("camHoraPosicion", posicion.hora);
  }
  if (muda.hasData) {
    setToggleChecked("chkMudas", true);
    setValue("camMuda", muda.resultado);
    setValue("camHoraMuda", muda.hora);
    setValue("camMudaMotivo", muda.motivo);
    bindMudaReason();
  }
  if (obs) {
    setToggleChecked("chkObs", true);
    setValue("camObs", obs);
  }
  updateCamToggleSummaries();
}

function setToggleChecked(id, checked) {
  const checkbox = $(id);
  if (!checkbox) return;
  checkbox.checked = checked;
  checkbox.dispatchEvent(new Event("change"));
}

function setValue(id, value) {
  const field = $(id);
  if (field) field.value = value ?? "";
}

function setPressureValue(prefix, value) {
  const pressure = parsePressure(value);
  setValue(`${prefix}Sistolica`, pressure.sistolica ?? "");
  setValue(`${prefix}Diastolica`, pressure.diastolica ?? "");
}

function pressureValue(prefix) {
  const sistolica = $(`${prefix}Sistolica`)?.value;
  const diastolica = $(`${prefix}Diastolica`)?.value;
  return sistolica && diastolica ? `${sistolica}/${diastolica}` : "";
}

function lockForm(root) {
  root.querySelectorAll(".form-section input, .form-section select, .form-section textarea, .toggle-card input").forEach((field) => {
    if (field.tagName === "SELECT" || field.type === "checkbox") {
      field.disabled = true;
    } else {
      field.readOnly = true;
    }
  });
}

function extractCamCycleFormValues(row) {
  const text = String(row.detalle || "");
  return {
    temp: row.cicloTemp || regexValue(text, /Temp\s+([\d,.]+)/i),
    spo2: row.cicloSpo2 || regexValue(text, /Sat\s+(\d+)/i),
    pa: row.cicloPa || regexValue(text, /PA\s+(\d+\/\d+)/i),
    hgt: row.cicloHgt || regexValue(text, /HGT\s+(\d+)/i),
    get hasData() {
      return Boolean(this.temp || this.spo2 || this.pa || this.hgt);
    }
  };
}

function extractMedicationFormValues(row) {
  const text = String(row.detalle || "");
  const nombre = row.medicamento || regexValue(text, /Medicamento\s+(.+?)\s+(?:administrado\s+)?a las\s+\d{2}:\d{2}/i);
  const hora = row.horaMedicamento || regexValue(text, /Medicamento\s+.+?\s+(?:administrado\s+)?a las\s+(\d{2}:\d{2})/i);
  return { nombre, hora, hasData: Boolean(nombre || hora) };
}

function extractPositionFormValues(row) {
  const text = String(row.detalle || "");
  const nombre = row.posicion || regexValue(text, /Cambio de posici[oó]n:\s*(.+?)\s+a las\s+\d{2}:\d{2}/i);
  const hora = row.horaPosicion || regexValue(text, /Cambio de posici[oó]n:\s*.+?\s+a las\s+(\d{2}:\d{2})/i);
  return { nombre, hora, hasData: Boolean(nombre || hora) };
}

function extractMudaFormValues(row) {
  const text = String(row.detalle || "");
  const resultado = row.mudaResultado || regexValue(text, /Mudas:\s*(Si|No)/i) || "Si";
  const hora = row.horaMuda || regexValue(text, /Mudas:\s*(?:Si|No)\s+a las\s+(\d{2}:\d{2})/i);
  const motivo = row.mudaMotivo || regexValue(text, /Motivo:\s*(.+?)(?:\.|$)/i);
  return { resultado: normalizeSiNo(resultado), hora, motivo, hasData: Boolean(row.mudaResultado || row.horaMuda || row.mudaMotivo || /Mudas:/i.test(text)) };
}

function extractCamObservationValue(row) {
  const text = String(row.detalle || "");
  if (row.observacionCam) return row.observacionCam;
  const prefixed = regexValue(text, /Observaci[oó]n:\s*(.+)$/i);
  if (prefixed) return prefixed.trim();
  if (!/Observaci[oó]n/i.test(String(row.tipo || ""))) return "";
  return text
    .replace(/Control registrado\.\s*Temp\s+[\d,.]+\s*C,\s*Sat\s+\d+%,\s*PA\s+\d+\/\d+,\s*HGT\s+\d+\.?\s*/i, "")
    .replace(/Diuresis:\s*(Si|No)\.?\s*/gi, "")
    .replace(/Deposici[oó]n:\s*(Si|No)\.?\s*/gi, "")
    .replace(/Medicamento\s+.+?\s+(?:administrado\s+)?a las\s+\d{2}:\d{2}\.?\s*/i, "")
    .replace(/Cambio de posici[oó]n:\s*.+?\s+a las\s+\d{2}:\d{2}\.?\s*/i, "")
    .replace(/Mudas:\s*(Si|No)\s+a las\s+\d{2}:\d{2}\.(?:\s*Motivo:\s*.+?\.)?\s*/i, "")
    .replace(/^Control registrado\.\s*/i, "")
    .trim();
}

function regexValue(text, pattern) {
  const match = String(text || "").match(pattern);
  return match ? String(match[1]).trim() : "";
}

function clearCamCycles() {
  if ($("view")?.dataset.readonly === "true") return;
  ["camTemp", "camSpo2", "camPaSistolica", "camPaDiastolica", "camHgt"].forEach((id) => {
    const input = $(id);
    if (input) input.value = "";
  });
  updateCamToggleSummaries();
}

function bindCamSummaryInputs() {
  [
    "camTemp", "camSpo2", "camPaSistolica", "camPaDiastolica", "camHgt",
    "camHoraMed", "camMed",
    "camPosicion", "camHoraPosicion",
    "camMuda", "camHoraMuda", "camMudaMotivo",
    "camObs"
  ].forEach((id) => {
    const field = $(id);
    if (!field || field.dataset.summaryBound) return;
    field.dataset.summaryBound = "true";
    field.addEventListener("input", updateCamToggleSummaries);
    field.addEventListener("change", updateCamToggleSummaries);
  });
}

function updateCamToggleSummaries() {
  const summaries = {
    chkCiclos: camCycleSummary(),
    chkMed: camMedicationSummary(),
    chkPosicion: camPositionSummary(),
    chkMudas: camMudaSummary(),
    chkObs: camObservationSummary()
  };
  Object.entries(summaries).forEach(([id, text]) => {
    const summary = $(`${id}Summary`);
    if (!summary) return;
    summary.textContent = text;
    summary.classList.toggle("hidden", !text);
  });
}

function camCycleSummary() {
  const pa = pressureValue("camPa");
  const values = [
    $("camTemp")?.value ? `Temp ${$("camTemp").value} C` : "",
    $("camSpo2")?.value ? `Sat ${$("camSpo2").value}%` : "",
    pa ? `PA ${pa}` : "",
    $("camHgt")?.value ? `HGT ${$("camHgt").value}` : ""
  ].filter(Boolean);
  return values.join(" · ");
}

function camMedicationSummary() {
  const med = $("camMed")?.value?.trim();
  const hora = $("camHoraMed")?.value;
  if (!med && !hora) return "";
  return [med ? `Medicamento: ${med}` : "", hora ? `Hora: ${hora}` : ""].filter(Boolean).join(" · ");
}

function camPositionSummary() {
  const posicion = $("camPosicion")?.value;
  const hora = $("camHoraPosicion")?.value;
  if (!$("chkPosicion")?.checked && !hora) return "";
  return [posicion || "", hora ? `Hora: ${hora}` : ""].filter(Boolean).join(" · ");
}

function camMudaSummary() {
  const muda = $("camMuda")?.value;
  const hora = $("camHoraMuda")?.value;
  const motivo = $("camMudaMotivo")?.value?.trim();
  if (!$("chkMudas")?.checked && !hora && !motivo) return "";
  return [`Muda: ${muda || "-"}`, hora ? `Hora: ${hora}` : "", motivo ? `Motivo: ${motivo}` : ""].filter(Boolean).join(" · ");
}

function camObservationSummary() {
  const obs = $("camObs")?.value?.trim();
  if (!obs) return "";
  return obs.length > 120 ? `${obs.slice(0, 117)}...` : obs;
}

function bindCamDateRules() {
  const turno = $("camTurno");
  const fecha = $("camFecha");
  const hora = $("camHora");
  if (!turno || !fecha || !hora) return;
  const apply = () => {
    const today = todayIso();
    const tomorrow = addDaysIso(new Date(), 1);
    if (turno.value === "Dia") {
      fecha.min = today;
      fecha.max = today;
      if (!fecha.value || fecha.value !== today) fecha.value = today;
      hora.removeAttribute("min");
      hora.removeAttribute("max");
      if (!hora.value) hora.value = currentTimeInput();
    } else {
      fecha.min = today;
      fecha.max = tomorrow;
      if (!fecha.value || fecha.value < today || fecha.value > tomorrow) fecha.value = today;
      hora.removeAttribute("min");
      hora.removeAttribute("max");
      if (!hora.value) hora.value = currentTimeInput();
    }
  };
  turno.addEventListener("change", apply);
  fecha.addEventListener("change", apply);
  fecha.addEventListener("change", () => {
    const error = validateCamDateTime();
    if (error) openModal("Fecha u hora no permitida", error);
  });
  apply();
}

function validateCamDateTime() {
  const turno = $("camTurno").value;
  const fecha = $("camFecha").value;
  const hora = $("camHora").value;
  const today = todayIso();
  const tomorrow = addDaysIso(new Date(), 1);
  if (!fecha || !hora) return "Debe seleccionar fecha y hora.";
  if (turno === "Dia") {
    if (fecha !== today) return "El turno dia solo permite registrar controles del dia actual.";
    return "";
  }
  if (fecha !== today && fecha !== tomorrow) return "El turno noche solo permite seleccionar hoy o manana.";
  return "";
}

function residentSelect(id) {
  return `<select id="${id}">${RESIDENTES.map((r) => `<option value="${r.id}">${r.nombre}</option>`).join("")}</select>`;
}

function pressureInputs(prefix) {
  return `<div class="pressure-inputs">
    <input id="${prefix}Sistolica" type="number" min="40" max="260" step="1" placeholder="125" aria-label="Presión sistólica">
    <span>/</span>
    <input id="${prefix}Diastolica" type="number" min="20" max="180" step="1" placeholder="80" aria-label="Presión diastólica">
  </div>
  <small class="field-help">Izquierda: presión sistólica. Derecha: presión diastólica.</small>`;
}

function confirmCam(editIndex = null) {
  const faltantes = [];
  const hasCycleData = camCyclesActive();
  const hasMedicationData = camMedicationActive();
  const hasPositionData = camPositionActive();
  const hasMudaData = camMudaActive();
  const hasObservationData = camObservationActive();
  if (!$("camCuidadora").value.trim()) faltantes.push("nombre de la cuidadora");
  if (!$("camFecha").value) faltantes.push("fecha");
  if (!$("camHora").value) faltantes.push("hora");
  if (!$("camResidente").value) faltantes.push("residente");
  if ($("chkCiclos").checked || hasCycleData) {
    if (!$("camTemp").value) faltantes.push("temperatura");
    if (!$("camSpo2").value) faltantes.push("saturacion");
    if (!pressureValue("camPa")) faltantes.push("presion arterial sistolica y diastolica");
    if (!$("camHgt").value) faltantes.push("HGT / glucosa");
  }
  if (hasMedicationData && !$("camMed").value.trim()) faltantes.push("nombre medicamento");
  if (hasPositionData && !$("camPosicion").value) faltantes.push("cambio de posicion");
  if (hasPositionData && !$("camHoraPosicion").value) faltantes.push("hora del cambio de posicion");
  if (hasMudaData && !$("camMuda").value) faltantes.push("mudas");
  if (hasMudaData && !$("camHoraMuda").value) faltantes.push("hora de muda");
  if (hasMudaData && $("camMuda").value === "No" && !$("camMudaMotivo").value.trim()) faltantes.push("motivo por el cual no se realizo muda");
  if (hasObservationData && !$("camObs").value.trim()) faltantes.push("detalle de observacion");
  if (faltantes.length) {
    openModal("Campos obligatorios", `Debe completar: ${faltantes.join(", ")}.`);
    return;
  }
  const decimalError = validateDecimalCommaFields([{ id: "camTemp", label: "temperatura" }]);
  if (decimalError) {
    openModal("Separador decimal", decimalError);
    return;
  }
  const vitalError = hasCycleData ? validateCycleNumbers({
    tempId: "camTemp",
    spo2Id: "camSpo2",
    pressurePrefix: "camPa",
    hgtId: "camHgt"
  }) : "";
  if (vitalError) {
    openModal("Valor no permitido", vitalError);
    return;
  }
  const dateError = editIndex === null ? validateCamDateTime() : "";
  if (dateError) {
    openModal("Fecha u hora no permitida", dateError);
    return;
  }
  const resident = RESIDENTES.find((r) => r.id === Number($("camResidente").value));
  openModal(editIndex === null ? "Confirmar registro CAM" : "Confirmar cambios CAM", editIndex === null ? `Esta seguro que desea agregar este registro al residente ${resident.nombre}?` : `Esta seguro que desea guardar los cambios del registro de ${resident.nombre}?`, () => {
    const registro = {
      fecha: `${$("camFecha").value} ${$("camHora").value}`,
      residente: resident.nombre,
      usuario: "cuidadoras@hogarantu.cl",
      turno: $("camTurno").value,
      cuidadora: $("camCuidadora").value.trim(),
      tipo: camTipo(),
      despicheTipo: "Diuresis / Deposición",
      despicheResultado: despicheHasNo({
        diuresisResultado: $("camDiuresisResultado").value,
        deposicionResultado: $("camDeposicionResultado").value
      }) ? "No" : "Si",
      diuresisResultado: $("camDiuresisResultado").value,
      deposicionResultado: $("camDeposicionResultado").value,
      cicloTemp: hasCycleData ? $("camTemp").value : "",
      cicloSpo2: hasCycleData ? $("camSpo2").value : "",
      cicloPa: hasCycleData ? pressureValue("camPa") : "",
      cicloHgt: hasCycleData ? $("camHgt").value : "",
      medicamento: hasMedicationData ? ($("camMed").value || "Medicamento sin nombre") : "",
      horaMedicamento: hasMedicationData ? ($("camHoraMed").value || "") : "",
      posicion: hasPositionData ? $("camPosicion").value : "",
      horaPosicion: hasPositionData ? $("camHoraPosicion").value : "",
      mudaResultado: hasMudaData ? $("camMuda").value : "",
      horaMuda: hasMudaData ? $("camHoraMuda").value : "",
      mudaMotivo: hasMudaData && $("camMuda").value === "No" ? $("camMudaMotivo").value.trim() : "",
      observacionCam: hasObservationData ? $("camObs").value.trim() : "",
      detalle: camDetalle(),
      editable: true
    };
    if (editIndex === null) {
      REGISTROS_CAM.unshift(registro);
    } else {
      REGISTROS_CAM[editIndex] = { ...REGISTROS_CAM[editIndex], ...registro };
    }
    state.view = editIndex === null ? "misRegistrosCam" : (state.editReturnView || "misRegistrosCam");
    renderShell();
  });
}

function camCyclesActive() {
  return ["camTemp", "camSpo2", "camPaSistolica", "camPaDiastolica", "camHgt"].some((id) => Boolean($(id)?.value));
}

function camMedicationActive() {
  return Boolean($("chkMed")?.checked || $("camMed")?.value?.trim() || $("camHoraMed")?.value);
}

function camPositionActive() {
  return Boolean($("chkPosicion")?.checked || $("camHoraPosicion")?.value);
}

function camMudaActive() {
  return Boolean($("chkMudas")?.checked || $("camHoraMuda")?.value || $("camMudaMotivo")?.value?.trim());
}

function camObservationActive() {
  return Boolean($("chkObs")?.checked || $("camObs")?.value?.trim());
}

function camTipo() {
  const parts = [];
  if ($("chkCiclos").checked || camCyclesActive()) parts.push("Control de ciclos");
  parts.push("Diuresis/Deposición");
  if (camMedicationActive()) parts.push("Medicamento");
  if (camPositionActive()) parts.push("Cambio de posición");
  if (camMudaActive()) parts.push("Mudas");
  if (camObservationActive()) parts.push("Observacion");
  return parts.length ? parts.join(" + ") : "Registro CAM";
}

function camDetalle() {
  const parts = [];
  if ($("chkCiclos").checked || camCyclesActive()) parts.push(`Control registrado. Temp ${$("camTemp").value || "-"} C, Sat ${$("camSpo2").value || "-"}%, PA ${pressureValue("camPa") || "-"}, HGT ${$("camHgt").value || "-"}.`);
  parts.push(`Diuresis: ${$("camDiuresisResultado").value}. Deposición: ${$("camDeposicionResultado").value}.`);
  if (camMedicationActive()) parts.push(`Medicamento ${$("camMed").value || "sin nombre"} a las ${$("camHoraMed").value || "--:--"}.`);
  if (camPositionActive()) parts.push(`Cambio de posición: ${$("camPosicion").value} a las ${$("camHoraPosicion").value || "--:--"}.`);
  if (camMudaActive()) {
    const motivo = $("camMuda").value === "No" ? ` Motivo: ${$("camMudaMotivo").value.trim()}.` : "";
    parts.push(`Mudas: ${$("camMuda").value} a las ${$("camHoraMuda").value || "--:--"}.${motivo}`);
  }
  if (camObservationActive()) parts.push($("camObs").value || "Sin detalle de observacion.");
  return parts.join(" ");
}

function renderMisRegistrosCam(view) {
  view.innerHTML = page("Mis registros CAM", "Los registros pueden editarse solo hasta 16 horas despues de su ingreso.") +
    registrosTable(REGISTROS_CAM, ["Fecha", "Residente", "Usuario", "Turno", "Cuidadora", "Detalle"], "cam", "misRegistrosCam");
}

function registrosTable(rows, headers, source = null, returnView = "registros") {
  const sortedRows = [...rows].sort((a, b) => {
    if (!a.fecha || !b.fecha) return 0;
    return parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha);
  });
  return `<div class="card table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}<th>Estado edicion</th><th>Accion</th></tr></thead>
    <tbody>${sortedRows.map((r) => `<tr>
      ${headers.map((h) => `<td>${valueForHeader(r, h)}</td>`).join("")}
      <td>${r.editable ? '<span class="badge green">Editable</span>' : '<span class="badge red">Bloqueado</span>'}</td>
      <td>${recordActionButtons(r, source, returnView)}</td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function recordActionButtons(row, source, returnView) {
  if (!source) return `<button class="btn ghost" disabled>Ver</button>`;
  const index = recordArray(source).indexOf(row);
  if (index < 0) return `<button class="btn ghost" disabled>Ver</button>`;
  return `<div class="action-stack">
    <button class="btn ghost" onclick="startRecordView('${source}', ${index}, '${returnView}')">Ver</button>
    ${row.editable ? `<button class="btn secondary" onclick="startRecordEdit('${source}', ${index}, '${returnView}', true)">Editar</button>` : `<button class="btn ghost" disabled>No editable</button>`}
  </div>`;
}

function valueForHeader(row, header) {
  const key = {
    Fecha: "fecha",
    Residente: "residente",
    Usuario: "usuario",
    Turno: "turno",
    Cuidadora: "cuidadora",
    Tipo: "tipo",
    Detalle: "detalle",
    Registro: "registro",
    Rol: "rol",
    IMC: "imc",
    Observacion: "observacion"
  }[header];
  const value = row[key] || "";
  if (header === "Tipo") return displayRegistroTipo(value);
  if (["Detalle", "Registro", "Observacion"].includes(header)) return recordChecklistDetail(row);
  return header === "IMC" ? formatDecimalText(value) : value;
}

function displayRegistroTipo(tipo) {
  return String(tipo || "")
    .replace(/\bDespiche\b/g, "Diuresis/Deposición")
    .replace(/Diuresis\s*\/\s*Deposici[oó]n/g, "Diuresis/Deposición");
}

function recordChecklistDetail(row) {
  const items = [
    ["Diuresis", recordHasDiuresis(row)],
    ["Deposición", recordHasDeposicion(row)],
    ["Control Registrado", recordHasCycles(row)],
    ["Medicamento", recordHasMedication(row)],
    ["Posición", recordHasPosition(row)],
    ["Mudas", recordHasMudas(row)],
    ["Observación", recordHasObservation(row)]
  ];
  return `<div class="record-checklist">${items.map(([label, ok]) => `<span class="${ok ? "ok" : "no"}"><b>${ok ? "✓" : "✕"}</b> ${label}</span>`).join("")}</div>`;
}

function camChecklistDetail(row) {
  return recordChecklistDetail(row);
}

function camDisplayDetail(row) {
  if (!row || !row.detalle) return "";
  if (!isCamLikeRecord(row)) return row.detalle;
  const diuresis = row.diuresisResultado || inferDespicheResultado(row.detalle, "Diuresis", row);
  const deposicion = row.deposicionResultado || inferDespicheResultado(row.detalle, "Deposición", row);
  const withCycles = ensureCamCycleText(row, row.detalle);
  return applyDespicheToText(withCycles, diuresis, deposicion);
}

function isCamLikeRecord(row) {
  return Boolean(row.detalle && (row.turno || row.cuidadora || row.usuario === "cuidadoras@hogarantu.cl" || /CAM|Control de ciclos|Despiche|Diuresis|Deposici[oó]n/i.test(String(row.tipo || row.detalle || ""))));
}

function ensureCamCycleText(row, detail) {
  const text = String(detail || "");
  if (/Temp\s+[\d,.]+/i.test(text) || ![row.cicloTemp, row.cicloSpo2, row.cicloPa, row.cicloHgt].some(Boolean)) return text;
  const cycleText = `Control registrado. Temp ${row.cicloTemp || "-"} C, Sat ${row.cicloSpo2 || "-"}%, PA ${row.cicloPa || "-"}, HGT ${row.cicloHgt || "-"}.`;
  return `${cycleText} ${text}`.trim();
}

function recordText(row) {
  return String([row.detalle, row.registro, row.observacion, row.tipo, row.rol, row.despicheTipo].filter(Boolean).join(" "));
}

function recordHasDiuresis(row) {
  return recordDespicheResult(row, "Diuresis") === "Si";
}

function recordHasDeposicion(row) {
  return recordDespicheResult(row, "Deposición") === "Si";
}

function recordDespicheResult(row, tipo) {
  const text = recordText(row);
  if (tipo === "Diuresis" && row.diuresisResultado) return normalizeSiNo(row.diuresisResultado);
  if (tipo === "Deposición" && row.deposicionResultado) return normalizeSiNo(row.deposicionResultado);
  if (tipo === "Diuresis") {
    const match = text.match(/Diuresis:\s*(Si|No)/i);
    if (match) return normalizeSiNo(match[1]);
  }
  if (tipo === "Deposición") {
    const match = text.match(/Deposici[oó]n:\s*(Si|No)/i);
    if (match) return normalizeSiNo(match[1]);
  }
  if (isCamLikeRecord(row) && /Despiche|Diuresis|Deposici[oó]n/i.test(text)) {
    return inferDespicheResultado(row.detalle || text, tipo, row);
  }
  return "";
}

function recordHasCycles(row) {
  return Boolean([row.cicloTemp, row.cicloSpo2, row.cicloPa, row.cicloHgt].some(Boolean) || /Temp\s+[\d,.]+|Sat\s+\d+%|PA\s+\d+\/\d+|HGT\s+\d+|toma de ciclos|control de ciclos/i.test(recordText(row)));
}

function recordHasMedication(row) {
  return Boolean(row.medicamento || /Medicamento|medicamentos suministrados|administrado/i.test(recordText(row)));
}

function recordHasPosition(row) {
  return Boolean(row.posicion || row.horaPosicion || /Cambio de posici[oó]n/i.test(recordText(row)));
}

function recordHasMudas(row) {
  return Boolean(row.mudaResultado || row.horaMuda || row.mudaMotivo || /Mudas/i.test(recordText(row)));
}

function recordHasObservation(row) {
  return Boolean(row.observacionCam || row.observacion || row.registro || /Observaci[oó]n|evoluci[oó]n|revision|registro/i.test(recordText(row)));
}

function renderFormularioProfesional(rol, editContext = null) {
  const isEdit = Boolean(editContext);
  const isReadOnly = Boolean(editContext?.readonly);
  const title = isReadOnly ? `Ver registro ${rol}` : isEdit ? `Editar registro ${rol}` : `Formulario ${rol}`;
  const subtitle = isReadOnly ? "Vista de solo lectura del registro ingresado." : isEdit ? "Formulario completo precargado para corregir el registro seleccionado." : "Seleccione un residente activo. Al aceptar, se muestra su ficha resumida antes de guardar.";
  const editArg = isEdit ? editContext.index : "null";
  $("view").dataset.readonly = isReadOnly ? "true" : "false";
  $("view").innerHTML = page(title, subtitle, adminFormBackButton()) +
    `<div class="form-section">
      <div class="grid3">
        <div><label>Residente</label>${residentSelect("proResidente")}</div>
        <div><label>Fecha</label><input id="proFecha" type="date"></div>
        <div><label>Hora</label><input id="proHora" type="time"></div>
      </div>
    </div>
    <div id="proFicha">${residentProfile(RESIDENTES[0])}</div>
    <div class="form-section">
      <label>Evolucion / registro ${rol}</label>
      <textarea id="proTexto"></textarea>
    </div>
    <div class="form-section">
      <h2>Diuresis / Deposición</h2>
      <div class="grid2">
        <div><label>Diuresis (orina)</label><select id="proDiuresisResultado"><option>Si</option><option>No</option></select></div>
        <div><label>Deposición (heces fecales)</label><select id="proDeposicionResultado"><option>Si</option><option>No</option></select></div>
      </div>
    </div>
    ${toggle("chkProCiclos", "Toma de ciclos")}
    <div id="secProCiclos" class="form-section hidden">
      <h2>Toma de ciclos</h2>
      <div class="notice">Esta toma quedara asociada al residente seleccionado arriba y al usuario profesional que ingresa el registro.</div>
      <div class="grid3">
        <div><label>Temperatura C</label><input id="proTemp" inputmode="decimal" placeholder="36,8"></div>
        <div><label>Saturación %</label><input id="proSpo2" type="number" min="0" max="100" step="1" placeholder="96"></div>
        <div><label>Presión arterial mmHg</label>${pressureInputs("proPa")}</div>
        <div><label>HGT / Glucosa mg/dL</label><input id="proHgt" type="number" min="20" max="1000" step="1" placeholder="110"></div>
        <div><label>Observacion ciclos</label><input id="proObsCiclos" placeholder="Opcional"></div>
      </div>
    </div>
    ${toggle("chkProMed", "Administracion de medicamentos")}
    <div id="secProMed" class="form-section hidden">
      <h2>Administracion de medicamentos</h2>
      <div class="grid2">
        <div><label>Hora administracion</label><input id="proHoraMed" type="time"></div>
        <div><label>Nombre medicamento</label><input id="proMed" placeholder="Ej: Losartan 50 mg"></div>
      </div>
    </div>
    ${toggle("chkProPosicion", "Cambio de Posición")}
    <div id="secProPosicion" class="form-section hidden">
      <h2>Cambio de Posición</h2>
      <div class="grid2 position-layout">
        <div>
          <label>Posición registrada</label>
          <select id="proPosicion">
            <option>Decúbito supino (boca arriba)</option>
            <option>Decúbito lateral derecho</option>
            <option>Decúbito lateral izquierdo</option>
          </select>
          <label>Hora del cambio de posición</label>
          <input id="proHoraPosicion" type="time">
        </div>
        <div class="position-reference">
          <img src="./assets/cambios-posicion.png" alt="Referencia de cambios de posición">
        </div>
      </div>
    </div>
    ${toggle("chkProMudas", "Mudas")}
    <div id="secProMudas" class="form-section hidden">
      <h2>Mudas</h2>
      <div class="grid2">
        <div>
          <label>¿Se realizó muda?</label>
          <select id="proMuda">
            <option>Si</option>
            <option>No</option>
          </select>
        </div>
        <div><label>Hora de la muda</label><input id="proHoraMuda" type="time"></div>
      </div>
      <div id="proMudaMotivoWrap" class="hidden">
        <label>Motivo por el cual no se realizó muda</label>
        <textarea id="proMudaMotivo" placeholder="Ej: no aplica, residente autovalente, no requiere cambio de muda"></textarea>
      </div>
    </div>
    ${toggle("chkProObs", "Agregar observaciones")}
    <div id="secProObs" class="form-section hidden">
      <h2>Observaciones</h2>
      <label>Detalle</label>
      <textarea id="proObs" placeholder="Comentarios adicionales del cuidado o procedimiento"></textarea>
    </div>
    <div class="form-actions">
      ${isReadOnly ? "" : `<button class="btn primary" onclick="confirmProfesional('${rol}', ${editArg})">${isEdit ? "Guardar cambios" : "Guardar registro"}</button>`}
      ${isEdit ? `<button class="btn ghost" onclick="go('${editContext.returnView}')">${isReadOnly ? "Volver" : "Cancelar"}</button>` : ""}
    </div>`;
  $("proResidente").addEventListener("change", () => {
    const resident = RESIDENTES.find((r) => r.id === Number($("proResidente").value));
    $("proFicha").innerHTML = residentProfile(resident);
  });
  bindProfessionalDateRules();
  bindProfessionalToggles();
  bindProfessionalMudaReason();
  bindDecimalCommaValidation(["proTemp"]);
  if (editContext) hydrateProfessionalForm(editContext.row);
  if (isReadOnly) lockForm($("view"));
}

function confirmProfesional(rol, editIndex = null) {
  const resident = RESIDENTES.find((r) => r.id === Number($("proResidente").value));
  const fechaHora = `${$("proFecha").value || "2026-06-14"} ${$("proHora").value || "10:00"}`;
  const incluyeCiclos = $("chkProCiclos").checked || professionalCyclesActive();
  const hasMedicationData = professionalMedicationActive();
  const hasPositionData = professionalPositionActive();
  const hasMudaData = professionalMudaActive();
  const hasObservationData = professionalObservationActive();
  const dateError = validateProfessionalDate();
  if (dateError) {
    openModal("Fecha no permitida", dateError);
    return;
  }
  if (incluyeCiclos && !professionalCyclesValid()) {
    openModal("Toma de ciclos", "Debe completar temperatura, saturacion, presion arterial sistolica y diastolica, y HGT/Glucosa para guardar la toma de ciclos.");
    return;
  }
  const faltantes = [];
  if (hasMedicationData && !$("proMed").value.trim()) faltantes.push("nombre medicamento");
  if (hasPositionData && !$("proPosicion").value) faltantes.push("cambio de posicion");
  if (hasPositionData && !$("proHoraPosicion").value) faltantes.push("hora del cambio de posicion");
  if (hasMudaData && !$("proMuda").value) faltantes.push("mudas");
  if (hasMudaData && !$("proHoraMuda").value) faltantes.push("hora de muda");
  if (hasMudaData && $("proMuda").value === "No" && !$("proMudaMotivo").value.trim()) faltantes.push("motivo por el cual no se realizo muda");
  if (hasObservationData && !$("proObs").value.trim()) faltantes.push("detalle de observacion");
  if (faltantes.length) {
    openModal("Campos obligatorios", `Debe completar: ${faltantes.join(", ")}.`);
    return;
  }
  const decimalError = validateDecimalCommaFields([{ id: "proTemp", label: "temperatura" }]);
  if (decimalError) {
    openModal("Separador decimal", decimalError);
    return;
  }
  const vitalError = incluyeCiclos ? validateCycleNumbers({
    tempId: "proTemp",
    spo2Id: "proSpo2",
    pressurePrefix: "proPa",
    hgtId: "proHgt"
  }) : "";
  if (vitalError) {
    openModal("Valor no permitido", vitalError);
    return;
  }
  openModal(`Confirmar registro ${rol}`, `Esta seguro que desea ${editIndex === null ? "agregar" : "actualizar"} este registro al residente ${resident.nombre}?`, () => {
    const registro = $("proTexto").value || "Registro sin detalle.";
    const payload = {
      fecha: fechaHora,
      residente: resident.nombre,
      rol,
      usuario: rol === "Enfermero" ? "enfermero@hogarantu.cl" : "dt@hogarantu.cl",
      registro: professionalRecordDetail(registro, incluyeCiclos),
      despicheTipo: "Diuresis / Deposición",
      despicheResultado: despicheHasNo({
        diuresisResultado: $("proDiuresisResultado").value,
        deposicionResultado: $("proDeposicionResultado").value
      }) ? "No" : "Si",
      diuresisResultado: $("proDiuresisResultado").value,
      deposicionResultado: $("proDeposicionResultado").value,
      cicloTemp: incluyeCiclos ? $("proTemp").value : "",
      cicloSpo2: incluyeCiclos ? $("proSpo2").value : "",
      cicloPa: incluyeCiclos ? pressureValue("proPa") : "",
      cicloHgt: incluyeCiclos ? $("proHgt").value : "",
      medicamento: hasMedicationData ? ($("proMed").value || "Medicamento sin nombre") : "",
      horaMedicamento: hasMedicationData ? ($("proHoraMed").value || "") : "",
      posicion: hasPositionData ? $("proPosicion").value : "",
      horaPosicion: hasPositionData ? $("proHoraPosicion").value : "",
      mudaResultado: hasMudaData ? $("proMuda").value : "",
      horaMuda: hasMudaData ? $("proHoraMuda").value : "",
      mudaMotivo: hasMudaData && $("proMuda").value === "No" ? $("proMudaMotivo").value.trim() : "",
      observacionCam: hasObservationData ? $("proObs").value.trim() : "",
      editable: true
    };
    if (editIndex === null) {
      REGISTROS_PRO.unshift(payload);
    } else {
      Object.assign(REGISTROS_PRO[editIndex], payload);
    }
    if (incluyeCiclos) {
      CONTROLES_CICLOS.push(professionalCycleRecord(resident, rol, fechaHora));
    }
    state.view = editIndex === null ? "misRegistrosProfesional" : state.editReturnView || "misRegistrosProfesional";
    renderShell();
  });
}

function bindProfessionalToggles() {
  [
    ["chkProCiclos", "secProCiclos"],
    ["chkProMed", "secProMed"],
    ["chkProPosicion", "secProPosicion"],
    ["chkProMudas", "secProMudas"],
    ["chkProObs", "secProObs"]
  ].forEach(([chk, sec]) => {
    const checkbox = $(chk);
    const section = $(sec);
    if (!checkbox || !section) return;
    const card = checkbox.closest(".toggle-card");
    const mark = card?.querySelector(".toggle-card-mark");
    const update = () => {
      section.classList.toggle("hidden", !checkbox.checked);
      card?.classList.toggle("active", checkbox.checked);
      if (mark) mark.textContent = checkbox.checked ? "✓" : "+";
      if (checkbox.checked && chk === "chkProPosicion" && $("proHoraPosicion") && !$("proHoraPosicion").value) {
        $("proHoraPosicion").value = $("proHora")?.value || "";
      }
      if (checkbox.checked && chk === "chkProMudas" && $("proHoraMuda") && !$("proHoraMuda").value) {
        $("proHoraMuda").value = $("proHora")?.value || "";
      }
      updateProfessionalToggleSummaries();
    };
    checkbox.addEventListener("change", update);
    update();
  });
  bindProfessionalSummaryInputs();
  updateProfessionalToggleSummaries();
}

function bindProfessionalMudaReason() {
  const select = $("proMuda");
  const wrap = $("proMudaMotivoWrap");
  if (!select || !wrap) return;
  const update = () => {
    wrap.classList.toggle("hidden", select.value !== "No");
    updateProfessionalToggleSummaries();
  };
  select.addEventListener("change", update);
  update();
}

function hydrateProfessionalForm(row) {
  const [fecha = todayIso(), hora = currentTimeInput()] = String(row.fecha || "").split(" ");
  const resident = RESIDENTES.find((item) => item.nombre === row.residente) || RESIDENTES[0];
  const extractRow = { ...row, detalle: row.registro || row.detalle || "" };
  const cycles = extractCamCycleFormValues(extractRow);
  const med = extractMedicationFormValues(extractRow);
  const posicion = extractPositionFormValues(extractRow);
  const muda = extractMudaFormValues(extractRow);
  const obs = extractCamObservationValue(extractRow);

  setValue("proResidente", resident.id);
  setValue("proFecha", fecha);
  setValue("proHora", hora || "");
  setValue("proTexto", extractProfessionalMainText(row));
  setValue("proDiuresisResultado", row.diuresisResultado || inferDespicheResultado(row.registro, "Diuresis", row));
  setValue("proDeposicionResultado", row.deposicionResultado || inferDespicheResultado(row.registro, "Deposición", row));
  $("proFicha").innerHTML = residentProfile(resident);

  if (cycles.hasData) {
    setToggleChecked("chkProCiclos", true);
    setValue("proTemp", cycles.temp);
    setValue("proSpo2", cycles.spo2);
    setPressureValue("proPa", cycles.pa);
    setValue("proHgt", cycles.hgt);
  }
  if (med.hasData) {
    setToggleChecked("chkProMed", true);
    setValue("proHoraMed", med.hora);
    setValue("proMed", med.nombre);
  }
  if (posicion.hasData) {
    setToggleChecked("chkProPosicion", true);
    setValue("proPosicion", posicion.nombre);
    setValue("proHoraPosicion", posicion.hora);
  }
  if (muda.hasData) {
    setToggleChecked("chkProMudas", true);
    setValue("proMuda", muda.resultado);
    setValue("proHoraMuda", muda.hora);
    setValue("proMudaMotivo", muda.motivo);
    bindProfessionalMudaReason();
  }
  if (obs) {
    setToggleChecked("chkProObs", true);
    setValue("proObs", obs);
  }
  updateProfessionalToggleSummaries();
}

function extractProfessionalMainText(row) {
  return String(row.registro || "")
    .replace(/Se agrega toma de ciclos profesional:\s*Temp\s+[\d,.]+\s*C,\s*Sat\s+\d+%,\s*PA\s+\d+\/\d+,\s*HGT\s+\d+\.?\s*/i, "")
    .replace(/Diuresis:\s*(Si|No)\.?\s*/gi, "")
    .replace(/Deposici[oó]n:\s*(Si|No)\.?\s*/gi, "")
    .replace(/Medicamento\s+.+?\s+(?:administrado\s+)?a las\s+\d{2}:\d{2}\.?\s*/i, "")
    .replace(/Cambio de posici[oó]n:\s*.+?\s+a las\s+\d{2}:\d{2}\.?\s*/i, "")
    .replace(/Mudas:\s*(Si|No)\s+a las\s+\d{2}:\d{2}\.(?:\s*Motivo:\s*.+?\.)?\s*/i, "")
    .trim();
}

function bindProfessionalSummaryInputs() {
  [
    "proTemp", "proSpo2", "proPaSistolica", "proPaDiastolica", "proHgt",
    "proHoraMed", "proMed",
    "proPosicion", "proHoraPosicion",
    "proMuda", "proHoraMuda", "proMudaMotivo",
    "proObs"
  ].forEach((id) => {
    const field = $(id);
    if (!field || field.dataset.summaryBound) return;
    field.dataset.summaryBound = "true";
    field.addEventListener("input", updateProfessionalToggleSummaries);
    field.addEventListener("change", updateProfessionalToggleSummaries);
  });
}

function updateProfessionalToggleSummaries() {
  const summaries = {
    chkProCiclos: professionalCycleSummary(),
    chkProMed: professionalMedicationSummary(),
    chkProPosicion: professionalPositionSummary(),
    chkProMudas: professionalMudaSummary(),
    chkProObs: professionalObservationSummary()
  };
  Object.entries(summaries).forEach(([id, text]) => {
    const summary = $(`${id}Summary`);
    if (!summary) return;
    summary.textContent = text;
    summary.classList.toggle("hidden", !text);
  });
}

function professionalCycleSummary() {
  const pa = pressureValue("proPa");
  const values = [
    $("proTemp")?.value ? `Temp ${$("proTemp").value} C` : "",
    $("proSpo2")?.value ? `Sat ${$("proSpo2").value}%` : "",
    pa ? `PA ${pa}` : "",
    $("proHgt")?.value ? `HGT ${$("proHgt").value}` : ""
  ].filter(Boolean);
  return values.join(" · ");
}

function professionalMedicationSummary() {
  const med = $("proMed")?.value?.trim();
  const hora = $("proHoraMed")?.value;
  if (!med && !hora) return "";
  return [med ? `Medicamento: ${med}` : "", hora ? `Hora: ${hora}` : ""].filter(Boolean).join(" · ");
}

function professionalPositionSummary() {
  const posicion = $("proPosicion")?.value;
  const hora = $("proHoraPosicion")?.value;
  if (!$("chkProPosicion")?.checked && !hora) return "";
  return [posicion || "", hora ? `Hora: ${hora}` : ""].filter(Boolean).join(" · ");
}

function professionalMudaSummary() {
  const muda = $("proMuda")?.value;
  const hora = $("proHoraMuda")?.value;
  const motivo = $("proMudaMotivo")?.value?.trim();
  if (!$("chkProMudas")?.checked && !hora && !motivo) return "";
  return [`Muda: ${muda || "-"}`, hora ? `Hora: ${hora}` : "", motivo ? `Motivo: ${motivo}` : ""].filter(Boolean).join(" · ");
}

function professionalObservationSummary() {
  const obs = $("proObs")?.value?.trim();
  if (!obs) return "";
  return obs.length > 120 ? `${obs.slice(0, 117)}...` : obs;
}

function bindProfessionalDateRules() {
  const fecha = $("proFecha");
  const hora = $("proHora");
  if (!fecha) return;
  fecha.min = addDaysIso(new Date(), -7);
  fecha.max = todayIso();
  if (!fecha.value) fecha.value = todayIso();
  if (hora && !hora.value) hora.value = currentTimeInput();
}

function validateProfessionalDate() {
  const value = $("proFecha").value;
  const min = addDaysIso(new Date(), -7);
  const max = todayIso();
  if (!value) return "Debe seleccionar una fecha.";
  if (value < min || value > max) return "Directora Tecnica y Enfermero solo pueden registrar desde hoy hasta 7 dias hacia atras, nunca fechas futuras.";
  return "";
}

function professionalCyclesValid() {
  return Boolean($("proTemp").value && $("proSpo2").value && pressureValue("proPa") && $("proHgt").value);
}

function professionalCyclesActive() {
  return ["proTemp", "proSpo2", "proPaSistolica", "proPaDiastolica", "proHgt"].some((id) => Boolean($(id)?.value));
}

function professionalMedicationActive() {
  return Boolean($("chkProMed")?.checked || $("proMed")?.value?.trim() || $("proHoraMed")?.value);
}

function professionalPositionActive() {
  return Boolean($("chkProPosicion")?.checked || $("proHoraPosicion")?.value);
}

function professionalMudaActive() {
  return Boolean($("chkProMudas")?.checked || $("proHoraMuda")?.value || $("proMudaMotivo")?.value?.trim());
}

function professionalObservationActive() {
  return Boolean($("chkProObs")?.checked || $("proObs")?.value?.trim());
}

function professionalCycleRecord(resident, rol, fechaHora) {
  const pressure = parsePressure(pressureValue("proPa"));
  return {
    residente: resident.nombre,
    fecha: fechaHora,
    temp: Number(parseDecimalValue($("proTemp").value).toFixed(1)),
    spo2: Number($("proSpo2").value),
    pad: pressure.diastolica,
    hgt: Number($("proHgt").value),
    origen: rol,
    usuario: rol === "Enfermero" ? "enfermero@hogarantu.cl" : "dt@hogarantu.cl",
    observacion: $("proObsCiclos").value || "Toma de ciclos profesional."
  };
}

function professionalCyclesDetail() {
  return `Temp ${$("proTemp").value} C, Sat ${$("proSpo2").value}%, PA ${pressureValue("proPa")}, HGT ${$("proHgt").value}. ${$("proObsCiclos").value || ""}`.trim();
}

function professionalDespicheDetail() {
  return `Diuresis: ${$("proDiuresisResultado").value}. Deposición: ${$("proDeposicionResultado").value}.`;
}

function professionalRecordDetail(registro, incluyeCiclos) {
  const parts = [registro];
  if (incluyeCiclos) parts.push(`Se agrega toma de ciclos profesional: ${professionalCyclesDetail()}`);
  parts.push(professionalDespicheDetail());
  if (professionalMedicationActive()) parts.push(`Medicamento ${$("proMed").value || "sin nombre"} a las ${$("proHoraMed").value || "--:--"}.`);
  if (professionalPositionActive()) parts.push(`Cambio de posición: ${$("proPosicion").value} a las ${$("proHoraPosicion").value || "--:--"}.`);
  if (professionalMudaActive()) {
    const motivo = $("proMuda").value === "No" ? ` Motivo: ${$("proMudaMotivo").value.trim()}.` : "";
    parts.push(`Mudas: ${$("proMuda").value} a las ${$("proHoraMuda").value || "--:--"}.${motivo}`);
  }
  if (professionalObservationActive()) parts.push($("proObs").value || "Sin detalle de observacion.");
  return parts.join(" ");
}

function validateCycleNumbers({ tempId, spo2Id, pressurePrefix, hgtId }) {
  const tempText = $(tempId)?.value;
  const temp = parseDecimalValue(tempText);
  const spo2 = Number($(spo2Id)?.value);
  const pressure = parsePressure(pressureValue(pressurePrefix));
  const hgt = Number($(hgtId)?.value);
  if (!Number.isFinite(temp) || temp < 30 || temp > 45) {
    return "La temperatura debe estar entre 30 y 45 C.";
  }
  if (!Number.isFinite(spo2) || spo2 < 0 || spo2 > 100) {
    return "La saturacion debe ser un numero entre 0 y 100%.";
  }
  if (!Number.isFinite(pressure.sistolica) || pressure.sistolica < 40 || pressure.sistolica > 260) {
    return "La presion sistolica debe estar entre 40 y 260 mmHg.";
  }
  if (!Number.isFinite(pressure.diastolica) || pressure.diastolica < 20 || pressure.diastolica > 180) {
    return "La presion diastolica debe estar entre 20 y 180 mmHg.";
  }
  if (pressure.diastolica >= pressure.sistolica) {
    return "La presion diastolica debe ser menor que la sistolica.";
  }
  if (!Number.isFinite(hgt) || hgt < 20 || hgt > 1000) {
    return "El HGT / glucosa debe estar entre 20 y 1000 mg/dL.";
  }
  return "";
}

function parsePressure(value) {
  const parts = String(value || "").split("/").map((part) => Number(part.trim()));
  return {
    sistolica: Number.isFinite(parts[0]) ? parts[0] : null,
    diastolica: Number.isFinite(parts[1]) ? parts[1] : Number(parts[0] || 0)
  };
}

function renderDashboardResidente(view) {
  const r = selectedResident();
  view.innerHTML = page("Dashboard residentes", "Consulta de ficha, evolucion, controles CAM, nutricion y alertas.") +
    residentSearchPanel() +
    residentProfile(r) +
    dashboardTabs(r);
  attachResidentSearch();
  attachDashboardTabs();
}

function dashboardTabs(resident) {
  return `<div class="tabs">
      ${["evolucion", "cam", "medicamentos", "nutricion", "alertas"].map((tab) => `<button class="${state.dashboardTab === tab ? "active" : ""}" data-tab="${tab}">${tabLabel(tab)}</button>`).join("")}
    </div>
    <div id="dashTabContent">${dashboardTabContent(resident)}</div>`;
}

function attachDashboardTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.dashboardTab = button.dataset.tab;
      renderView();
    });
  });
}

function tabLabel(tab) {
  return { evolucion: "Evolucion", cam: "Controles CAM", medicamentos: "Medicamentos", nutricion: "Nutricion", alertas: "Alertas" }[tab];
}

function dashboardTabContent(r) {
  if (state.dashboardTab === "cam") {
    return renderGraficasCam(r) + controlesTable(r);
  }
  if (state.dashboardTab === "medicamentos") {
    return medicamentosTable(r);
  }
  if (state.dashboardTab === "nutricion") {
    return pesoMensualCard(r) + `<div class="timeline"><b>Nutricion</b><p>Ultimo IMC registrado: 22.4. Mantener indicaciones.</p></div>`;
  }
  if (state.dashboardTab === "alertas") {
    return residentAlerts(r);
  }
  return bitacoraResidente(r);
}

function renderGraficasCam(resident) {
  const data = ultimosControlesSemana(resident);
  return `<div class="notice">Graficas de controles CAM: ultimos 5 dias, con hasta 3 lecturas posibles por dia. Regla operativa: minimo 2 controles diarios por residente.</div>
    <div class="chart-grid">
      ${chartCard(UMBRALES_CICLOS.temp, data, "temp")}
      ${chartCard(UMBRALES_CICLOS.spo2, data, "spo2")}
      ${chartCard(UMBRALES_CICLOS.pad, data, "pad")}
      ${chartCard(UMBRALES_CICLOS.hgt, data, "hgt")}
    </div>
    ${pesoMensualCard(resident)}`;
}

function ultimosControlesSemana(resident) {
  return CONTROLES_CICLOS
    .filter((row) => row.residente === resident.nombre)
    .slice(-CONTROL_PUNTOS_GRAFICA);
}

function chartCard(config, data, key) {
  const { label, unit, normalLow, normalHigh } = config;
  if (!data.length) {
    return `<div class="card"><h2>${label}</h2><div class="notice">Sin datos para graficar.</div></div>`;
  }
  const values = data.map((row) => Number(row[key]));
  const hasLimits = normalLow !== null && normalHigh !== null;
  const minValue = hasLimits ? Math.min(...values, normalLow) : Math.min(...values) - 0.5;
  const maxValue = hasLimits ? Math.max(...values, normalHigh) : Math.max(...values) + 0.5;
  const padding = 38;
  const width = 420;
  const height = 220;
  const span = Math.max(1, maxValue - minValue);
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const yFor = (value) => height - padding - ((value - minValue) / span) * (height - padding * 2);
  const yTicks = hasLimits ? chartTicks(normalLow, normalHigh, 5) : chartTicks(minValue, maxValue, 5);
  const points = data.map((row, index) => ({
    x: padding + index * xStep,
    y: yFor(Number(row[key])),
    value: Number(row[key]),
    fecha: row.fecha
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const yLow = hasLimits ? yFor(normalLow) : null;
  const yHigh = hasLimits ? yFor(normalHigh) : null;
  return `<div class="card">
    <h2>${label}</h2>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
      ${yTicks.map((tick) => `<line x1="${padding}" y1="${yFor(tick)}" x2="${width - padding}" y2="${yFor(tick)}" stroke="#edf2f2" stroke-width="1" />`).join("")}
      ${yTicks.map((tick) => `<text x="7" y="${yFor(tick) + 4}" font-size="9.5" font-weight="700" fill="#465154">${formatChartNumber(tick)}</text>`).join("")}
      ${hasLimits ? `<line x1="${padding}" y1="${yHigh}" x2="${width - padding}" y2="${yHigh}" stroke="#475569" stroke-dasharray="5 4" />` : ""}
      ${hasLimits ? `<line x1="${padding}" y1="${yLow}" x2="${width - padding}" y2="${yLow}" stroke="#475569" stroke-dasharray="5 4" />` : ""}
      <polyline points="${line}" fill="none" stroke="#188f8f" stroke-width="3" />
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${hasLimits ? statusColor(point.value, normalLow, normalHigh) : "#188f8f"}"><title>${point.fecha}: ${formatChartNumber(point.value)} ${unit}</title></circle>`).join("")}
      ${points.map((point) => `<text x="${point.x - 8}" y="${Math.max(12, point.y - 8)}" font-size="7.5" font-weight="700" fill="#263238">${formatChartNumber(point.value)}</text>`).join("")}
      ${points.map((point) => `<text x="${point.x - 9}" y="${height - 10}" font-size="7.5" font-weight="700" fill="#465154">${chartDateLabel(point.fecha)}</text>`).join("")}
    </svg>
    <div class="legend">
      ${hasLimits ? '<span><i class="dot green"></i>Normal</span><span><i class="dot yellow"></i>Alerta</span><span><i class="dot red"></i>Critico</span>' : '<span><i class="dot green"></i>Seguimiento</span>'}
      <span>Ultimo: ${values[values.length - 1]} ${unit}</span>
    </div>
  </div>`;
}

function reportCharts(controles, days) {
  return `<div class="report-section">
    <h2>Gráficas De Control De Ciclos</h2>
    <div class="chart-grid">
      ${chartCardReport(UMBRALES_CICLOS.spo2, controles, "spo2")}
      ${chartCardReport(UMBRALES_CICLOS.pad, controles, "pad")}
      ${chartCardReport(UMBRALES_CICLOS.hgt, controles, "hgt")}
      ${chartCardReport(UMBRALES_CICLOS.temp, controles, "temp")}
    </div>
  </div>`;
}

function chartCardReport(config, data, key) {
  const { label, unit, normalLow, normalHigh } = config;
  if (!data.length) {
    return `<div class="card"><h2>${label}</h2><div class="notice">Sin datos para graficar.</div></div>`;
  }
  const values = data.map((row) => Number(row[key]));
  const minValue = Math.min(...values, normalLow);
  const maxValue = Math.max(...values, normalHigh);
  const padding = 42;
  const width = 620;
  const height = 230;
  const span = Math.max(1, maxValue - minValue);
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const yFor = (value) => height - padding - ((value - minValue) / span) * (height - padding * 2);
  const yTicks = chartTicks(normalLow, normalHigh, 5);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const points = data.map((row, index) => ({
    x: padding + index * xStep,
    y: yFor(Number(row[key])),
    value: Number(row[key]),
    fecha: row.fecha,
    showLabel: index % labelEvery === 0 || index === data.length - 1
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const yLow = yFor(normalLow);
  const yHigh = yFor(normalHigh);
  return `<div class="card">
    <h2>${label}</h2>
    <svg class="chart-svg report-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} reporte">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
      ${yTicks.map((tick) => `<line x1="${padding}" y1="${yFor(tick)}" x2="${width - padding}" y2="${yFor(tick)}" stroke="#edf2f2" stroke-width="1" />`).join("")}
      ${yTicks.map((tick) => `<text x="7" y="${yFor(tick) + 4}" font-size="9.5" font-weight="700" fill="#465154">${formatChartNumber(tick)}</text>`).join("")}
      <line x1="${padding}" y1="${yHigh}" x2="${width - padding}" y2="${yHigh}" stroke="#475569" stroke-dasharray="5 4" />
      <line x1="${padding}" y1="${yLow}" x2="${width - padding}" y2="${yLow}" stroke="#475569" stroke-dasharray="5 4" />
      <polyline points="${line}" fill="none" stroke="#188f8f" stroke-width="2.4" />
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.2" fill="${statusColor(point.value, normalLow, normalHigh)}"><title>${point.fecha}: ${formatChartNumber(point.value)} ${unit}</title></circle>`).join("")}
      ${points.map((point) => `<text x="${point.x - 8}" y="${Math.max(12, point.y - 7)}" font-size="6.8" font-weight="700" fill="#263238">${formatChartNumber(point.value)}</text>`).join("")}
      ${points.filter((point) => point.showLabel).map((point) => `<text x="${point.x - 13}" y="${height - 10}" font-size="7" font-weight="700" fill="#465154">${chartDateLabel(point.fecha)}</text>`).join("")}
    </svg>
    <div class="legend">
      <span><i class="dot green"></i>Normal</span><span><i class="dot yellow"></i>Alerta</span><span><i class="dot red"></i>Critico</span>
      <span>${data.length} lecturas</span>
    </div>
  </div>`;
}

function chartTicks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => Number((min + step * index).toFixed(1)));
}

function pesoMensualCard(resident) {
  const pesos = CONTROLES_PESO.filter((row) => row.residente === resident.nombre);
  const ultimo = pesos[pesos.length - 1];
  return `<div class="card table-wrap">
    <h2>Control De Peso</h2>
    <div class="notice">El peso no forma parte de los 3 ciclos diarios. Se registra al ingreso y luego como control mensual junto a indicaciones de minuta o regimen.</div>
    ${pesoChart(pesos)}
    <table>
      <thead><tr><th>Fecha control</th><th>Peso</th><th>Minuta / regimen indicado</th></tr></thead>
      <tbody>${pesos.map((row) => `<tr><td>${row.fecha}</td><td>${formatDecimalText(row.peso)} kg</td><td>${row.regimen}</td></tr>`).join("")}</tbody>
    </table>
    ${ultimo ? `<p><b>Ultima indicacion:</b> ${ultimo.regimen}</p>` : ""}
  </div>`;
}

function pesoChart(pesos) {
  if (!pesos.length) return `<div class="notice">Sin controles mensuales de peso.</div>`;
  const values = pesos.map((row) => Number(row.peso));
  const minValue = Math.floor(Math.min(...values) - 1);
  const maxValue = Math.ceil(Math.max(...values) + 1);
  const padding = 42;
  const width = 760;
  const height = 230;
  const span = Math.max(1, maxValue - minValue);
  const xStep = pesos.length > 1 ? (width - padding * 2) / (pesos.length - 1) : 0;
  const yFor = (value) => height - padding - ((value - minValue) / span) * (height - padding * 2);
  const points = pesos.map((row, index) => ({
    x: padding + index * xStep,
    y: yFor(Number(row.peso)),
    value: Number(row.peso),
    fecha: row.fecha
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return `<svg class="chart-svg wide-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafica mensual de peso">
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d4dddf" stroke-width="1.5" />
    <text x="8" y="${padding + 4}" font-size="11" font-weight="700" fill="#465154">${formatChartNumber(maxValue)} kg</text>
    <text x="8" y="${height - padding}" font-size="11" font-weight="700" fill="#465154">${formatChartNumber(minValue)} kg</text>
    <polyline points="${line}" fill="none" stroke="#4f46e5" stroke-width="3" />
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#4f46e5"><title>${point.fecha}: ${formatChartNumber(point.value)} kg</title></circle>`).join("")}
    ${points.map((point) => `<text x="${point.x - 24}" y="${height - 12}" font-size="10" font-weight="700" fill="#465154">${point.fecha.slice(5)}</text>`).join("")}
    ${points.map((point) => `<text x="${point.x - 14}" y="${point.y - 10}" font-size="10" font-weight="700" fill="#263238">${formatChartNumber(point.value)} kg</text>`).join("")}
  </svg>`;
}

function formatChartNumber(value) {
  const formatted = Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
  return formatted.replace(".", ",");
}

function chartDateLabel(value) {
  const datePart = String(value || "").split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
  return datePart.slice(0, 5);
}

function statusColor(value, normalLow, normalHigh) {
  if (value >= normalLow && value <= normalHigh) return "#1f8f4d";
  const distance = Math.min(Math.abs(value - normalLow), Math.abs(value - normalHigh));
  return distance <= Math.max(1, (normalHigh - normalLow) * 0.2) ? "#d79a00" : "#b4232b";
}

function controlesTable(resident) {
  const data = ultimosControlesSemana(resident);
  return `<div class="card table-wrap">
    <h2>Controles de ciclos ultimos 5 dias</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Origen</th><th>Usuario</th><th>Temperatura</th><th>Saturacion</th><th>Presion diastolica</th><th>HGT</th></tr></thead>
      <tbody>${data.map((row) => `<tr><td>${row.fecha}</td><td>${row.origen || "CAM"}</td><td>${row.usuario || "-"}</td><td>${row.temp} C</td><td>${row.spo2} %</td><td>${row.pad} mmHg</td><td>${row.hgt} mg/dL</td></tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function medicamentosTable(resident) {
  const today = new Date(2026, 5, 14, 23, 59);
  const camLimit = daysBefore(today, 5);
  const rows = [...REGISTROS_CAM, ...REGISTROS_PRO]
    .filter((registro) => registro.residente === resident.nombre)
    .filter((registro) => recordHasMedication(registro))
    .filter((registro) => parseRegistroDate(registro.fecha) >= camLimit)
    .sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  return `<div class="card table-wrap">
    <h2>Control De Medicamentos Ultimos 5 Dias</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Remedio</th><th>Usuario</th><th>Cuidadora</th><th>Detalle</th></tr></thead>
      <tbody>
        ${rows.length ? rows.map((row) => `<tr>
          <td>${medicamentoFecha(row)}</td>
          <td>${row.medicamento || inferMedicamento(row.detalle)}</td>
          <td>${row.usuario || row.rol || usuarioCamPorTurno(row.turno)}</td>
          <td>${row.cuidadora || row.rol || "-"}</td>
          <td>${isCamLikeRecord(row) ? camDisplayDetail(row) : row.registro}</td>
        </tr>`).join("") : `<tr><td colspan="5">Sin administracion de medicamentos registrada para este residente en los ultimos 5 dias.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

function usuarioCamPorTurno(turno) {
  return "cuidadoras@hogarantu.cl";
}

function medicamentoFecha(row) {
  if (!row.horaMedicamento) return row.fecha;
  return `${row.fecha.split(" ")[0]} ${row.horaMedicamento}`;
}

function medicamentoDia(row) {
  return String(medicamentoFecha(row) || "").split(" ")[0] || "-";
}

function medicamentoHora(row) {
  return String(medicamentoFecha(row) || "").split(" ")[1] || "-";
}

function inferMedicamento(detalle) {
  const match = String(detalle || "").match(/(?:Medicamento\s+)?([^\\.]+(?:mg|mcg|ml|UI))/i);
  return match ? match[1].trim() : "Medicamento registrado";
}

function bitacoraResidente(resident) {
  const entries = bitacoraResumenEntries(resident);
  const content = entries.length
    ? entries.map((entry) => `<div class="timeline ${entry.clase}">
        <b>${entry.fecha} | ${entry.tipo}</b>
        <p>${entry.detalle}</p>
      </div>`).join("")
    : `<div class="notice">Sin registros para el periodo seleccionado en esta maqueta.</div>`;
  return `<div class="card">
    <h2>Bitacora resumen de registros</h2>
    <div class="notice">Incluye ultimos 7 dias: Directora Tecnica y Enfermero. De cuidadoras solo muestra administracion de medicamentos o registros asociados a alertas. Nutricionista muestra su ultimo registro mensual. Orden: fecha decreciente.</div>
    ${content}
  </div>`;
}

function bitacoraResumenEntries(resident) {
  const today = dashboardReferenceDate();
  const limit = daysBefore(today, 7);
  const camEntries = REGISTROS_CAM
    .filter((registro) => registro.residente === resident.nombre && parseRegistroDate(registro.fecha) >= limit && parseRegistroDate(registro.fecha) <= today)
    .filter((registro) => camRegistroEjecutivo(registro))
    .map((registro) => ({
      fecha: registro.fecha,
      date: parseRegistroDate(registro.fecha),
      tipo: `CAM / ${displayRegistroTipo(registro.tipo)}`,
      detalle: `<b>Usuario:</b> ${registro.usuario || usuarioCamPorTurno(registro.turno)}. <b>Cuidadora:</b> ${registro.cuidadora}. <b>Turno:</b> ${registro.turno}. ${camDisplayDetail(registro)}`,
      clase: "timeline-cam"
    }));
  const profesionalEntries = REGISTROS_PRO
    .filter((registro) => registro.residente === resident.nombre && parseRegistroDate(registro.fecha) >= limit && parseRegistroDate(registro.fecha) <= today)
    .map((registro) => ({
      fecha: registro.fecha,
      date: parseRegistroDate(registro.fecha),
      tipo: registro.rol,
      detalle: registro.registro,
      clase: registro.rol === "Enfermero" ? "timeline-enfermero" : "timeline-dt"
    }));
  const ultimoNutri = REGISTROS_NUTRI
    .filter((registro) => registro.residente === resident.nombre && parseRegistroDate(registro.fecha) <= today)
    .sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha))[0];
  const nutriEntries = ultimoNutri ? [{
      fecha: ultimoNutri.fecha,
      date: parseRegistroDate(ultimoNutri.fecha),
      tipo: "Nutricionista",
      detalle: `<b>IMC:</b> ${ultimoNutri.imc}. ${ultimoNutri.observacion}`,
      clase: "timeline-nutri"
    }] : [];
  return [...camEntries, ...profesionalEntries, ...nutriEntries]
    .sort((a, b) => b.date - a.date);
}

function dashboardReferenceDate() {
  return new Date(2026, 5, 14, 23, 59);
}

function camRegistroEjecutivo(registro) {
  return camRegistroTieneMedicamento(registro) || camRegistroTieneAlerta(registro);
}

function camRegistroTieneMedicamento(registro) {
  return String(registro.tipo || "").toLowerCase().includes("medicamento") || Boolean(registro.medicamento);
}

function camRegistroTieneAlerta(registro) {
  return alertaVitalMismoRegistro(registro) || registroDespicheAsociadoAAlerta(registro) || alertaMismaFechaResidente(registro);
}

function alertaVitalMismoRegistro(registro) {
  return alertasSignosVitalesCam().some((alerta) => alerta.residente === registro.residente && alerta.fecha === registro.fecha);
}

function camRegistroFueraDeRangoCritico(registro) {
  const valores = extractCamVitals(registro.detalle);
  if (valores.temp !== null && (valores.temp >= 37.8 || valores.temp <= 35.5)) return { variable: "Temperatura", valor: `${valores.temp} C`, accion: "Repetir control e informar a Enfermero si persiste." };
  if (valores.spo2 !== null && valores.spo2 <= 91) return { variable: "Saturacion", valor: `${valores.spo2} %`, accion: "Verificar equipo, evaluar signos respiratorios y avisar inmediatamente." };
  if (valores.pad !== null && (valores.pad >= 100 || valores.pad <= 50)) return { variable: "Presion arterial", valor: `PAD ${valores.pad} mmHg`, accion: "Repetir toma de presion y avisar a Enfermero o Directora Tecnica." };
  if (valores.hgt !== null && (valores.hgt >= 200 || valores.hgt <= 60)) return { variable: "HGT / Glucosa", valor: `${valores.hgt} mg/dL`, accion: "Repetir HGT, revisar indicaciones y avisar a Enfermero." };
  return null;
}

function extractCamVitals(detalle) {
  const text = String(detalle || "");
  const pa = text.match(/PA\s+\d+\/(\d+)/i);
  return {
    temp: numberMatch(text, /Temp\s+([\d.]+)/i),
    spo2: numberMatch(text, /Sat\s+(\d+)/i),
    pad: pa ? Number(pa[1]) : null,
    hgt: numberMatch(text, /HGT\s+(\d+)/i)
  };
}

function numberMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function registroDespicheAsociadoAAlerta(registro) {
  if (!despicheHasNo(registro)) return false;
  return alertasDespicheConsecutivo().some((alerta) => alerta.residente === registro.residente);
}

function despicheHasNo(registro) {
  return [registro.diuresisResultado, registro.deposicionResultado, registro.despicheResultado]
    .some((value) => String(value || "").toLowerCase() === "no");
}

function alertaMismaFechaResidente(registro) {
  return ALERTAS.some((alerta) => alerta.residente === registro.residente && alerta.fecha === registro.fecha);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysBefore(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function parseRegistroDate(value) {
  const [datePart, timePart = "00:00"] = value.split(" ");
  const [hour, minute] = timePart.split(":").map(Number);
  const parts = datePart.split("-").map(Number);
  if (parts.length === 2) {
    const [day, month] = parts;
    return new Date(2026, month - 1, day, hour || 0, minute || 0);
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, hour || 0, minute || 0);
}

function parseDateInput(value, endOfDay = false) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function residentAlerts(resident) {
  const items = alertasAbiertas().filter((a) => a.residente === resident.nombre);
  return items.length ? items.map(alertaItem).join("") : `<div class="notice">Sin alertas abiertas para este residente.</div>`;
}

function renderMisRegistrosProfesional(view) {
  const roleLabel = ROLES[state.role].label;
  const rows = REGISTROS_PRO.filter((r) => r.rol === roleLabel);
  view.innerHTML = page(`Mis registros ${roleLabel}`, "Los registros propios pueden editarse solo durante 16 horas.") +
    registrosTable(rows, ["Fecha", "Residente", "Rol", "Registro"], "pro", "misRegistrosProfesional");
}

function renderFormularioNutri(view) {
  view.innerHTML = page("Registro nutricional", "Seleccione un residente activo. Edad, peso y sexo se autocompletan desde la ficha.", adminFormBackButton()) +
    `<div class="form-section">
      <div class="grid3">
        <div><label>Residente</label>${residentSelect("nutriResidente")}</div>
        <div><label>Fecha</label><input id="nutriFecha" type="date"></div>
        <div><label>Hora</label><input id="nutriHora" type="time"></div>
        <div><label>Edad</label><input id="nutriEdad" readonly></div>
        <div><label>Peso inicial</label><input id="nutriPeso" readonly></div>
        <div><label>Sexo</label><input id="nutriSexo" readonly></div>
        <div><label>Estatura</label><input id="nutriTalla" placeholder="Ej: 1,62"></div>
        <div><label>IMC</label><input id="nutriImc" placeholder="Ej: 22,4"></div>
        <div><label>Clasificacion CC</label><input id="nutriCc"></div>
        <div><label>Clasificacion CB</label><input id="nutriCb"></div>
        <div><label>Clasificacion PT</label><input id="nutriPt"></div>
        <div><label>Clasificacion CP</label><input id="nutriCp"></div>
      </div>
      <label>Observaciones o indicaciones nutricionales</label>
      <textarea id="nutriObs"></textarea>
    </div>
    <button class="btn primary" onclick="confirmNutri()">Guardar registro</button>`;
  bindNutriResident();
  bindNutriDateRules();
  bindDecimalCommaValidation(["nutriTalla", "nutriImc"]);
}

function bindNutriResident() {
  const update = () => {
    const r = RESIDENTES.find((resident) => resident.id === Number($("nutriResidente").value));
    $("nutriEdad").value = r.edad;
    $("nutriPeso").value = formatDecimalText(r.peso);
    $("nutriSexo").value = r.sexo;
  };
  $("nutriResidente").addEventListener("change", update);
  update();
}

function confirmNutri() {
  const resident = RESIDENTES.find((r) => r.id === Number($("nutriResidente").value));
  const dateError = validateNutriDate();
  if (dateError) {
    openModal("Fecha no permitida", dateError);
    return;
  }
  const decimalError = validateDecimalCommaFields([
    { id: "nutriTalla", label: "estatura" },
    { id: "nutriImc", label: "IMC" }
  ]);
  if (decimalError) {
    openModal("Separador decimal", decimalError);
    return;
  }
  openModal("Confirmar registro nutricional", `Esta seguro que desea agregar este registro nutricional al residente ${resident.nombre}?`, () => {
    REGISTROS_NUTRI.unshift({
      fecha: `${$("nutriFecha").value || "2026-06-14"} ${$("nutriHora").value || "12:00"}`,
      residente: resident.nombre,
      imc: $("nutriImc").value || "-",
      observacion: $("nutriObs").value || "Sin observaciones.",
      editable: true
    });
    state.view = "misRegistrosNutri";
    renderShell();
  });
}

function bindNutriDateRules() {
  const fecha = $("nutriFecha");
  const hora = $("nutriHora");
  if (!fecha) return;
  fecha.min = addDaysIso(new Date(), -7);
  fecha.max = todayIso();
  if (!fecha.value) fecha.value = todayIso();
  if (hora && !hora.value) hora.value = currentTimeInput();
}

function validateNutriDate() {
  const value = $("nutriFecha").value;
  const min = addDaysIso(new Date(), -7);
  const max = todayIso();
  if (!value) return "Debe seleccionar una fecha.";
  if (value < min || value > max) return "Nutricionista solo puede registrar desde hoy hasta 7 dias hacia atras, nunca fechas futuras.";
  return "";
}

function renderMisRegistrosNutri(view) {
  view.innerHTML = page("Mis registros nutricionales", "Los registros pueden editarse solo hasta 16 horas despues de su ingreso.") +
    registrosTable(REGISTROS_NUTRI, ["Fecha", "Residente", "IMC", "Observacion"], "nutri", "misRegistrosNutri");
}

function renderFormulariosAdmin(view) {
  view.innerHTML = page("Formularios", "Acceso administrativo a formularios por rol.") +
    `<div class="tabs">
      <button onclick="go('formularioCam')">CAM / Cuidadoras</button>
      <button onclick="go('formularioDt')">Directora Tecnica</button>
      <button onclick="go('formularioEnfermero')">Enfermero</button>
      <button onclick="go('formularioNutri')">Nutricionista</button>
    </div>
    <div class="card"><h2>Seleccione un formulario</h2><p>Desde aqui el administrador puede abrir cada formulario, revisar su estructura y simular el ingreso de registros.</p></div>`;
}

function adminFormBackButton() {
  if (!["administrador", "administrador_respaldo"].includes(state.role)) return "";
  return `<button class="btn ghost" onclick="go('formularios')">Volver a formularios</button>`;
}

function renderRegistrosUsuarios(view) {
  view.innerHTML = page("Registros usuarios", "Revision administrativa de registros ingresados por perfiles.") +
    registrosUsuariosExportPanel() +
    registrosUsuariosTable();
  bindRegistrosUsuariosExport();
}

function registrosUsuariosRows() {
  return [
    ...REGISTROS_CAM.map((row, index) => ({ source: "cam", index, row, origen: "CAM" })),
    ...REGISTROS_PRO.map((row, index) => ({ source: "pro", index, row, origen: row.rol || "Profesional" })),
    ...REGISTROS_NUTRI.map((row, index) => ({ source: "nutri", index, row, origen: "Nutricionista" }))
  ].sort((a, b) => parseRegistroDate(b.row.fecha) - parseRegistroDate(a.row.fecha));
}

function registrosUsuariosExportPanel() {
  return `<div class="card">
    <h2>Exportar registros</h2>
    <div class="grid3">
      <div><label>Alcance</label><select id="registrosExportMode">
        <option value="all" ${state.registrosExportMode === "all" ? "selected" : ""}>Todos los registros</option>
        <option value="range" ${state.registrosExportMode === "range" ? "selected" : ""}>Rango de fechas</option>
      </select></div>
      <div><label>Desde</label><input id="registrosExportFrom" type="date" value="${state.registrosExportFrom}"></div>
      <div><label>Hasta</label><input id="registrosExportTo" type="date" max="${todayIso()}" value="${state.registrosExportTo}"></div>
    </div>
    <div class="form-actions">
      <button class="btn primary" id="exportRegistrosExcel">Descargar Excel</button>
    </div>
  </div>`;
}

function registrosUsuariosTable() {
  const rows = registrosUsuariosRows();
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.registrosPage = Math.min(Math.max(1, state.registrosPage), totalPages);
  const pageRows = rows.slice((state.registrosPage - 1) * pageSize, state.registrosPage * pageSize);
  return `<div class="card table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Residente</th><th>Origen</th><th>Usuario</th><th>Cuidadora</th><th>Detalle</th><th>Estado</th><th>Accion</th></tr></thead>
    <tbody>${pageRows.map(({ source, index, row, origen }) => `<tr>
      <td>${row.fecha || ""}</td>
      <td>${row.residente || ""}</td>
      <td>${origen}</td>
      <td>${row.usuario || row.rol || "nutricion@hogarantu.cl"}</td>
      <td>${row.cuidadora || "-"}</td>
      <td>${recordChecklistDetail(row)}</td>
      <td>${row.editable ? '<span class="badge green">Editable</span>' : '<span class="badge red">Bloqueado</span>'}</td>
      <td>${adminRecordActionButtons(source, index, row)}</td>
    </tr>`).join("")}</tbody>
  </table>
  ${registrosPagination(totalPages)}
  </div>`;
}

function registrosPagination(totalPages) {
  return `<div class="pagination">
    <button class="btn secondary" ${state.registrosPage === 1 ? "disabled" : ""} onclick="setRegistrosPage(${state.registrosPage - 1})">Anterior</button>
    ${Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => `<button class="btn ${state.registrosPage === page ? "primary" : "secondary"}" onclick="setRegistrosPage(${page})">${page}</button>`).join("")}
    <button class="btn secondary" ${state.registrosPage === totalPages ? "disabled" : ""} onclick="setRegistrosPage(${state.registrosPage + 1})">Siguiente</button>
  </div>`;
}

function setRegistrosPage(page) {
  state.registrosPage = page;
  renderView();
}

function bindRegistrosUsuariosExport() {
  const mode = $("registrosExportMode");
  const from = $("registrosExportFrom");
  const to = $("registrosExportTo");
  const button = $("exportRegistrosExcel");
  if (!mode || !from || !to || !button) return;
  mode.addEventListener("change", () => {
    state.registrosExportMode = mode.value;
  });
  from.addEventListener("input", () => {
    state.registrosExportFrom = from.value;
  });
  to.addEventListener("input", () => {
    state.registrosExportTo = to.value;
  });
  button.addEventListener("click", () => exportRegistrosUsuariosExcel());
}

function exportRegistrosUsuariosExcel() {
  const rows = registrosUsuariosRows().filter(({ row }) => {
    if (state.registrosExportMode === "all") return true;
    const from = parseDateInput(state.registrosExportFrom);
    const to = parseDateInput(state.registrosExportTo, true);
    if (!from || !to || from > to) return false;
    const date = parseRegistroDate(row.fecha);
    return date >= from && date <= to;
  }).map(({ row, origen }) => ({
    fecha: row.fecha || "",
    residente: row.residente || "",
    origen,
    usuario: row.usuario || row.rol || "nutricion@hogarantu.cl",
    cuidadora: row.cuidadora || "",
    detalle: row.detalle || row.registro || row.observacion || "",
    estado: row.editable ? "Editable" : "Bloqueado"
  }));
  if (state.registrosExportMode === "range") {
    const from = parseDateInput(state.registrosExportFrom);
    const to = parseDateInput(state.registrosExportTo, true);
    if (!from || !to || from > to || to > new Date()) {
      openModal("Exportar registros", "Debe seleccionar un rango de fechas valido y sin fechas futuras.");
      return;
    }
  }
  const periodo = state.registrosExportMode === "all" ? "Todos" : `${state.registrosExportFrom} a ${state.registrosExportTo}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
    <h1>Registros de usuarios</h1>
    <p>Periodo: ${periodo}</p>
    ${excelTable("Registros usuarios", rows, [
      ["Fecha", "fecha"], ["Residente", "residente"], ["Origen", "origen"], ["Usuario", "usuario"], ["Cuidadora", "cuidadora"], ["Detalle", "detalle"], ["Estado", "estado"]
    ])}
  </body></html>`;
  downloadHtmlExcel(html, `registros_usuarios_${state.registrosExportMode === "all" ? "todos" : `${state.registrosExportFrom}_${state.registrosExportTo}`}.xls`);
}

function adminRecordActionButtons(source, index, row) {
  return `<div class="action-stack">
    <button class="btn ghost" onclick="startRecordView('${source}', ${index})">Ver</button>
    <button class="btn secondary" onclick="startRecordEdit('${source}', ${index})">Editar</button>
  </div>`;
}

function startRecordView(source, index, returnView = "registros") {
  renderRecordForm(source, index, returnView, false, true);
}

function startRecordEdit(source, index, returnView = "registros", requireEditable = false) {
  renderRecordForm(source, index, returnView, requireEditable, false);
}

function renderRecordForm(source, index, returnView = "registros", requireEditable = false, readOnly = false) {
  const row = recordArray(source)[index];
  if (requireEditable && !row.editable) {
    openModal("Registro bloqueado", "Este registro ya supero el periodo permitido de edicion.");
    return;
  }
  if (source === "cam") {
    state.editReturnView = returnView;
    renderFormularioCam($("view"), { row, index, returnView, readonly: readOnly });
    return;
  }
  if (source === "pro") {
    state.editReturnView = returnView;
    renderFormularioProfesional(row.rol || "Enfermero", { row, index, returnView, readonly: readOnly });
    return;
  }
  state.editReturnView = returnView;
  const detalle = row.detalle || row.registro || row.observacion || "";
  const lockAttr = readOnly ? "readonly" : "";
  const userReadonly = readOnly || (requireEditable && source === "pro") ? "readonly" : "";
  const title = readOnly ? "Ver registro de usuario" : "Editar registro de usuario";
  const help = readOnly ? "Vista de solo lectura del registro ingresado." : editRecordHelpText(requireEditable);
  const despicheFields = hasEditableDespicheView(source, row) ? editDespicheFields(row, readOnly) : "";
  const hasDespiche = source === "cam" || source === "pro";
  $("view").innerHTML = page(title, help) +
    `<div class="form-section">
      <div class="grid3">
        <div><label>Fecha</label><input id="editRegistroFecha" value="${row.fecha || ""}" ${lockAttr}></div>
        <div><label>Residente</label><input id="editRegistroResidente" value="${row.residente || ""}" readonly></div>
        <div><label>Usuario / rol</label><input id="editRegistroUsuario" value="${recordUserValue(row, source)}" ${userReadonly}></div>
        ${source === "cam" ? `<div><label>Cuidadora</label><input id="editRegistroCuidadora" value="${row.cuidadora || ""}" ${lockAttr}></div>` : ""}
      </div>
      ${hasDespiche ? despicheFields : ""}
      <label>Detalle del registro</label>
      <textarea id="editRegistroDetalle" ${readOnly ? "readonly" : ""}>${detalle}</textarea>
      <div class="form-actions">
        ${readOnly ? "" : `<button class="btn primary" onclick="saveRecordEdit('${source}', ${index})">Guardar cambios</button>`}
        <button class="btn ghost" onclick="go('${returnView}')">${readOnly ? "Volver" : "Cancelar"}</button>
      </div>
    </div>`;
}

function hasEditableDespicheView(source, row) {
  return source === "pro" || source === "cam" || recordHasDiuresis(row) || recordHasDeposicion(row);
}

function editDespicheFields(row, readOnly = false) {
  const text = row.detalle || row.registro || "";
  const diuresis = row.diuresisResultado || inferDespicheResultado(text, "Diuresis", row);
  const deposicion = row.deposicionResultado || inferDespicheResultado(text, "Deposición", row);
  const disabled = readOnly ? "disabled" : "";
  return `<div class="grid2">
    <div><label>Diuresis (orina)</label><select id="editDiuresisResultado" ${disabled}>
      <option ${diuresis === "Si" ? "selected" : ""}>Si</option>
      <option ${diuresis === "No" ? "selected" : ""}>No</option>
    </select></div>
    <div><label>Deposición (heces fecales)</label><select id="editDeposicionResultado" ${disabled}>
      <option ${deposicion === "Si" ? "selected" : ""}>Si</option>
      <option ${deposicion === "No" ? "selected" : ""}>No</option>
    </select></div>
  </div>`;
}

function inferDespicheTipo(text) {
  return /deposici[oó]n/i.test(String(text || "")) ? "Deposición" : "Diuresis";
}

function inferDespicheResultado(text, tipo = null, row = null) {
  const source = String(text || "");
  if (tipo === "Diuresis") {
    const match = source.match(/Diuresis:\s*(Si|No)/i);
    if (match) return normalizeSiNo(match[1]);
  }
  if (tipo === "Deposición") {
    const match = source.match(/Deposici[oó]n:\s*(Si|No)/i);
    if (match) return normalizeSiNo(match[1]);
  }
  if (row?.despicheTipo && row?.despicheResultado && (!tipo || row.despicheTipo === tipo)) {
    return normalizeSiNo(row.despicheResultado);
  }
  if (tipo) return "Si";
  const match = source.match(/(?:Diuresis|Deposici[oó]n):\s*(Si|No)/i);
  return match ? normalizeSiNo(match[1]) : "Si";
}

function normalizeSiNo(value) {
  return String(value || "").toLowerCase() === "no" ? "No" : "Si";
}

function recordUserValue(row, source) {
  if (row.usuario) return row.usuario;
  if (source === "pro") {
    return row.rol === "Enfermero" ? "enfermero@hogarantu.cl" : "dt@hogarantu.cl";
  }
  return row.rol || "nutricion@hogarantu.cl";
}

function editRecordHelpText(requireEditable) {
  return requireEditable
    ? "Puede corregir este registro porque aun se encuentra dentro del periodo permitido de edicion."
    : "Edicion administrativa para registros fuera del periodo normal de edicion.";
}

function saveRecordEdit(source, index) {
  openModal("Confirmar edicion", "Desea guardar los cambios de este registro?", () => {
    const row = recordArray(source)[index];
    row.fecha = $("editRegistroFecha").value;
    if (source === "cam") {
      row.usuario = $("editRegistroUsuario").value;
      row.cuidadora = $("editRegistroCuidadora").value;
      row.despicheTipo = "Diuresis / Deposición";
      row.diuresisResultado = $("editDiuresisResultado").value;
      row.deposicionResultado = $("editDeposicionResultado").value;
      row.despicheResultado = despicheHasNo(row) ? "No" : "Si";
      row.detalle = applyDespicheToText($("editRegistroDetalle").value, row.diuresisResultado, row.deposicionResultado);
    } else if (source === "pro") {
      row.usuario = $("editRegistroUsuario").value;
      row.despicheTipo = "Diuresis / Deposición";
      row.diuresisResultado = $("editDiuresisResultado").value;
      row.deposicionResultado = $("editDeposicionResultado").value;
      row.despicheResultado = despicheHasNo(row) ? "No" : "Si";
      row.registro = applyDespicheToText($("editRegistroDetalle").value, row.diuresisResultado, row.deposicionResultado);
    } else {
      row.observacion = $("editRegistroDetalle").value;
    }
    row.editable = true;
    state.view = state.editReturnView || "registros";
    renderShell();
  });
}

function applyDespicheToText(text, diuresisResultado, deposicionResultado) {
  const detail = String(text || "")
    .replace(/Diuresis:\s*(Si|No)\.?\s*/gi, "")
    .replace(/Deposici[oó]n:\s*(Si|No)\.?\s*/gi, "")
    .trim();
  const replacement = `Diuresis: ${diuresisResultado}. Deposición: ${deposicionResultado}.`;
  return `${detail}${detail ? " " : ""}${replacement}`;
}

function recordArray(source) {
  return { cam: REGISTROS_CAM, pro: REGISTROS_PRO, nutri: REGISTROS_NUTRI }[source];
}

function renderAlertas(view) {
  const adminTools = adminAlertExportPanel();
  view.innerHTML = page("Alertas / Alarmas", "Panel de alertas abiertas y cierre con comentario.") +
    `<div class="card">
      <h2>Alertas abiertas sin tratamiento</h2>
      ${alertasList(true)}
    </div>
    ${adminTools}
    ${closedAlertsPanel()}`;
  bindAlertExportControls();
}

function todasLasAlertas() {
  return [...ALERTAS, ...alertasSignosVitalesCam(), ...alertasCiclosInsuficientes(), ...alertasDespicheConsecutivo()];
}

function alertasAbiertas() {
  return todasLasAlertas().filter((a) => !a.cerrada && !state.closedAlertKeys.includes(alertKey(a)));
}

function alertasList(withActions = false) {
  const abiertas = alertasAbiertas();
  return abiertas.length ? abiertas.map((a) => alertaItem(a, withActions)).join("") : `<div class="notice">No hay alertas abiertas sin tratamiento.</div>`;
}

function alertaItem(a, withActions = false) {
  const key = alertKey(a);
  return `<div class="timeline">
    <b>${a.fecha} | ${a.variable} <span class="badge ${a.color}">${a.nivel}</span></b>
    <p><b>Residente:</b> ${a.residente}<br><b>Valor:</b> ${a.valor}<br><b>Accion sugerida:</b> ${a.accion}</p>
    ${withActions ? `<button class="btn danger" onclick="closeAlertWithComment('${escapeJs(key)}')">Cerrar alerta</button>` : ""}
  </div>`;
}

function alertKey(alerta) {
  return [alerta.fecha, alerta.residente, alerta.variable, alerta.valor].join("||");
}

function closeAlertWithComment(key) {
  const alerta = todasLasAlertas().find((item) => alertKey(item) === key);
  const label = alerta ? `${alerta.residente} (${alerta.variable}, ${alerta.fecha})` : "la alerta seleccionada";
  openPromptModal("Cerrar alerta", `Registrar comentario de cierre para ${label}.`, "Comentario de cierre, accion tomada o derivacion realizada", (comment) => {
    if (!comment.trim()) {
      openModal("Cerrar alerta", "Debe ingresar un comentario antes de cerrar la alerta.");
      return;
    }
    if (alerta) {
      alerta.cerrada = true;
      alerta.comentarioCierre = comment.trim();
      alerta.fechaCierre = "2026-06-15 10:30";
      alerta.cerradaPor = state.loggedUser || ROLES[state.role].user;
    }
    if (!state.closedAlertKeys.includes(key)) state.closedAlertKeys.push(key);
    if (alerta && !state.closedAlerts.some((item) => item.key === key)) {
      state.closedAlerts.unshift({
        key,
        fecha: alerta.fecha,
        residente: alerta.residente,
        variable: alerta.variable,
        valor: alerta.valor,
        nivel: alerta.nivel,
        comentario: comment.trim(),
        fechaCierre: "2026-06-15 10:30",
        cerradaPor: state.loggedUser || ROLES[state.role].user
      });
    }
    renderView();
    openModal("Alerta cerrada", "La alerta quedo registrada como tratada y salio del panel de alertas abiertas.");
  });
}

function closedAlertsPanel() {
  const canSeeClosed = ["administrador", "administrador_respaldo", "directora", "enfermero"].includes(state.role);
  if (!canSeeClosed) return "";
  const rows = closedAlertsForRole();
  const title = state.role === "administrador" || state.role === "administrador_respaldo"
    ? "Alertas cerradas - historial completo"
    : "Alertas cerradas - ultimos 5 dias";
  return `<div class="card table-wrap">
    <h2>${title}</h2>
    <table>
      <thead><tr><th>Fecha alerta</th><th>Residente</th><th>Alerta</th><th>Valor</th><th>Cerrada por</th><th>Fecha cierre</th><th>Comentario</th></tr></thead>
      <tbody>
        ${rows.length ? rows.map((alerta) => `<tr>
          <td>${alerta.fecha}</td>
          <td>${alerta.residente}</td>
          <td>${alerta.variable}</td>
          <td>${alerta.valor}</td>
          <td>${alerta.cerradaPor}</td>
          <td>${alerta.fechaCierre}</td>
          <td>${alerta.comentario}</td>
        </tr>`).join("") : `<tr><td colspan="7">Aun no hay alertas cerradas en esta sesion.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

function closedAlertsForRole() {
  if (state.role === "administrador" || state.role === "administrador_respaldo") {
    return state.closedAlerts;
  }
  const today = new Date(2026, 5, 15, 23, 59);
  const limit = daysBefore(today, 5);
  return state.closedAlerts.filter((alerta) => parseRegistroDate(alerta.fechaCierre) >= limit);
}

function adminAlertExportPanel() {
  const isAdmin = state.role === "administrador" || state.role === "administrador_respaldo";
  if (!isAdmin) return "";
  return `<div class="card">
    <h2>Exportar registro completo de alarmas</h2>
    <div class="grid3">
      <div><label>Desde</label><input id="alertExportFrom" type="date" max="2026-06-15" value="${state.alertExportFrom}"></div>
      <div><label>Hasta</label><input id="alertExportTo" type="date" max="2026-06-15" value="${state.alertExportTo}"></div>
      <div class="form-actions">
        <button class="btn primary" id="exportAlertsExcel">Descargar Excel</button>
      </div>
    </div>
    <div class="notice">Exporta alertas abiertas y cerradas dentro del periodo seleccionado. El calendario queda limitado a fechas pasadas o actuales.</div>
  </div>`;
}

function bindAlertExportControls() {
  const from = $("alertExportFrom");
  const to = $("alertExportTo");
  const button = $("exportAlertsExcel");
  if (!from || !to || !button) return;
  from.addEventListener("input", () => {
    state.alertExportFrom = from.value;
  });
  to.addEventListener("input", () => {
    state.alertExportTo = to.value;
  });
  button.addEventListener("click", () => exportAlertsExcel());
}

function exportAlertsExcel() {
  const today = new Date(2026, 5, 15, 23, 59);
  const from = parseDateInput(state.alertExportFrom);
  const to = parseDateInput(state.alertExportTo, true);
  if (!from || !to || from > to) {
    openModal("Exportar alarmas", "Debe seleccionar un rango de fechas valido.");
    return;
  }
  if (from > today || to > today) {
    openModal("Exportar alarmas", "El rango no puede contener fechas futuras.");
    return;
  }
  const rows = alertasExportables().filter((alerta) => {
    const fecha = parseRegistroDate(alerta.fecha);
    return fecha >= from && fecha <= to;
  });
  const html = `<!doctype html>
    <html><head><meta charset="utf-8">
    <style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #b8c6c8;padding:6px;vertical-align:top}th{background:#e7eeee}</style>
    </head><body>
      <h1>Registro completo de alarmas</h1>
      <p>Periodo: ${state.alertExportFrom} a ${state.alertExportTo}</p>
      ${excelTable("Alarmas abiertas y cerradas", rows, [
        ["Estado", "estado"], ["Fecha alerta", "fecha"], ["Residente", "residente"], ["Alerta", "variable"], ["Valor", "valor"], ["Nivel", "nivel"], ["Accion sugerida", "accion"], ["Cerrada por", "cerradaPor"], ["Fecha cierre", "fechaCierre"], ["Comentario cierre", "comentario"]
      ])}
    </body></html>`;
  downloadHtmlExcel(html, `alertas_${state.alertExportFrom}_${state.alertExportTo}.xls`);
}

function alertasExportables() {
  const abiertas = alertasAbiertas().map((alerta) => ({
    estado: "Abierta",
    fecha: alerta.fecha,
    residente: alerta.residente,
    variable: alerta.variable,
    valor: alerta.valor,
    nivel: alerta.nivel,
    accion: alerta.accion,
    cerradaPor: "",
    fechaCierre: "",
    comentario: ""
  }));
  const cerradas = state.closedAlerts.map((alerta) => ({
    estado: "Cerrada",
    fecha: alerta.fecha,
    residente: alerta.residente,
    variable: alerta.variable,
    valor: alerta.valor,
    nivel: alerta.nivel,
    accion: "",
    cerradaPor: alerta.cerradaPor,
    fechaCierre: alerta.fechaCierre,
    comentario: alerta.comentario
  }));
  return [...abiertas, ...cerradas].sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
}

function alertasCiclosInsuficientes() {
  const minimo = Number(typeof CONTROL_MINIMO_DIARIO !== "undefined" ? CONTROL_MINIMO_DIARIO : 2);
  const porResidenteDia = new Map();
  REGISTROS_CAM
    .filter((registro) => String(registro.tipo || "").toLowerCase().includes("control de ciclos"))
    .forEach((registro) => {
      const fecha = parseRegistroDate(registro.fecha);
      const dia = isoDate(fecha);
      const key = `${registro.residente}||${dia}`;
      porResidenteDia.set(key, (porResidenteDia.get(key) || 0) + 1);
    });

  const today = new Date(2026, 5, 14, 23, 59);
  const todayKey = isoDate(today);
  const alertas = [];
  RESIDENTES.forEach((resident) => {
    CONTROL_DIAS.forEach((dayOffset) => {
      const fechaControl = new Date(2026, 4, 16 + dayOffset);
      const diaControl = isoDate(fechaControl);
      if (diaControl >= todayKey) return;
      const total = porResidenteDia.get(`${resident.nombre}||${diaControl}`) || 0;
      if (total < minimo) {
        const fechaAlerta = new Date(fechaControl);
        fechaAlerta.setDate(fechaAlerta.getDate() + 1);
        alertas.push({
          fecha: `${isoDate(fechaAlerta)} 08:00`,
          residente: resident.nombre,
          variable: "Incumplimiento de Ciclos",
          valor: `${total} control${total === 1 ? "" : "es"} registrado${total === 1 ? "" : "s"}`,
          nivel: "Alerta",
          color: "yellow",
          accion: `Registrar tratamiento. Minimo requerido: ${minimo} controles de ciclos diarios.`
        });
      }
    });
  });
  return alertas;
}

function alertasSignosVitalesCam() {
  return REGISTROS_CAM
    .filter((registro) => String(registro.tipo || "").toLowerCase().includes("control de ciclos"))
    .map((registro) => {
      const alerta = camRegistroFueraDeRangoCritico(registro);
      if (!alerta) return null;
      return {
        fecha: registro.fecha,
        residente: registro.residente,
        variable: alerta.variable,
        valor: alerta.valor,
        nivel: "Alerta",
        color: alerta.variable === "Saturacion" ? "red" : "yellow",
        accion: alerta.accion
      };
    })
    .filter(Boolean);
}

function alertasDespicheConsecutivo() {
  const alertas = [];
  RESIDENTES.forEach((resident) => {
    const registros = registrosDespiche()
      .filter((registro) => registro.residente === resident.nombre)
      .filter((registro) => registro.despicheResultado || registro.diuresisResultado || registro.deposicionResultado)
      .sort((a, b) => parseRegistroDate(a.fecha) - parseRegistroDate(b.fecha));
    let streak = 0;
    registros.forEach((registro) => {
      if (despicheHasNo(registro)) {
        streak += 1;
      } else {
        streak = 0;
      }
      if (streak === 3) {
        alertas.push({
          fecha: registro.fecha,
          residente: resident.nombre,
          variable: "Residente sin Despiche en 3 Ciclos Seguidos",
          valor: "3 registros consecutivos con No",
          nivel: "Alerta",
          color: "yellow",
          accion: "Evaluar hidratacion, eliminacion y avisar a Enfermero o Directora Tecnica para seguimiento."
        });
      }
    });
  });
  return alertas;
}

function registrosDespiche() {
  return [
    ...REGISTROS_CAM.map((registro) => ({ ...registro, origenDespiche: "CAM" })),
    ...REGISTROS_PRO.map((registro) => ({ ...registro, origenDespiche: registro.rol || "Profesional" }))
  ];
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso() {
  return isoDate(new Date());
}

function addDaysIso(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return isoDate(copy);
}

function currentTimeInput() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function renderRangos(view) {
  view.innerHTML = page("Rangos de alerta", "Configuracion de valores normales, alerta y criticos.") +
    `<div class="grid2">
      ${rangoCard("Temperatura", "36,0", "37,5", "C")}
      ${rangoCard("Saturacion", "95", "100", "%")}
      ${rangoCard("Presion diastolica", "60", "89", "mmHg")}
      ${rangoCard("HGT / Glucosa", "70", "180", "mg/dL")}
    </div>
    <button class="btn primary" onclick="saveRangos()">Guardar nuevos rangos</button>`;
  bindDecimalCommaValidation([...document.querySelectorAll(".rango-decimal")].map((input) => input.id));
}

function rangoCard(nombre, min, max, unidad) {
  const key = normalizeSearch(nombre).replace(/\s+/g, "-").replace(/\//g, "-");
  return `<div class="form-section">
    <h2>${nombre}</h2>
    <div class="grid3">
      <div><label>Normal inferior</label><input id="rango-${key}-min" class="rango-decimal" value="${min}"></div>
      <div><label>Normal superior</label><input id="rango-${key}-max" class="rango-decimal" value="${max}"></div>
      <div><label>Unidad</label><input value="${unidad}" readonly></div>
    </div>
    <label>Accion recomendada</label>
    <textarea>Informar a Enfermero y repetir medicion si corresponde.</textarea>
  </div>`;
}

function saveRangos() {
  const fields = [...document.querySelectorAll(".rango-decimal")].map((input) => ({ id: input.id, label: input.closest(".form-section")?.querySelector("h2")?.textContent || "rango" }));
  const decimalError = validateDecimalCommaFields(fields);
  if (decimalError) {
    openModal("Separador decimal", decimalError);
    return;
  }
  openModal("Rangos", "Rangos actualizados en la maqueta.");
}

function renderUsuarios(view) {
  view.innerHTML = page("Usuarios y roles", "Usuarios iniciales detectados desde Excel y permisos propuestos.") +
    `<div class="toolbar">
      <button class="btn primary" onclick="showUserForm()">Agregar usuario</button>
    </div>
    <div id="userFormHost"></div>
    <div class="card table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
      <tbody>
        ${DEMO_USERS.map((user, index) => {
          const role = ROLES[user.role];
          return `<tr>
            <td>${role?.label || "Usuario"}</td>
            <td>${user.email}</td>
            <td>${role?.label || user.role}</td>
            <td>
              <div class="toolbar compact-actions">
                <button class="btn secondary" onclick="showUserForm(${index})">Editar</button>
                <button class="btn ghost" onclick="resetUserPassword(${index})">Resetear clave</button>
                <button class="btn danger" onclick="deleteUser(${index})">Eliminar</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;
}

function showUserForm(index = null) {
  const user = Number.isInteger(index) ? DEMO_USERS[index] : null;
  $("userFormHost").innerHTML = `<div class="form-section">
    <h2>${user ? "Editar usuario" : "Agregar usuario"}</h2>
    <div class="grid3">
      <div><label>Email</label><input id="userEmail" type="email" value="${user?.email || ""}"></div>
      <div><label>Rol</label><select id="userRole">
        ${Object.entries(ROLES).map(([key, role]) => `<option value="${key}" ${user?.role === key ? "selected" : ""}>${role.label}</option>`).join("")}
      </select></div>
      <div><label>Clave temporal</label><input id="userPassword" value="${DEMO_PASSWORD}" readonly></div>
    </div>
    <div class="form-actions">
      <button class="btn primary" onclick="saveUser(${Number.isInteger(index) ? index : "null"})">${user ? "Guardar usuario" : "Crear usuario"}</button>
      <button class="btn ghost" onclick="$('userFormHost').innerHTML = ''">Cancelar</button>
    </div>
  </div>`;
}

function saveUser(index) {
  const email = $("userEmail").value.trim().toLowerCase();
  const role = $("userRole").value;
  if (!isValidEmail(email)) {
    openModal("Usuario", "Debe ingresar un correo valido.");
    return;
  }
  openModal("Confirmar usuario", index === null ? "Desea crear este usuario?" : "Desea guardar los cambios de este usuario?", () => {
    if (index === null) {
      DEMO_USERS.push({ email, role });
    } else {
      DEMO_USERS[index] = { email, role };
    }
    renderView();
  });
}

function resetUserPassword(index) {
  const user = DEMO_USERS[index];
  openModal("Resetear clave", `Se enviaria una clave temporal al usuario ${user.email}. Para la maqueta la clave vuelve a ser ${DEMO_PASSWORD}.`);
}

function deleteUser(index) {
  const user = DEMO_USERS[index];
  openModal("Eliminar usuario", `Desea eliminar el usuario ${user.email}?`, () => {
    DEMO_USERS.splice(index, 1);
    renderView();
  });
}

function renderPdf(view) {
  const resident = RESIDENTES.find((r) => r.id === Number(state.pdfResidentId)) || RESIDENTES[0];
  const period = Number(state.pdfPeriodDays);
  if (!state.pdfEmail) state.pdfEmail = resident.mail || "";
  const emailValid = isValidEmail(state.pdfEmail);
  const ready = Boolean(resident && period);
  view.innerHTML = page("Reportes PDF", "Seleccione residente y periodo para habilitar la creacion del reporte.") +
    `<div class="card">
      <h2>Parametros del reporte</h2>
      <div class="grid3">
        <div>
          <label>Residente</label>
          ${residentSelect("pdfResidente")}
        </div>
        <div>
          <label>Periodo a reportar</label>
          <div class="period-selector">
            ${[7, 15, 21, 28].map((days) => `<button class="btn ${period === days ? "primary" : "secondary"} pdf-period" data-days="${days}">${days} dias</button>`).join("")}
          </div>
        </div>
        <div>
          <label>Enviar a email</label>
          <input id="pdfEmail" type="email" value="${state.pdfEmail}" placeholder="correo@dominio.cl">
        </div>
        <div class="form-actions">
          <button class="btn primary" id="pdfGenerate" ${ready ? "" : "disabled"}>Crear reporte PDF</button>
          <button class="btn secondary" id="pdfSendMail" ${ready && emailValid ? "" : "disabled"}>Enviar por mail</button>
        </div>
      </div>
      <div class="${ready ? "success" : "notice"}">
        ${ready ? `Reporte listo para generar: ${resident.nombre}, ultimos ${period} dias. Email destino: ${state.pdfEmail || "sin correo"}.` : "Seleccione un periodo de 7, 15, 21 o 28 dias para habilitar la creacion del PDF."}
      </div>
    </div>
    ${ready ? pdfPreview(resident, period) : `<div class="card"><h2>Vista previa</h2><p>La vista previa aparecera cuando seleccione residente y periodo.</p></div>`}
    ${ready ? pdfAlertsPreview(resident, period) : ""}
    ${state.pdfGenerated ? generatedPdfSection() : ""}`;
  $("pdfResidente").value = String(resident.id);
  attachPdfControls();
}

function attachPdfControls() {
  const select = $("pdfResidente");
  const generate = $("pdfGenerate");
  const email = $("pdfEmail");
  const sendMail = $("pdfSendMail");
  if (select) {
    select.addEventListener("change", () => {
      state.pdfResidentId = Number(select.value);
      const resident = RESIDENTES.find((r) => r.id === Number(state.pdfResidentId)) || RESIDENTES[0];
      state.pdfEmail = resident.mail || "";
      state.pdfGenerated = false;
      renderView();
    });
  }
  if (email) {
    email.addEventListener("input", () => {
      state.pdfEmail = email.value.trim();
      if (sendMail) sendMail.disabled = !(Number(state.pdfPeriodDays) && isValidEmail(state.pdfEmail));
    });
  }
  document.querySelectorAll(".pdf-period").forEach((button) => {
    button.addEventListener("click", () => {
      state.pdfPeriodDays = Number(button.dataset.days);
      state.pdfGenerated = false;
      renderView();
    });
  });
  if (generate) {
    generate.addEventListener("click", () => {
      const resident = RESIDENTES.find((r) => r.id === Number(state.pdfResidentId)) || RESIDENTES[0];
      generatePdfReport(resident, Number(state.pdfPeriodDays));
    });
  }
  if (sendMail) {
    sendMail.addEventListener("click", () => {
      const resident = RESIDENTES.find((r) => r.id === Number(state.pdfResidentId)) || RESIDENTES[0];
      sendPdfByEmail(resident, Number(state.pdfPeriodDays), state.pdfEmail);
    });
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function reportPersonalData(resident) {
  return `<div class="report-section report-personal-section">
    <h2>Datos Personales</h2>
    <div class="grid3 report-personal-data">
      ${field("Nombre", resident.nombre)}
      ${field("RUT", resident.rut)}
      ${field("Edad", resident.edad)}
      ${field("Sexo", resident.sexo)}
      ${field("Fecha ingreso", resident.ingreso)}
      ${field("Peso inicial", resident.peso)}
      ${field("Patologias ingreso", resident.patologias)}
      ${field("Apoderado", resident.apoderado)}
      ${field("Mail apoderado", resident.mail)}
      ${field("Telefono apoderado", resident.telefonoApoderado)}
      ${field("Contacto SOS", resident.contactoSos)}
      ${field("Servicio urgencia", resident.urgencia)}
    </div>
  </div>`;
}

function reportBrandHeader() {
  return `<div class="report-brand">
    <div class="report-brand-mark">
      <img src="./assets/antu-logo.png" alt="Hogar Antu">
      <span>www.hogarantu.cl</span>
    </div>
  </div>`;
}

function reportBitacoraLastFive(resident, limit = null) {
  const data = reportData(resident, Number(state.pdfPeriodDays || state.pdfGeneratedDays || 15));
  const entries = Number(limit) ? data.entries.slice(0, limit) : data.entries;
  return `<div class="report-section">
    <h2>Bitácora Ejecutiva Del Período</h2>
    <div class="notice">Incluye registros DT, Enfermero y Nutricionista. De cuidadoras solo considera medicamentos o registros asociados a alertas.</div>
    ${entries.map((entry) => `<div class="timeline ${entry.clase}">
      <b>${entry.fecha} | ${entry.tipo}</b>
      <p>${entry.detalle}</p>
    </div>`).join("") || `<div class="notice">Sin registros ejecutivos en el período.</div>`}
  </div>`;
}

function reportMedicationTable(rows, limit = null) {
  const medicamentos = Number(limit) ? rows.slice(0, limit) : rows;
  return `<div class="report-section">
    <h2>Control De Medicamentos</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Responsable</th><th>Remedio</th></tr></thead>
        <tbody>${medicamentos.map((row) => `<tr>
          <td>${medicamentoDia(row)}</td>
          <td>${medicamentoHora(row)}</td>
          <td>${row.usuario || row.rol || usuarioCamPorTurno(row.turno)}</td>
          <td>${row.cuidadora || row.rol || "-"}</td>
          <td>${row.medicamento || inferMedicamento(row.detalle || row.registro)}</td>
        </tr>`).join("") || `<tr><td colspan="5">Sin medicamentos registrados en el periodo.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}

function reportAlertsTable(rows, limit = null) {
  const alertas = Number(limit) ? rows.slice(0, limit) : rows;
  return `<div class="report-section">
    <h2>Alertas Del Período</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Alerta</th><th>Valor</th><th>Nivel</th><th>Estado</th><th>Acción sugerida / cierre</th></tr></thead>
        <tbody>${alertas.map((alerta) => `<tr>
          <td>${alerta.fecha}</td>
          <td>${alerta.variable}</td>
          <td>${formatDecimalText(alerta.valor)}</td>
          <td>${alerta.nivel}</td>
          <td>${alerta.estado}</td>
          <td>${alerta.comentario ? `<b>Cierre:</b> ${alerta.comentario}` : alerta.accion}</td>
        </tr>`).join("") || `<tr><td colspan="6">Sin alertas registradas para este residente en el período.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}

function pdfPreview(resident, days) {
  const data = reportData(resident, days);
  return `<div class="card report-preview">
    ${reportBrandHeader()}
    <h2>Vista Previa Reporte</h2>
    <div class="grid3">
      ${field("Residente", resident.nombre)}
      ${field("Periodo", `Ultimos ${days} dias`)}
      ${field("Fecha emision", "2026-06-15")}
    </div>
    ${metrics([
      { value: data.cam.length, label: "Registros CAM" },
      { value: data.pro.length, label: "Registros DT/Enfermero" },
      { value: data.nutri.length, label: "Registros Nutricion" },
      { value: data.medicamentos.length, label: "Medicamentos" }
    ])}
    ${reportPersonalData(resident)}
    ${reportBitacoraLastFive(resident, 10)}
    ${reportCharts(data.controles, days)}
    ${pesoMensualCard(resident)}
    ${reportMedicationTable(data.medicamentos, 8)}
  </div>`;
}

function pdfAlertsPreview(resident, days) {
  const data = reportData(resident, days);
  return `<div class="card report-alerts-preview">
    ${reportAlertsTable(data.alertas, 8)}
  </div>`;
}

function reportData(resident, days) {
  const today = new Date(2026, 5, 14, 23, 59);
  const start = daysBefore(today, days);
  const inPeriod = (row) => parseRegistroDate(row.fecha) >= start && parseRegistroDate(row.fecha) <= today;
  const cam = REGISTROS_CAM.filter((row) => row.residente === resident.nombre && inPeriod(row));
  const camEjecutivo = cam.filter((row) => camRegistroEjecutivo(row));
  const pro = REGISTROS_PRO.filter((row) => row.residente === resident.nombre && inPeriod(row));
  const nutri = REGISTROS_NUTRI.filter((row) => row.residente === resident.nombre && inPeriod(row));
  const controles = CONTROLES_CICLOS
    .filter((row) => row.residente === resident.nombre && inPeriod(row))
    .sort((a, b) => parseRegistroDate(a.fecha) - parseRegistroDate(b.fecha));
  const medicamentos = [...cam, ...pro]
    .filter((row) => recordHasMedication(row))
    .sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  const alertas = reportAlertsForResident(resident, start, today);
  const entries = [
    ...camEjecutivo.map((registro) => ({
      fecha: registro.fecha,
      date: parseRegistroDate(registro.fecha),
      tipo: `CAM / ${displayRegistroTipo(registro.tipo)}`,
      detalle: formatDecimalText(`<b>Usuario:</b> ${registro.usuario || usuarioCamPorTurno(registro.turno)}. <b>Cuidadora:</b> ${registro.cuidadora}. ${camDisplayDetail(registro)}`),
      clase: "timeline-cam"
    })),
    ...pro.map((registro) => ({
      fecha: registro.fecha,
      date: parseRegistroDate(registro.fecha),
      tipo: registro.rol,
      detalle: formatDecimalText(registro.registro),
      clase: registro.rol === "Enfermero" ? "timeline-enfermero" : "timeline-dt"
    })),
    ...nutri.map((registro) => ({
      fecha: registro.fecha,
      date: parseRegistroDate(registro.fecha),
      tipo: "Nutricionista",
      detalle: formatDecimalText(`<b>IMC:</b> ${registro.imc}. ${registro.observacion}`),
      clase: "timeline-nutri"
    }))
  ].sort((a, b) => b.date - a.date);
  return { cam, camEjecutivo, pro, nutri, controles, medicamentos, alertas, entries };
}

function reportAlertsForResident(resident, start, end) {
  return alertasExportables()
    .filter((alerta) => alerta.residente === resident.nombre)
    .filter((alerta) => {
      const date = parseRegistroDate(alerta.fecha);
      return date >= start && date <= end;
    })
    .sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
}

function generatePdfReport(resident, days) {
  state.pdfGenerated = true;
  state.pdfGeneratedResidentId = resident.id;
  state.pdfGeneratedDays = days;
  renderView();
  setTimeout(() => {
    const report = $("generatedPdfReport");
    if (report) report.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function generatedPdfSection() {
  const resident = RESIDENTES.find((r) => r.id === Number(state.pdfGeneratedResidentId)) || RESIDENTES[0];
  const days = Number(state.pdfGeneratedDays || state.pdfPeriodDays);
  const data = reportData(resident, days);
  return `<div class="card generated-report" id="generatedPdfReport">
    <div class="report-actions no-print">
      <h2>Reporte PDF creado</h2>
      <button class="btn primary" onclick="printGeneratedPdf()">Guardar / imprimir PDF</button>
    </div>
    <div class="print-report">
      ${reportBrandHeader()}
      <h1>Reporte Residente</h1>
      <p class="report-meta">Ultimos ${days} dias | Emision 2026-06-17</p>
      ${reportPersonalData(resident)}
      ${reportBitacoraLastFive(resident)}
      ${reportCharts(data.controles, days)}
      ${pesoMensualCard(resident)}
      ${reportMedicationTable(data.medicamentos)}
      ${reportAlertsTable(data.alertas)}
    </div>
  </div>`;
}

function printGeneratedPdf() {
  window.print();
}

async function sendPdfByEmail(resident, days, email) {
  if (!isValidEmail(email)) {
    openModal("Enviar reporte", "Debe ingresar un correo valido antes de enviar el reporte.");
    return;
  }
  const data = reportData(resident, days);
  openModal("Enviar reporte por mail", `Enviando reporte de ${resident.nombre} a ${email}...`);
  try {
    const response = await fetch("/api/reportes/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        residentName: resident.nombre,
        days,
        html: reportEmailHtml(resident, days, data)
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "No fue posible enviar el correo.");
    }
    openModal("Reporte enviado", `Correo enviado a ${email}. ID de prueba: ${result.messageId || "sin ID"}.`);
  } catch (error) {
    openModal("Enviar reporte", `No se pudo enviar el correo real. Revise la configuracion SMTP del backend. Detalle: ${error.message}`);
  }
}

function reportEmailHtml(resident, days, data) {
  return `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #273236; }
        h1 { color: #0f6f72; }
        h2 { margin-top: 24px; color: #0f6f72; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; }
        th, td { border: 1px solid #c8d4d6; padding: 7px; text-align: left; vertical-align: top; }
        th { background: #e7eeee; }
        .item { border-left: 4px solid #188f8f; padding: 8px 12px; margin: 8px 0; background: #f7fbfb; }
      </style>
    </head>
    <body>
      <h1>Reporte Residente - Hogar Antu</h1>
      <p><b>Período solicitado:</b> últimos ${days} días<br><b>Emisión:</b> 2026-06-17</p>
      <h2>Datos Personales</h2>
      <table>
        <tr><th>RUT</th><td>${escapeHtml(resident.rut)}</td><th>Edad</th><td>${escapeHtml(resident.edad)}</td></tr>
        <tr><th>Sexo</th><td>${escapeHtml(resident.sexo)}</td><th>Ingreso</th><td>${escapeHtml(resident.ingreso)}</td></tr>
        <tr><th>Apoderado</th><td>${escapeHtml(resident.apoderado)}</td><th>Mail</th><td>${escapeHtml(resident.mail)}</td></tr>
        <tr><th>Patologias</th><td colspan="3">${escapeHtml(resident.patologias)}</td></tr>
      </table>
      <h2>Bitácora Ejecutiva Del Período</h2>
      ${data.entries.slice(0, 12).map((entry) => `<div class="item"><b>${escapeHtml(entry.fecha)} | ${escapeHtml(entry.tipo)}</b><br>${entry.detalle}</div>`).join("") || "<p>Sin registros ejecutivos en el período.</p>"}
      <h2>Resumen Del Período</h2>
      <table>
        <tr><th>Registros CAM</th><td>${data.cam.length}</td></tr>
        <tr><th>Registros DT/Enfermero</th><td>${data.pro.length}</td></tr>
        <tr><th>Registros Nutrición</th><td>${data.nutri.length}</td></tr>
        <tr><th>Medicamentos</th><td>${data.medicamentos.length}</td></tr>
      </table>
      <h2>Control De Medicamentos</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Responsable</th><th>Remedio</th></tr></thead>
        <tbody>${data.medicamentos.slice(0, 20).map((row) => `<tr><td>${escapeHtml(medicamentoDia(row))}</td><td>${escapeHtml(medicamentoHora(row))}</td><td>${escapeHtml(row.usuario || usuarioCamPorTurno(row.turno))}</td><td>${escapeHtml(row.cuidadora || row.rol || "-")}</td><td>${escapeHtml(row.medicamento || inferMedicamento(row.detalle || row.registro))}</td></tr>`).join("") || `<tr><td colspan="5">Sin medicamentos registrados.</td></tr>`}</tbody>
      </table>
      <h2>Alertas Del Período</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Alerta</th><th>Valor</th><th>Nivel</th><th>Estado</th><th>Acción sugerida / cierre</th></tr></thead>
        <tbody>${data.alertas.slice(0, 20).map((alerta) => `<tr><td>${escapeHtml(alerta.fecha)}</td><td>${escapeHtml(alerta.variable)}</td><td>${escapeHtml(formatDecimalText(alerta.valor))}</td><td>${escapeHtml(alerta.nivel)}</td><td>${escapeHtml(alerta.estado)}</td><td>${escapeHtml(alerta.comentario ? `Cierre: ${alerta.comentario}` : alerta.accion)}</td></tr>`).join("") || `<tr><td colspan="6">Sin alertas registradas en el período.</td></tr>`}</tbody>
      </table>
      <p>Prueba rapida: el producto final enviara este contenido como PDF adjunto.</p>
    </body>
    </html>`;
}

function renderPowerBi(view) {
  const days = Number(state.powerBiDays);
  const ready = Boolean(days);
  const data = ready ? powerBiExportData(days) : null;
  view.innerHTML = page("Power BI", "Extraccion completa de registros para analisis manual en Excel.") +
    `<div class="card">
      <h2>Exportar registros</h2>
      <div class="grid2">
        <div>
          <label>Periodo a extraer</label>
          <div class="period-selector">
            ${[15, 30, 45, 60, 75, 90].map((period) => `<button class="btn ${days === period ? "primary" : "secondary"} powerbi-period" data-days="${period}">${period} dias</button>`).join("")}
          </div>
        </div>
        <div class="form-actions">
          <button class="btn primary" id="powerBiExport" ${ready ? "" : "disabled"}>Descargar Excel</button>
        </div>
      </div>
      <div class="${ready ? "success" : "notice"}">
        ${ready ? `Listo para descargar todos los registros de los ultimos ${days} dias.` : "Seleccione 15, 30, 45, 60, 75 o 90 dias para habilitar la descarga."}
      </div>
    </div>
    ${ready ? powerBiPreview(data, days) : `<div class="card"><h2>Resumen exportable</h2><p>El resumen aparecera cuando seleccione un periodo.</p></div>`}`;
  attachPowerBiControls();
}

function attachPowerBiControls() {
  document.querySelectorAll(".powerbi-period").forEach((button) => {
    button.addEventListener("click", () => {
      state.powerBiDays = Number(button.dataset.days);
      renderView();
    });
  });
  const exportButton = $("powerBiExport");
  if (exportButton) {
    exportButton.addEventListener("click", () => downloadPowerBiExcel(Number(state.powerBiDays)));
  }
}

function powerBiPreview(data, days) {
  return `<div class="card">
    <h2>Resumen exportable</h2>
    ${metrics([
      { value: RESIDENTES.length, label: "Residentes" },
      { value: data.controles.length, label: "Controles ciclos" },
      { value: data.cam.length, label: "Registros CAM" },
      { value: data.medicamentos.length, label: "Medicamentos" }
    ])}
    ${metrics([
      { value: data.profesionales.length, label: "DT / Enfermero" },
      { value: data.nutricion.length, label: "Nutricion" },
      { value: data.peso.length, label: "Peso mensual" },
      { value: data.alertas.length, label: "Alertas" }
    ])}
    <div class="notice">El archivo Excel incluira secciones/tablas para residentes, controles, CAM, medicamentos, profesionales, nutricion, peso y alertas de los ultimos ${days} dias.</div>
  </div>`;
}

function powerBiExportData(days) {
  const today = new Date(2026, 5, 14, 23, 59);
  const start = daysBefore(today, days);
  const inPeriod = (row) => parseAnyDate(row.fecha || row.fecha_control) >= start && parseAnyDate(row.fecha || row.fecha_control) <= today;
  const cam = REGISTROS_CAM.filter(inPeriod).sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  const controles = CONTROLES_CICLOS.filter(inPeriod).sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  const profesionales = REGISTROS_PRO.filter(inPeriod).sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  const nutricion = REGISTROS_NUTRI.filter(inPeriod).sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  const medicamentos = [...cam, ...profesionales].filter((row) => recordHasMedication(row));
  const peso = CONTROLES_PESO.filter(inPeriod).sort((a, b) => parseAnyDate(b.fecha) - parseAnyDate(a.fecha));
  const alertas = todasLasAlertas().filter(inPeriod).sort((a, b) => parseRegistroDate(b.fecha) - parseRegistroDate(a.fecha));
  return { cam, controles, profesionales, nutricion, medicamentos, peso, alertas };
}

function downloadPowerBiExcel(days) {
  const data = powerBiExportData(days);
  const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #0f6f72; }
        h2 { margin-top: 24px; color: #273236; }
        table { border-collapse: collapse; margin-bottom: 20px; width: 100%; }
        th, td { border: 1px solid #b8c6c8; padding: 6px; vertical-align: top; }
        th { background: #e7eeee; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Exportacion Power BI / Excel</h1>
      <p>Periodo: ultimos ${days} dias. Generado desde maqueta local.</p>
      ${excelTable("Residentes", RESIDENTES, [
        ["ID", "id"], ["Nombre", "nombre"], ["RUT", "rut"], ["Sexo", "sexo"], ["Edad", "edad"], ["Estado", "estado"], ["Apoderado", "apoderado"], ["Mail apoderado", "mail"]
      ])}
      ${excelTable("Controles ciclos", data.controles, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Temperatura", "temp"], ["Saturacion", "spo2"], ["Presion diastolica", "pad"], ["HGT", "hgt"]
      ])}
      ${excelTable("Registros CAM", data.cam, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Usuario", "usuario"], ["Turno", "turno"], ["Cuidadora", "cuidadora"], ["Tipo", "tipo"], ["Detalle", "detalle"]
      ])}
      ${excelTable("Medicamentos", data.medicamentos, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Usuario", "usuario"], ["Cuidadora", (row) => row.cuidadora || row.rol || "-"], ["Medicamento", (row) => row.medicamento || inferMedicamento(row.detalle || row.registro)], ["Detalle", (row) => row.detalle || row.registro || ""]
      ])}
      ${excelTable("DT Enfermero", data.profesionales, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Rol", "rol"], ["Registro", "registro"]
      ])}
      ${excelTable("Nutricion", data.nutricion, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["IMC", "imc"], ["Observacion", "observacion"]
      ])}
      ${excelTable("Peso mensual", data.peso, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Peso", "peso"], ["Regimen", "regimen"]
      ])}
      ${excelTable("Alertas", data.alertas, [
        ["Fecha", "fecha"], ["Residente", "residente"], ["Variable", "variable"], ["Valor", "valor"], ["Nivel", "nivel"], ["Accion", "accion"]
      ])}
    </body>
    </html>`;
  downloadHtmlExcel(html, `export_powerbi_${days}_dias.xls`);
}

function downloadHtmlExcel(html, filename) {
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function excelTable(title, rows, columns) {
  return `<h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${columns.map(([header]) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.length ? rows.map((row) => `<tr>${columns.map(([, accessor]) => `<td>${escapeHtml(typeof accessor === "function" ? accessor(row) : row[accessor])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">Sin registros</td></tr>`}
      </tbody>
    </table>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAnyDate(value) {
  const text = String(value || "");
  if (/^\d{2}-\d{2}$/.test(text)) {
    const [day, month] = text.split("-").map(Number);
    return new Date(2026, month - 1, day, 0, 0);
  }
  return parseRegistroDate(text);
}

function go(view) {
  state.view = view;
  renderShell();
}

function escapeJs(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function openModal(title, text, onConfirm) {
  $("modalTitle").textContent = title;
  $("modalText").textContent = text;
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
  $("modalConfirm").onclick = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };
}

function openPromptModal(title, text, placeholder, onConfirm) {
  $("modalTitle").textContent = title;
  $("modalText").innerHTML = `${escapeHtml(text)}<textarea id="modalPromptInput" class="modal-textarea" placeholder="${escapeHtml(placeholder)}"></textarea>`;
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
  $("modalConfirm").onclick = () => {
    const value = $("modalPromptInput")?.value || "";
    closeModal();
    if (onConfirm) onConfirm(value);
  };
}

function closeModal() {
  $("modal").classList.remove("open");
  $("modal").setAttribute("aria-hidden", "true");
  $("modalText").textContent = "";
}

init();

