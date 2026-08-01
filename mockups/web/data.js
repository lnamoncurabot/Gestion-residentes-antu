const RESIDENTES = [
  {
    id: 1,
    nombre: "Isabel Del Carmen Viceion Osorio",
    rut: "5.335.013-5",
    edad: "83 anos",
    sexo: "Femenino",
    ingreso: "2024-09-01",
    peso: "60.6 kg",
    patologias: "Diabetes Mellitus tipo 2, Hipertension Arterial, Demencia",
    apoderado: "Ruben Tapia",
    mail: "chelo.namoncura@gmail.com",
    telefonoApoderado: "9 8196 6212",
    telefonoSos: "9 3373 2387",
    contactoSos: "Karla Hormazabal",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 2,
    nombre: "Irene Carolina Parkes Carrasco",
    rut: "4.508.231-8",
    edad: "80 anos",
    sexo: "Femenino",
    ingreso: "2024-12-03",
    peso: "34.6 kg",
    patologias: "Hipertension Arterial, Parkinson, Deterioro Cognitivo",
    apoderado: "Pablo Verdejo",
    mail: "pablo.verdejo@gmail.com",
    telefonoApoderado: "9 6619 7409",
    telefonoSos: "9 9942 3334",
    contactoSos: "Eduardo Verdejo",
    urgencia: "EMECAR",
    estado: "Activo"
  },
  {
    id: 3,
    nombre: "Maria Isabel Leinenweber Bravo",
    rut: "5.036.161-6",
    edad: "78 anos",
    sexo: "Femenino",
    ingreso: "2019-07-14",
    peso: "45.5 kg",
    patologias: "Deterioro Cognitivo, Hipertension Arterial",
    apoderado: "Carlos Longhi",
    mail: "gclonghi@gmail.com",
    telefonoApoderado: "9 7857 9279",
    telefonoSos: "9 7857 9279",
    contactoSos: "Don Caco",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 4,
    nombre: "Sara Quiros Muller",
    rut: "4.898.901-2",
    edad: "80 anos",
    sexo: "Femenino",
    ingreso: "2025-01-26",
    peso: "41.5 kg",
    patologias: "Postracion, desnutricion, escaras, cancer de mama antiguo",
    apoderado: "Francisco Yuseff",
    mail: "franciscoyuseff@gmail.com",
    telefonoApoderado: "9 8868 5910",
    telefonoSos: "9 6407 7804",
    contactoSos: "Ignacio",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 5,
    nombre: "Beatriz Del Carmen Vera Llanos",
    rut: "5.486.820-0",
    edad: "93 anos",
    sexo: "Femenino",
    ingreso: "2019-07-19",
    peso: "46.5 kg",
    patologias: "Hipertension Arterial, Deterioro Cognitivo, Dismovilidad",
    apoderado: "Ivon Poblete",
    mail: "carenave@gmail.com",
    telefonoApoderado: "9 6699 5192",
    telefonoSos: "9 52222138",
    contactoSos: "Carlos Nakamura Vera",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 6,
    nombre: "Rossana del Carmen Silva Vilches",
    rut: "7.497.569-0",
    edad: "68 anos",
    sexo: "Femenino",
    ingreso: "2020-01-25",
    peso: "53.6 kg",
    patologias: "Demencia, enfermedad de Parkinson, Depresion",
    apoderado: "Katherine Figueroa",
    mail: "katherine.figueroa.silva@gmail.com",
    telefonoApoderado: "9 4440 5227",
    telefonoSos: "9 8889 0273",
    contactoSos: "Ivan Figueroa",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 7,
    nombre: "Hortensia Martinez Franco",
    rut: "3.166.817-4",
    edad: "91 anos",
    sexo: "Femenino",
    ingreso: "2026-04-06",
    peso: "58.7 kg",
    patologias: "Deterioro Cognitivo Mayor",
    apoderado: "Ximena Vargas",
    mail: "chelo.namoncura@gmail.com",
    telefonoApoderado: "9 8774 0278",
    telefonoSos: "9 8774 0278",
    contactoSos: "Ximena Vargas",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 8,
    nombre: "Silvia Guzman Newson",
    rut: "2.716.675-K",
    edad: "93 anos",
    sexo: "Femenino",
    ingreso: "2021-07-22",
    peso: "47.1 kg",
    patologias: "Hipertension Arterial",
    apoderado: "Oriana Aninat",
    mail: "toty2606@hotmail.com",
    telefonoApoderado: "9 8369 7509",
    telefonoSos: "9 8369 7509",
    contactoSos: "Oriana Aninat",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 9,
    nombre: "Aida Cecilia Lara Ponce",
    rut: "5.233.396-2",
    edad: "85 anos",
    sexo: "Femenino",
    ingreso: "2026-04-30",
    peso: "43.6 kg",
    patologias: "Deterioro Cognitivo Mayor",
    apoderado: "Nancy Alarcon",
    mail: "nalarcon1975@gmail.com",
    telefonoApoderado: "9 9097 5021",
    telefonoSos: "9 6591 8991",
    contactoSos: "Hans",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 10,
    nombre: "Jerman Silva Navarrete",
    rut: "4.126.362-8",
    edad: "87 anos",
    sexo: "Masculino",
    ingreso: "2025-12-02",
    peso: "61.2 kg",
    patologias: "Cancer de prostata, ACV, Deterioro Cognitivo, Hipertension Arterial, Diabetes Mellitus",
    apoderado: "Germania Silva",
    mail: "gema.silva.h@gmail.com",
    telefonoApoderado: "9 7725 9932",
    telefonoSos: "9 6619 9472",
    contactoSos: "Maritza Silva",
    urgencia: "Policlinico Naval",
    estado: "Activo"
  },
  {
    id: 11,
    nombre: "Myriam Maruri Koppmann",
    rut: "4.486.986-1",
    edad: "86 anos",
    sexo: "Femenino",
    ingreso: "2023-10-26",
    peso: "56.8 kg",
    patologias: "Deterioro Cognitivo Mayor Mixto, Dismovilidad Leve",
    apoderado: "Jessica Marchant",
    mail: "jessicamarchant@gmail.com",
    telefonoApoderado: "9 9250 5518",
    telefonoSos: "9 9410 5064",
    contactoSos: "Carlos Marchant",
    urgencia: "SAMU",
    estado: "Activo"
  },
  {
    id: 12,
    nombre: "Jose Omar Bravo Rodriguez",
    rut: "3.695.879-0",
    edad: "100 anos",
    sexo: "Masculino",
    ingreso: "2024-03-28",
    peso: "59 kg",
    patologias: "Diabetes Mellitus, Hipertension arterial, hipotiroidismo, hiperglicemia",
    apoderado: "Ximena Bravo",
    mail: "ximebravosanhueza16@gmail.com",
    telefonoApoderado: "9 7695 3779",
    telefonoSos: "9 8198 9874",
    contactoSos: "Veronica Bravo",
    urgencia: "EMECAR",
    estado: "Activo"
  },
  {
    id: 13,
    nombre: "Carlos Senarega Vasquez",
    rut: "5.442.578-3",
    edad: "79 anos",
    sexo: "Masculino",
    ingreso: "2025-05-05",
    peso: "73.5 kg",
    patologias: "Deterioro Cognitivo, Delirio hiperactivo",
    apoderado: "Fabiola Llanos",
    mail: "fabiolallanosdonoso@gmail.com",
    telefonoApoderado: "9 6607 5023",
    telefonoSos: "9 7977 2674",
    contactoSos: "Humberto",
    urgencia: "EMECAR",
    estado: "Activo"
  },
  {
    id: 14,
    nombre: "Luis Pardo Arias",
    rut: "3.855.451-4",
    edad: "86 anos",
    sexo: "Masculino",
    ingreso: "2022-10-25",
    peso: "56.6 kg",
    patologias: "Hipertension Arterial, Demencia Mixta, ACV antiguo",
    apoderado: "Maria Cecilia Pardo",
    mail: "mariapardopeq@gmail.com",
    telefonoApoderado: "9 9280 2564",
    telefonoSos: "9 9280 2564",
    contactoSos: "Maria Cecilia Pardo",
    urgencia: "Clinica ACME",
    estado: "Activo"
  },
  {
    id: 15,
    nombre: "Nivea Susana Sepulveda Poirrier",
    rut: "4.290.691-3",
    edad: "88 anos",
    sexo: "Femenino",
    ingreso: "2020-12-25",
    peso: "46.3 kg",
    patologias: "Antecedentes clinicos pendientes de normalizar",
    apoderado: "Claudia Soto",
    mail: "claudiasotosep2@gmail.com",
    telefonoApoderado: "9 9204 2455",
    telefonoSos: "9 9677 3683",
    contactoSos: "Sabrina Soto",
    urgencia: "SAMU",
    estado: "Activo"
  }
];

