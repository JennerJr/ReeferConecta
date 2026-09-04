'use client';
import {useEffect, useState} from "react";
import Link from "next/link";

type Piece = {
  id: number | string;
  nome?: string;
  serialNumber?: string;
  fabricante?: string;
  localidade?: string;
  tecnicoResponsavel?: string;
  partNumber?: string;
  dataChegada?: string;
  situacaoAtual?: string;
  qc?: string;
  imagemUrl?: string;
  dataSaida?: string;
  createdAt?: string;
};

export default function Reports(){
      const pageSize = 10;
      const [pieces, setPieces] = useState<Piece[]>([]);
      const [currentPage, setCurrentPage] = useState(1);
      const [search, setSearch] = useState("");
      const [error, setError] = useState("");
      const [loading, setLoading] = useState(true);
      const normalizedSearch = search.trim().toLowerCase();
      const filteredPieces = pieces
        .filter((piece) =>
          Object.values(piece).some((value) =>
            String(value ?? "").toLowerCase().includes(normalizedSearch),
          ),
        )
        .sort((first, second) => {
          const firstDate = new Date(first.createdAt ?? first.dataChegada ?? 0).getTime();
          const secondDate = new Date(second.createdAt ?? second.dataChegada ?? 0).getTime();
          return secondDate - firstDate;
        });
      const totalPages = Math.ceil(filteredPieces.length / pageSize);
      const visiblePieces = filteredPieces.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    
      useEffect(() => {
        fetch("/api/pecas")
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.erro ?? "Não foi possível carregar as peças.");
            // O endpoint pode retornar diretamente um array ou um objeto com campos diversos; normalizar para array de objetos
            const normalized: Piece[] = Array.isArray(data) ? data : (data.data ?? data.pecas ?? data.dados ?? []);
            setPieces(normalized as Piece[]);
          })
          .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Erro ao carregar peças."))
          .finally(() => setLoading(false));
      }, []);
      return(
        <div>
          <Link className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800" href="/reports/novo">Novo Report</Link>
        </div>
      )
}