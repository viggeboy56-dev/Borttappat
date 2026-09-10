import { NextResponse } from "next/server";
import { normalizeMemberJoinCode,normalizeMemberJoinSlug,normalizeMemberName } from "@/lib/member-onboarding/code";
import { createClient } from "@/lib/supabase/server";

const errors:Record<string,{message:string;status:number}>={
  authentication_required:{message:"Logga in eller skapa ett konto först.",status:401},
  invalid_name:{message:"Ange ditt fullständiga namn.",status:400},
  joining_unavailable:{message:"Skolan tar inte emot nya medlemmar just nu.",status:403},
  rate_limited:{message:"För många felaktiga försök. Vänta 15 minuter och försök igen.",status:429},
  invalid_code:{message:"Skolkoden är felaktig.",status:403},
  account_other_school:{message:"Kontot är redan kopplat till en annan skola och kan inte flyttas automatiskt.",status:409},
  account_has_school_role:{message:"Kontot har redan en personal- eller administratörsroll och kan inte ändras till medlem.",status:409},
};

export async function POST(request:Request){
  let body:{slug?:unknown;code?:unknown;name?:unknown;school_id?:unknown;role?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:"Formuläret kunde inte läsas."},{status:400})}
  const slug=normalizeMemberJoinSlug(body.slug),code=normalizeMemberJoinCode(body.code),name=normalizeMemberName(body.name);
  if(!slug||!code||!name) return NextResponse.json({error:"Kontrollera namn och skolkod."},{status:400});
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("join_school_as_member",{p_school_slug:slug,p_join_code:code,p_member_full_name:name});
  if(error) return NextResponse.json({error:"Anslutningen kunde inte genomföras."},{status:400});
  const result=String(data??"");
  if(result==="joined"||result==="already_member") return NextResponse.json({ok:true,status:result});
  const failure=errors[result]??{message:"Anslutningen kunde inte genomföras.",status:400};
  return NextResponse.json({error:failure.message},{status:failure.status});
}
