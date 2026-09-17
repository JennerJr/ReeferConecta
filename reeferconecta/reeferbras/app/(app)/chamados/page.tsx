import { getSessionUser } from "@/lib/auth-session";

export default async function ChamadosPage() {
    const user = await getSessionUser();

    if (user?.role.trim().toLowerCase() !== "dev") {
        return <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10">entrada não autorizada</main>;
    }

    return (
        <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10">
            Chamados Page
        </main>
    );
}