const ROLES = {
  administrador: {
    label: "Administrador",
    user: "administracion@hogarantu.cl",
    menu: [
      ["dashboard", "Dashboard"],
      ["residentes", "Residentes"],
      ["bdresidentes", "Base datos residentes"],
      ["formularios", "Formularios"],
      ["registros", "Registros usuarios"],
      ["alertas", "Alertas / Alarmas"],
      ["rangos", "Rangos de alerta"],
      ["usuarios", "Usuarios y roles"],
      ["pdf", "Reportes PDF"],
      ["powerbi", "Power BI"]
    ]
  },
  administrador_respaldo: {
    label: "Administrador respaldo",
    user: "administracion_respaldo@hogarantu.cl",
    menu: [
      ["dashboard", "Dashboard"],
      ["residentes", "Residentes"],
      ["bdresidentes", "Base datos residentes"],
      ["formularios", "Formularios"],
      ["registros", "Registros usuarios"],
      ["alertas", "Alertas / Alarmas"],
      ["rangos", "Rangos de alerta"],
      ["usuarios", "Usuarios y roles"],
      ["pdf", "Reportes PDF"],
      ["powerbi", "Power BI"]
    ]
  },
  cam: {
    label: "CAM / Cuidadora",
    user: "cuidadoras@hogarantu.cl",
    menu: [
      ["inicio", "Inicio"],
      ["formularioCam", "Registro CAM"],
      ["misRegistrosCam", "Mis registros"]
    ]
  },
  directora: {
    label: "Directora Tecnica",
    user: "dt@hogarantu.cl",
    menu: [
      ["inicio", "Inicio"],
      ["formularioDt", "Formulario DT"],
      ["dashboardResidente", "Dashboard residentes"],
      ["registros", "Registros usuarios"],
      ["alertas", "Alertas / Alarmas"],
      ["misRegistrosProfesional", "Mis registros"]
    ]
  },
  enfermero: {
    label: "Enfermero",
    user: "enfermero@hogarantu.cl",
    menu: [
      ["inicio", "Inicio"],
      ["formularioEnfermero", "Formulario Enfermero"],
      ["dashboardResidente", "Dashboard residentes"],
      ["registros", "Registros usuarios"],
      ["alertas", "Alertas / Alarmas"],
      ["misRegistrosProfesional", "Mis registros"]
    ]
  },
  nutricionista: {
    label: "Nutricionista",
    user: "nutricion@hogarantu.cl",
    menu: [
      ["inicio", "Inicio"],
      ["formularioNutri", "Registro nutricional"],
      ["residentes", "Residentes"],
      ["misRegistrosNutri", "Mis registros"]
    ]
  }
};

