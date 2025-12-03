import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Neispravan e-mail"),
  password: z.string().min(6, "Min 6 karaktera"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password);
      navigate("/");
    } catch (e: any) {
      alert(e.message || "Greška pri prijavi.");
    }
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <h1 className="text-2xl font-semibold mb-4 text-center">Prijava</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input {...register("email")} placeholder="Email" className="w-full border p-2 rounded" />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        <input type="password" {...register("password")} placeholder="Lozinka" className="w-full border p-2 rounded" />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        <button disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2 rounded">
          {isSubmitting ? "Prijavljujem..." : "Prijavi se"}
        </button>
      </form>
      <p className="text-center text-sm mt-4">
        Nemaš nalog? <Link to="/signup" className="text-primary font-semibold">Registruj se</Link>
      </p>
    </div>
  );
}
