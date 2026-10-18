import { redirect } from "next/navigation";

export default function TrustPage() {
  redirect("/brain?tab=evals");
}
