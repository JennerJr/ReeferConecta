'use client'

import { FormEvent, useEffect, useState } from 'react'

type User = {
  _id?: string
  name: string
  email: string
  role: string
  imageUrl: string
}

const emptyUser: User = { name: '', email: '', role: 'user', imageUrl: '' }
export default function ProfilePage() {
  const [user, setUser] = useState<User>(emptyUser)
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function loadUser() {
    setLoading(true)
    setStatus('Buscando usuário...')
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (data.user) {
        setUser(data.user)
        setUserId(data.user._id)
        setStatus('Apenas a foto pode ser alterada.')
      } else {
        setUser(emptyUser)
        setUserId('')
        setStatus('Nenhuma sessão ativa. Faça login novamente.')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível buscar o usuário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // A carga inicial sincroniza o perfil com a sessão persistida no Redis.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUser()
  }, [])

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setStatus('Salvando...')
    try {
      if (!userId) {
        setStatus('Busque um usuário existente para alterar a foto.')
        setLoading(false)
        return
      }
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, imageUrl: user.imageUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setUser(data.user)
      setUserId(data.user._id)
      setStatus('Foto atualizada com sucesso.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível salvar o usuário')
    } finally {
      setLoading(false)
    }
  }

  async function selectImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('A imagem deve ter no máximo 10 MB.')
      return
    }

    setStatus('Processando imagem...')
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file)
        const loadedImage = new Image()
        loadedImage.onload = () => {
          URL.revokeObjectURL(objectUrl)
          resolve(loadedImage)
        }
        loadedImage.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Não foi possível ler a imagem.'))
        }
        loadedImage.src = objectUrl
      })

      const maxSize = 800
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível processar a imagem.')

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressedImage = canvas.toDataURL('image/jpeg', 0.85)
      setUser((currentUser) => ({ ...currentUser, imageUrl: compressedImage }))
      setStatus('Imagem processada. Clique em “Atualizar foto” para salvar.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível processar a imagem.')
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) return
    if (newPassword !== confirmPassword) {
      setStatus('A confirmação da nova senha não confere.')
      return
    }
    setLoading(true)
    setStatus('Alterando senha...')
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus('Senha alterada com sucesso.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível alterar a senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Conta</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Perfil do usuário</h1>
        <p className="mt-2 text-sm text-gray-400">Seu usuário é carregado automaticamente. Altere somente a foto do perfil.</p>
      </div>

      <form onSubmit={saveUser} className="space-y-5 rounded-lg border border-white/10 bg-gray-900/70 p-6">
        <label className="block text-sm text-gray-300">Nome<input readOnly value={user.name} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800/60 px-3 py-3 text-gray-400 outline-none" /></label>
        <label className="block text-sm text-gray-300">E-mail<input readOnly type="email" value={user.email} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800/60 px-3 py-3 text-gray-400 outline-none" /></label>
        <label className="block text-sm text-gray-300">Perfil<input readOnly value={user.role} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800/60 px-3 py-3 text-gray-400 outline-none" /></label>
        <div className="block text-sm text-gray-300">
          Foto do perfil
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {user.imageUrl && <img src={user.imageUrl} alt="Prévia da foto do perfil" className="size-16 rounded-full object-cover outline outline-1 outline-white/20" />}
            <label className="cursor-pointer rounded-md border border-cyan-400/50 px-4 py-3 font-medium text-cyan-300 hover:bg-cyan-400/10">
              Selecionar imagem
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} className="sr-only" />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF ou WEBP, até 10 MB. A imagem será reduzida para no máximo 800×800 px.</p>
        </div>
        <div className="pt-2"><button disabled={loading || !userId} type="submit" className="rounded-md bg-emerald-400 px-5 py-3 font-semibold text-gray-950 hover:bg-emerald-300 disabled:opacity-50">Atualizar foto</button></div>
        {status && <p role="status" className="text-sm text-gray-300">{status}</p>}
      </form>

      <form onSubmit={changePassword} className="mt-6 space-y-5 rounded-lg border border-white/10 bg-gray-900/70 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Alterar senha</h2>
          <p className="mt-1 text-sm text-gray-400">Digite sua senha atual e escolha uma nova.</p>
        </div>
        <label className="block text-sm text-gray-300">Senha atual<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
        <label className="block text-sm text-gray-300">Nova senha<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
        <label className="block text-sm text-gray-300">Confirmar nova senha<input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-gray-800 px-3 py-3 text-white outline-none focus:border-cyan-400" /></label>
        <button disabled={loading || !userId} type="submit" className="rounded-md bg-cyan-400 px-5 py-3 font-semibold text-gray-950 hover:bg-cyan-300 disabled:opacity-50">Alterar senha</button>
      </form>
    </section>
  )
}