import { NextResponse } from "next/server";
import { getOperatorState } from "@/lib/auth/operator";
import { createClient } from "@/lib/supabase/server";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){const auth=await getOperatorState();if(auth.status!=="authorized")return NextResponse.json({error:"Operatörsåtkomst krävs."},{status:403});const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Ogiltig inbjudan."},{status:400});const {error}=await (await createClient()).rpc("operator_cancel_invitation",{target_invitation_id:id});if(error)return NextResponse.json({error:"Inbjudan kunde inte avbrytas."},{status:409});return NextResponse.json({ok:true})}
