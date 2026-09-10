import { createClient } from "@supabase/supabase-js";

const emailArgIndex = process.argv.indexOf("--email");
const email = emailArgIndex >= 0 ? process.argv[emailArgIndex + 1]?.trim().toLowerCase() : null;
const required = ["SUPABASE_URL","SUPABASE_SECRET_KEY"].filter((name)=>!process.env[name]);
if (required.length) throw new Error(`Miljövariabler saknas: ${required.join(", ")}`);
if (!email) throw new Error('Använd: pnpm operator:grant -- --email "operator@borttappat.se"');

const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
let user=null;
for(let page=1;page<=20&&!user;page+=1){
  const {data,error}=await supabase.auth.admin.listUsers({page,perPage:100});
  if(error) throw error;
  user=data.users.find((candidate)=>candidate.email?.toLowerCase()===email)??null;
  if(data.users.length<100) break;
}
if(!user) throw new Error("Skapa först operatörens Auth-konto i det betrodda Supabase-gränssnittet.");
const {error}=await supabase.rpc("grant_platform_operator",{target_user_id:user.id});
if(error) throw new Error(`Operatörsåtkomst kunde inte tilldelas: ${error.message}`);
console.log(`Operatörsåtkomst tilldelades ${email}.`);
