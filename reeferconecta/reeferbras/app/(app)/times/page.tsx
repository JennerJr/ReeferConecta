import { getSessionUser } from "@/lib/auth-session";
import { canAccessTeams } from "@/lib/authorization";
import NewEmployeeForm from "@/components/new-employee-form";
import EmployeeList from "@/components/employee-list";

export default async function TimesPage() {
	const user = await getSessionUser();

	if (!canAccessTeams(user?.role)) {
		return <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10">entrada não autorizada</main>;
	}

	return (
		<main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10">
			<p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Gestão de equipe</p>
			<NewEmployeeForm />
			<EmployeeList />
		</main>
	);
}