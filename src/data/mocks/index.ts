import type { AppData, Project, Task } from "@/types";
export const projects:Project[]=[
 {id:"younique",clientId:"c1",name:"Younique",color:"#aa6a55",area:"Costos",areas:["Costos","Personas"],active:true},
 {id:"plasticos-carmen",clientId:"c2",name:"Plásticos Carmen",color:"#4f806d",area:"Analítica",areas:["Inventario","Producción"],active:true},
 {id:"tienda-amiga",clientId:"c3",name:"Tienda Amiga",color:"#6a6fae",area:"Indicadores",areas:["Indicadores"],active:true},
 {id:"analytico",clientId:"c4",name:"Interno Analytico",color:"#9a792c",area:"Operaciones",areas:["Operaciones"],active:true},
];
const task=(id:string,projectId:string,initiativeId:string,versionId:string,title:string,description:string,priority:Task["priority"],status:Task["status"],deadline:string,estimatedMinutes:number,splittable:boolean,progress:number,assignedTo:string,subtasks:Task["subtasks"]=[],dependencies:string[]=[]):Task=>({id,projectId,initiativeId,versionId,title,description,priority,status,deadline,estimatedMinutes,splittable,progress,assignedTo,subtasks,dependencies});
export const tasks:Task[]=[
 task("t1","younique","i1","v1","Preparar relevamiento de costos de Younique","Definir preguntas, fuentes de información y responsables.","Alta","En curso","2026-09-03",120,true,50,"Jazmín",[{id:"s1",title:"Listar fuentes de costos",completed:true,assignedTo:"Jazmín"},{id:"s2",title:"Preparar guía de preguntas",completed:false,assignedTo:"Jazmín"}]),
 task("t2","younique","i1","v1","Definir recetas de servicios y comisiones","Acordar criterios de costeo con Administración.","Alta","Pendiente","2026-09-04",90,false,0,"Jazmín",[],["t1"]),
 task("t3","younique","i1","v2","Documentar hallazgos del relevamiento","Consolidar decisiones y próximos pasos.","Media","Pendiente","2026-09-07",60,true,0,"Jazmín"),
 task("t4","plasticos-carmen","i2","v3","Calcular días de cobertura de inventario","Construir medida y validar extremos.","Alta","Retrasada","2026-09-01",120,true,50,"Romina",[{id:"s3",title:"Validar stock disponible",completed:true,assignedTo:"Romina"},{id:"s4",title:"Revisar ventas promedio",completed:false,assignedTo:"Romina"}]),
 task("t5","plasticos-carmen","i2","v3","Construir clasificación ABC por ventas","Clasificar productos según participación acumulada.","Alta","En curso","2026-09-04",120,true,70,"Jazmín"),
 task("t6","plasticos-carmen","i2","v4","Diseñar visuales de cobertura y ABC","Preparar una versión presentable del tablero.","Media","Pendiente","2026-09-08",120,true,0,"Jazmín",[],["t4","t5"]),
 task("t7","plasticos-carmen","i3","v5","Revisar Producción V1 con Romina","Cerrar observaciones antes de publicar.","Media","En revisión","2026-09-04",90,false,80,"Romina"),
 task("t8","tienda-amiga","i4","v6","Preparar seguimiento de indicadores de Tienda Amiga","Actualizar la cadencia semanal de indicadores.","Media","Pendiente","2026-09-04",45,false,0,"Jazmín"),
 task("t9","analytico","i5","v7","Coordinar disponibilidad y tareas con Iris","Alinear prioridades internas de la semana.","Baja","Completada","2026-08-31",45,false,100,"Jazmín"),
 task("t10","younique","i6","v8","Revisar descripciones de puestos para rutinas","Identificar rutinas que deben incorporarse.","Baja","Pendiente","2026-09-11",60,true,0,"Jazmín"),
];
const users:AppData["users"]=[
 {id:"u1",name:"Jazmín Irala",email:"jazmin@consulting-workspace.test",initials:"JI",role:"admin",assignedProjectIds:projects.map(p=>p.id),editableProjectIds:projects.map(p=>p.id),permissions:{manageUsers:true,manageProjects:true,manageSchedule:true},active:true},
 {id:"u2",name:"Romina Benítez",email:"romina@consulting-workspace.test",initials:"RB",role:"consultor",assignedProjectIds:["plasticos-carmen","tienda-amiga"],editableProjectIds:["plasticos-carmen"],permissions:{manageUsers:false,manageProjects:false,manageSchedule:true},active:true},
 {id:"u3",name:"Iris Gómez",email:"iris@consulting-workspace.test",initials:"IG",role:"consultor",assignedProjectIds:["analytico"],editableProjectIds:[],permissions:{manageUsers:false,manageProjects:false,manageSchedule:false},active:true},
 {id:"u4",name:"Fernando López",email:"fernando@consulting-workspace.test",initials:"FL",role:"consultor",assignedProjectIds:["younique"],editableProjectIds:["younique"],permissions:{manageUsers:false,manageProjects:false,manageSchedule:true},active:false}
];
export const initialData:AppData={user:users[0],users,clients:projects.map((p,i)=>({id:`c${i+1}`,name:p.name})),projects,tasks,workPreferences:{dayStart:"08:30",dayEnd:"17:30",workingDays:[1,2,3,4,5],focusBlockMinutes:90},
 initiatives:[
  {id:"i1",projectId:"younique",name:"Modelo de costos y rentabilidad",area:"Costos",status:"En curso",owner:"Jazmín",startDate:"2026-08-24",deadline:"2026-09-11",impact:"Alto",versionIds:["v1","v2"]},
  {id:"i6",projectId:"younique",name:"Rutinas y responsabilidades",area:"Personas",status:"Pendiente",owner:"Jazmín",startDate:"2026-09-01",deadline:"2026-09-18",impact:"Medio",versionIds:["v8"]},
  {id:"i2",projectId:"plasticos-carmen",name:"Inventario y clasificación comercial",area:"Inventario",status:"En curso",owner:"Jazmín",startDate:"2026-08-17",deadline:"2026-09-08",impact:"Alto",versionIds:["v3","v4"]},
  {id:"i3",projectId:"plasticos-carmen",name:"Seguimiento de Producción",area:"Producción",status:"En revisión",owner:"Romina",startDate:"2026-08-10",deadline:"2026-09-04",impact:"Medio",versionIds:["v5"]},
  {id:"i4",projectId:"tienda-amiga",name:"Cadencia de indicadores",area:"Indicadores",status:"Pendiente",owner:"Jazmín",startDate:"2026-08-31",deadline:"2026-09-11",impact:"Medio",versionIds:["v6"]},
  {id:"i5",projectId:"analytico",name:"Planificación interna",area:"Operaciones",status:"Completada",owner:"Jazmín",startDate:"2026-08-31",deadline:"2026-09-04",impact:"Bajo",versionIds:["v7"]}],
 versions:[
  {id:"v1",initiativeId:"i1",code:"V1",name:"Relevamiento y definiciones",status:"En curso",owner:"Jazmín",startDate:"2026-08-24",deadline:"2026-09-04",taskIds:["t1","t2"]},
  {id:"v2",initiativeId:"i1",code:"V2",name:"Hallazgos y tablero inicial",status:"Pendiente",owner:"Jazmín",startDate:"2026-09-03",deadline:"2026-09-11",taskIds:["t3"]},
  {id:"v8",initiativeId:"i6",code:"V1",name:"Mapa de rutinas",status:"Pendiente",owner:"Jazmín",startDate:"2026-09-01",deadline:"2026-09-18",taskIds:["t10"]},
  {id:"v3",initiativeId:"i2",code:"V1",name:"Medidas de cobertura y ABC",status:"En curso",owner:"Jazmín",startDate:"2026-08-17",deadline:"2026-09-04",taskIds:["t4","t5"]},
  {id:"v4",initiativeId:"i2",code:"V2",name:"Visuales ejecutivos",status:"Pendiente",owner:"Jazmín",startDate:"2026-09-03",deadline:"2026-09-08",taskIds:["t6"]},
  {id:"v5",initiativeId:"i3",code:"V1",name:"Control de producción",status:"En revisión",owner:"Romina",startDate:"2026-08-10",deadline:"2026-09-04",taskIds:["t7"]},
  {id:"v6",initiativeId:"i4",code:"V1",name:"Seguimiento semanal",status:"Pendiente",owner:"Jazmín",startDate:"2026-08-31",deadline:"2026-09-11",taskIds:["t8"]},
  {id:"v7",initiativeId:"i5",code:"V1",name:"Plan semanal",status:"Completada",owner:"Jazmín",startDate:"2026-08-31",deadline:"2026-09-04",taskIds:["t9"]}],
 schedule:[
  {id:"b1",taskId:"t9",date:"2026-08-31",startTime:"08:30",endTime:"09:15",source:"suggested",completed:true},{id:"b2",taskId:"t4",date:"2026-08-31",startTime:"09:30",endTime:"11:30",source:"suggested",completed:false},{id:"b3",taskId:"t1",date:"2026-08-31",startTime:"14:00",endTime:"15:30",source:"suggested",completed:false},
  {id:"b4",taskId:"t2",date:"2026-09-01",startTime:"08:30",endTime:"10:00",source:"suggested",completed:false},{id:"b5",taskId:"t5",date:"2026-09-01",startTime:"10:30",endTime:"12:30",source:"suggested",completed:false},{id:"b6",taskId:"t1",date:"2026-09-02",startTime:"09:15",endTime:"09:50",source:"suggested",completed:false},
  {id:"b7",taskId:"t3",date:"2026-09-02",startTime:"11:30",endTime:"12:30",source:"suggested",completed:false},{id:"b8",taskId:"t6",date:"2026-09-03",startTime:"08:30",endTime:"10:30",source:"suggested",completed:false},{id:"b9",taskId:"t8",date:"2026-09-04",startTime:"09:00",endTime:"09:45",source:"suggested",completed:false},{id:"b10",taskId:"t7",date:"2026-09-04",startTime:"10:00",endTime:"11:30",source:"suggested",completed:false}]};
