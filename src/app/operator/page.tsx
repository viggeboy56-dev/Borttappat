import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/operator";
export default async function OperatorPage(){await requireOperator();redirect("/operator/schools")}
