import { SharePointIdentityRepository, normalizeEmail } from "../src/services/auth/identity-repository.ts";
import type { User } from "../src/types/index.ts";

const APPLY="--apply",DRY="--dry-run";
const args=new Set(process.argv.slice(2));
if(args.has(APPLY)&&args.has(DRY)){console.error(JSON.stringify({status:"error",error:"Usá solamente --dry-run o --apply."}));process.exitCode=1;}
else {
  const apply=args.has(APPLY);
  const admin:User={id:"f0327ad2-30a9-43b1-82c7-ea2cd23af6a0",name:"Jazmín Irazusta",email:normalizeEmail("jazmin.irazusta@analytico.com.py"),initials:"JI",role:"admin",assignedProjectIds:[],editableProjectIds:[],permissions:{manageUsers:true,manageProjects:true,manageSchedule:true},active:true,entraObjectId:undefined};
  try {
    const repository=new SharePointIdentityRepository();
    const existing=await repository.findByEmail(admin.email);
    if(existing)console.log(JSON.stringify({status:"ok",mode:apply?"apply":"dry-run",action:"none",user:"Jazmín Irazusta",email:admin.email,result:"already-exists"},null,2));
    else if(!apply)console.log(JSON.stringify({status:"ok",mode:"dry-run",action:"would-create",user:"Jazmín Irazusta",email:admin.email,entraObjectId:"empty"},null,2));
    else {await repository.createInitialAdmin(admin);console.log(JSON.stringify({status:"ok",mode:"apply",action:"created",user:"Jazmín Irazusta",email:admin.email,entraObjectId:"empty"},null,2));}
  } catch {console.error(JSON.stringify({status:"error",mode:apply?"apply":"dry-run",error:"No se pudo validar o registrar la administradora inicial."}));process.exitCode=1;}
}
