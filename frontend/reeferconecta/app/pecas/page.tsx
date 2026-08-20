import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';

interface PecaForm {
  nome: string;
  serialNumber: string;
  fabricante: string;
  terminal: string;
  tecnicoResponsavel: string;
  partNumber: string;
  qc: string;
  dataChegada: string;
  situacaoAtual: string;
}

interface PecasResponse {
  success: boolean;
  data?: PecaForm[];
  error?: string;
}

const PecasList: NextPage = () => {
  const [pecas, setPecas] = useState<PecaForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PecaForm>>({
    nome: '',
    serialNumber: '',
    fabricante: '',
    terminal: '',
    tecnicoResponsavel: '',
    partNumber: '',
    qc: '',
    dataChegada: '',
    situacaoAtual: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carrega as peças ao montar
  React.useEffect(() => {
    loadPecas();
  }, []);

  const loadPecas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pecas');
      const data: PecasResponse = await res.json();
      if (data.success && data.data) {
        setPecas(data.data);
      } else {
        setError(data.error || 'Erro ao carregar peças');
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/pecas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: form.nome,
          serialNumber: form.serialNumber,
          fabricante: form.fabricante,
          terminal: form.terminal,
          tecnicoResponsavel: form.tecnicoResponsavel,
          partNumber: form.partNumber,
          qc: form.qc || '',
          dataChegada: form.dataChegada,
          situacaoAtual: form.situacaoAtual,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowForm(false);
        setForm({
          nome: '',
          serialNumber: '',
          fabricante: '',
          terminal: '',
          tecnicoResponsavel: '',
          partNumber: '',
          qc: '',
          dataChegada: '',
          situacaoAtual: '',
        });
        loadPecas();
      } else {
        setFormError(data.error || 'Erro ao salvar peça');
      }
    } catch (err) {
      setFormError('Não foi possível conectar ao servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'dataChegada' && value.length === 10) {
      setForm((prev) => ({ ...prev, qc: generateQC(form, value) }));
    }
  };

  const generateQC = (_form: Partial<PecaForm>, data: string) => {
    const dataPart = data.replace(/-/g, '');
    return dataPart + 'QC';
  };

  return (
    <>
      <Head>
        <title>Pecas - ReeferConecta</title>
      </Head>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Peças Cadastradas</h1>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          Adicionar Peça
        </button>

        {loading && <p>Car...[truncated]