'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('jennerjose@example.com')
	const [password, setPassword] = useState('reeferconecta')
	const [showPassword, setShowPassword] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError('')
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.error)
			router.push('/dashboard')
			router.refresh()
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Não foi possível realizar o login')
		} finally {
			setLoading(false)
		}
	}

	return (
		<main className="flex min-h-screen flex-col justify-center bg-gray-900 px-6 py-12 lg:px-8">
			<div className="mx-auto w-full max-w-sm">
				<h1 className="text-center text-3xl font-semibold text-white">ReeferConecta</h1>
				<p className="mt-2 text-center text-sm text-gray-400">Entre na sua conta</p>
				<form onSubmit={submit} className="mt-8 space-y-5">
					<label className="block text-sm text-gray-200">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md bg-white/5 px-3 py-3 text-white outline outline-1 outline-white/10 focus:outline-cyan-400" /></label>
					<label className="block text-sm text-gray-200">Senha
						<div className="relative mt-2">
							<input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md bg-white/5 px-3 py-3 pr-12 text-white outline outline-1 outline-white/10 focus:outline-cyan-400" />
							<button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white">
								{showPassword ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>
					</label>
					<button disabled={loading} className="w-full rounded-md bg-cyan-400 px-4 py-3 font-semibold text-gray-950 hover:bg-cyan-300 disabled:opacity-50">{loading ? 'Entrando...' : 'Entrar'}</button>
					{error && <p role="alert" className="text-sm text-red-300">{error}</p>}
				</form>
			</div>
		</main>
	)
}
