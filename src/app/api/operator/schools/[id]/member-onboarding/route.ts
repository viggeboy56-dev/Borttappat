import { NextResponse } from "next/server";
import { getOperatorState } from "@/lib/auth/operator";
import { createMemberJoinCode,hashMemberJoinCode } from "@/lib/member-onboarding/code";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await getOperatorState();
  if(auth.status!=="authorized") return NextResponse.json({error:"Operatörsåtkomst krävs."},{status:403});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"Ogiltig skola."},{status:400});
  let body:{action?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:"Åtgärden kunde inte läsas."},{status:400})}
  if(!["enable","rotate","disable"].includes(String(body.action))) return NextResponse.json({error:"Ogiltig åtgärd."},{status:400});
  const enabled=body.action!=="disable";
  const code=enabled?createMemberJoinCode():null;
  const {error}=await (await createClient()).rpc("operator_configure_member_onboarding",{
    target_school_id:id,onboarding_enabled:enabled,new_join_code_hash:code?hashMemberJoinCode(code):null,
  });
  if(error) return NextResponse.json({error:"Medlemsanslutningen kunde inte uppdateras."},{status:400});
  return NextResponse.json({enabled,code});
}
