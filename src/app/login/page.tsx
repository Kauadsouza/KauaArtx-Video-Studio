import { redirect } from "next/navigation";

/** A senha agora é validada no ARTX Hub; esta rota antiga nunca mostra um login. */
export default function LoginPage() {
  redirect("/embed");
}
