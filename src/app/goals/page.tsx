import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GoalsClient from "./GoalsClient";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <GoalsClient />;
}
