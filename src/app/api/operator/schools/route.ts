import { NextResponse } from "next/server";
import { getOperatorState } from "@/lib/auth/operator";
import { normalizeSchoolName,normalizeSchoolSlug } from "@/lib/operator/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request){const auth=await getOperatorState();if(auth.status!=="authorized")return NextResponse.json({error:"Operatörsåtkomst krävs."},{status:403});let body:{name?:unknown;slug?:unknown};try{body=await request.json()}catch{return NextResponse.json({error:"Formuläret kunde inte läsas."},{status:400})}const name=normalizeSchoolName(body.name),slug=normalizeSchoolSlug(body.slug);if(!name||!slug)return NextResponse.json({error:"Kontrollera skolnamn och identifierare."},{status:400});const {data,error}=await (await createClient()).rpc("operator_create_school",{school_name:name,school_slug:slug});if(error)return NextResponse.json({error:error.code==="23505"?"Identifieraren används redan.":"Skolan kunde inte skapas."},{status:error.code==="23505"?409:400});return NextResponse.json({id:data},{status:201})}