const ALERTAS = [
  {
    fecha: "2026-06-12 08:30",
    residente: "Carlos Senarega Vasquez",
    variable: "Temperatura",
    valor: "37.8 C",
    nivel: "Alerta",
    color: "yellow",
    accion: "Repetir control e informar a Enfermero si persiste."
  },
  {
    fecha: "2026-06-12 08:45",
    residente: "Irene Carolina Parkes Carrasco",
    variable: "Saturacion",
    valor: "91 %",
    nivel: "Critico",
    color: "red",
    accion: "Verificar equipo, evaluar signos respiratorios y avisar inmediatamente."
  }
];

const CONTROL_DIAS = Array.from({ length: 30 }, (_, index) => index);
const CONTROL_HORAS = ["08:00", "14:00", "20:00"];
const CONTROL_MINIMO_DIARIO = 2;
const CONTROL_ULTIMA_SEMANA_DIAS = 5;
const CONTROL_LECTURAS_POR_DIA = CONTROL_HORAS.length;
const CONTROL_PUNTOS_GRAFICA = CONTROL_ULTIMA_SEMANA_DIAS * CONTROL_LECTURAS_POR_DIA;
const UMBRALES_CICLOS = {
  temp: { label: "Temperatura", unit: "C", normalLow: 36.0, normalHigh: 37.5 },
  spo2: { label: "Saturacion SpO2", unit: "%", normalLow: 95, normalHigh: 100 },
  pad: { label: "Presion diastolica", unit: "mmHg", normalLow: 60, normalHigh: 89 },
  hgt: { label: "HGT / Glucosa", unit: "mg/dL", normalLow: 70, normalHigh: 180 }
};
const CONTROLES_CICLOS = RESIDENTES.flatMap((residente, residentIndex) => {
  const basePeso = Number.parseFloat(residente.peso);
  return CONTROL_DIAS.flatMap((dayOffset) => {
    const fecha = new Date(2026, 4, 16 + dayOffset);
    const day = String(fecha.getDate()).padStart(2, "0");
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    return CONTROL_HORAS.filter((_, hourIndex) => debeCrearControlCiclo(residentIndex, dayOffset, hourIndex)).map((hora, hourIndex) => {
      const seed = residentIndex * 17 + dayOffset * 5 + hourIndex * 3;
      const temp = 36.2 + ((seed % 12) * 0.12);
      const spo2 = 97 - (seed % 5);
      const pad = 70 + (seed % 24);
      const hgt = 92 + (seed % 75);
      return {
        residente: residente.nombre,
        fecha: `${day}-${month} ${hora}`,
        temp: Number(temp.toFixed(1)),
        spo2,
        pad,
        hgt
      };
    });
  });
});

const CONTROLES_PESO = RESIDENTES.flatMap((residente, residentIndex) => {
  const basePeso = Number.parseFloat(residente.peso);
  const regimenes = [
    "Regimen comun liviano, reforzar hidratacion.",
    "Regimen hiposodico, controlar tolerancia.",
    "Regimen diabetico, evitar azucares simples.",
    "Regimen blando, apoyo en ingesta si corresponde."
  ];
  return [0, 1, 2].map((monthOffset) => ({
    residente: residente.nombre,
    fecha: `${String(15 + monthOffset).padStart(2, "0")}-${String(3 + monthOffset).padStart(2, "0")}`,
    peso: Number((basePeso + (monthOffset - 1) * 0.4 + (residentIndex % 3) * 0.1).toFixed(1)),
    regimen: regimenes[(residentIndex + monthOffset) % regimenes.length]
  }));
});

const SIM_FECHA_INICIO = new Date(2026, 4, 16);
const MEDICAMENTOS_SIMULADOS = [
  "Losartan 50 mg",
  "Metformina 850 mg",
  "Quetiapina 25 mg",
  "Levotiroxina 50 mcg",
  "Amlodipino 5 mg",
  "Paracetamol 500 mg"
];

function fechaSimulada(dayOffset, hora) {
  const fecha = new Date(SIM_FECHA_INICIO);
  fecha.setDate(fecha.getDate() + dayOffset);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${hora}`;
}

function cicloDetalle(residentIndex, dayOffset, hourIndex) {
  const seed = residentIndex * 17 + dayOffset * 5 + hourIndex * 3;
  const temp = (36.2 + ((seed % 12) * 0.12)).toFixed(1);
  const spo2 = 97 - (seed % 5);
  const sistolica = 116 + (seed % 24);
  const diastolica = 70 + (seed % 24);
  const hgt = 92 + (seed % 75);
  return `Temp ${temp} C, Sat ${spo2}%, PA ${sistolica}/${diastolica}, HGT ${hgt}.`;
}

function despicheSimulado(residentIndex, dayOffset, hourIndex) {
  const tipo = (residentIndex + dayOffset + hourIndex) % 2 === 0 ? "Diuresis" : "Deposición";
  const casoAlerta = residentIndex === 2 && dayOffset === 29;
  const resultado = casoAlerta || (residentIndex + dayOffset + hourIndex) % 11 === 0 ? "No" : "Si";
  return { tipo, resultado };
}

let REGISTROS_CAM = RESIDENTES.flatMap((residente, residentIndex) =>
  CONTROL_DIAS.flatMap((dayOffset) =>
    CONTROL_HORAS.filter((_, hourIndex) => debeCrearControlCiclo(residentIndex, dayOffset, hourIndex)).map((hora, hourIndex) => {
      const esMedicamento = hourIndex !== 1 && (residentIndex + dayOffset + hourIndex) % 2 === 0;
      const esObservacion = (residentIndex + dayOffset + hourIndex) % 5 === 0;
      const medicamento = esMedicamento ? MEDICAMENTOS_SIMULADOS[(residentIndex + dayOffset + hourIndex) % MEDICAMENTOS_SIMULADOS.length] : "";
      const despiche = despicheSimulado(residentIndex, dayOffset, hourIndex);
      const parts = ["Control de ciclos"];
      parts.push("Diuresis/Deposición");
      if (esMedicamento) parts.push("Medicamento");
      if (esObservacion) parts.push("Observacion");
      const detalle = [
        `Control registrado. ${cicloDetalle(residentIndex, dayOffset, hourIndex)}`,
        `${despiche.tipo}: ${despiche.resultado}.`,
        esMedicamento ? `Medicamento ${medicamento} administrado a las ${hora}.` : "",
        esObservacion ? "Observacion: residente con evolucion diaria sin incidentes mayores." : ""
      ].filter(Boolean).join(" ");
      return {
        fecha: fechaSimulada(dayOffset, hora),
        residente: residente.nombre,
        usuario: "cuidadoras@hogarantu.cl",
        turno: hourIndex === 2 ? "Noche" : "Dia",
        cuidadora: hourIndex === 2 ? "CAM2" : "CAM1",
        tipo: parts.join(" + "),
        despicheTipo: despiche.tipo,
        despicheResultado: despiche.resultado,
        medicamento,
        horaMedicamento: esMedicamento ? hora : "",
        detalle,
        editable: dayOffset >= 29
      };
    })
  )
);

function debeCrearControlCiclo(residentIndex, dayOffset, hourIndex) {
  const diasConTomaInsuficiente = [
    { residentIndex: 4, dayOffset: 28 },
    { residentIndex: 8, dayOffset: 28 }
  ];
  const casoDemo = diasConTomaInsuficiente.some((item) => item.residentIndex === residentIndex && item.dayOffset === dayOffset);
  return !casoDemo || hourIndex === 0;
}

let REGISTROS_PRO = RESIDENTES.flatMap((residente, residentIndex) =>
  [3, 10, 17, 24, 29].flatMap((dayOffset, weekIndex) => [
    {
      fecha: fechaSimulada(dayOffset, "10:15"),
      residente: residente.nombre,
      rol: "Directora Tecnica",
      registro: `Revision tecnica semana ${weekIndex + 1}. Se revisa bitacora CAM, estado general, adherencia a cuidados y necesidad de seguimiento.`,
      editable: dayOffset >= 29
    },
    {
      fecha: fechaSimulada(dayOffset, "11:40"),
      residente: residente.nombre,
      rol: "Enfermero",
      registro: `Revision clinica semana ${weekIndex + 1}. Se revisan ciclos, medicamentos suministrados y alertas abiertas del periodo.`,
      editable: dayOffset >= 29
    }
  ])
);

let REGISTROS_NUTRI = RESIDENTES.flatMap((residente, residentIndex) =>
  [8, 29].map((dayOffset, controlIndex) => ({
    fecha: fechaSimulada(dayOffset, "12:30"),
    residente: residente.nombre,
    imc: (21.8 + (residentIndex % 6) * 0.4 + controlIndex * 0.1).toFixed(1),
    observacion: controlIndex === 0
      ? "Control nutricional del periodo. Mantener minuta indicada y reforzar hidratacion segun tolerancia."
      : "Control nutricional mensual. Actualizar regimen si existen cambios de peso o tolerancia alimentaria.",
    editable: dayOffset >= 29
  }))
);
