/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlunoParticipante, CampusCode, campusDisplay, UserAccessStatus } from '../../../types';
import { Plus, Trash2, Users, Search, UserPlus, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ParticipantsStepProps {
  alunos: AlunoParticipante[];
  setAlunos: (alunos: AlunoParticipante[]) => void;
  isEditable: boolean;
}

interface SearchResult {
  profileId: string;
  firstName: string;
  lastName: string;
  nomeCompleto: string | null;
  email: string;
  campus: CampusCode | null;
  matricula: string | null;
  curso: string | null;
  firstAccessCompleted: boolean;
}

function computeAccessStatus(p: { first_access_completed: boolean }): UserAccessStatus {
  return p.first_access_completed ? 'access_completed' : 'first_access_pending';
}

function accessStatusBadge(status: UserAccessStatus): { label: string; color: string } {
  switch (status) {
    case 'first_access_pending':
      return { label: 'Primeiro acesso pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'access_completed':
      return { label: 'Acesso ativo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    default:
      return { label: status, color: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

export const ParticipantsStep: React.FC<ParticipantsStepProps> = ({
  alunos, setAlunos, isEditable,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showNewAlunoForm, setShowNewAlunoForm] = useState(false);
  const [newAlunoNomeCompleto, setNewAlunoNomeCompleto] = useState('');
  const [newAlunoMatricula, setNewAlunoMatricula] = useState('');
  const [newAlunoCurso, setNewAlunoCurso] = useState('');
  const [newAlunoEmail, setNewAlunoEmail] = useState('');
  const [newAlunoCampus, setNewAlunoCampus] = useState<CampusCode | ''>('');
  const [isCreatingAluno, setIsCreatingAluno] = useState(false);
  const [createAlunoError, setCreateAlunoError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAlunos = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const pattern = `%${query.trim()}%`;

      let queryBuilder = supabase
        .from('profiles')
        .select('id, first_name, last_name, nome_completo, email, campus, matricula, curso, first_access_completed')
        .eq('role', 'aluno')
        .eq('active', true)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},matricula.ilike.${pattern},nome_completo.ilike.${pattern}`)
        .order('first_name', { ascending: true })
        .limit(10);

      if (!isAdmin) {
        queryBuilder = queryBuilder.eq('campus', user?.campus || 'GRAÇAS');
      }

      const { data, error: searchError } = await queryBuilder;

      if (searchError || !data) {
        setSearchResults([]);
        return;
      }

      const results: SearchResult[] = data.map((p) => ({
        profileId: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        nomeCompleto: p.nome_completo,
        email: p.email,
        campus: p.campus as CampusCode | null,
        matricula: p.matricula,
        curso: p.curso,
        firstAccessCompleted: p.first_access_completed,
      }));

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isAdmin, user?.campus]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAlunos(value);
    }, 300);
  };

  const handleSelectAluno = (result: SearchResult) => {
    const alreadyAdded = alunos.some(a => a.profileId === result.profileId);
    if (alreadyAdded) {
      setError('Este aluno já foi adicionado ao projeto.');
      return;
    }

    const nomeExibicao = result.nomeCompleto || `${result.firstName} ${result.lastName}`.trim();

    const novoAluno: AlunoParticipante = {
      profileId: result.profileId,
      nome: nomeExibicao,
      email: result.email,
      campus: result.campus,
      matricula: result.matricula,
      curso: result.curso,
      firstAccessCompleted: result.firstAccessCompleted,
    };

    setAlunos([...alunos, novoAluno]);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setError(null);
  };

  const handleRemove = (profileId: string) => {
    setAlunos(alunos.filter(a => a.profileId !== profileId));
  };

  const handleCreateAluno = async () => {
    setCreateAlunoError(null);

    if (!newAlunoNomeCompleto.trim() || !newAlunoMatricula.trim() || !newAlunoCurso.trim() || !newAlunoEmail.trim()) {
      setCreateAlunoError('Preencha nome completo, matrícula, curso e e-mail.');
      return;
    }

    if (!newAlunoCampus) {
      setCreateAlunoError('Selecione o campus.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAlunoEmail.trim())) {
      setCreateAlunoError('E-mail inválido.');
      return;
    }

    const alreadyAdded = alunos.some(a => a.email.toLowerCase() === newAlunoEmail.trim().toLowerCase());
    if (alreadyAdded) {
      setCreateAlunoError('Este e-mail já foi adicionado ao projeto.');
      return;
    }

    const alreadyAddedByMatricula = alunos.some(a => a.matricula && a.matricula === newAlunoMatricula.trim());
    if (alreadyAddedByMatricula) {
      setCreateAlunoError('Esta matrícula já foi adicionada ao projeto.');
      return;
    }

    setIsCreatingAluno(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCreateAlunoError('Sessão expirada. Faça login novamente.');
        return;
      }

      const nameParts = newAlunoNomeCompleto.trim().split(' ');
      const firstName = nameParts[0] || newAlunoNomeCompleto.trim();
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';

      const response = await supabase.functions.invoke('create-managed-user', {
        body: {
          email: newAlunoEmail.trim().toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          role: 'aluno',
          campus: newAlunoCampus,
          matricula: newAlunoMatricula.trim(),
          nome_completo: newAlunoNomeCompleto.trim(),
          curso: newAlunoCurso.trim(),
        },
      });

      if (response.error) {
        const errorData = response.error;
        setCreateAlunoError(errorData.message || 'Erro ao cadastrar aluno.');
        return;
      }

      const { userId } = response.data;

      const novoAluno: AlunoParticipante = {
        profileId: userId,
        nome: newAlunoNomeCompleto.trim(),
        email: newAlunoEmail.trim().toLowerCase(),
        campus: newAlunoCampus,
        matricula: newAlunoMatricula.trim(),
        curso: newAlunoCurso.trim(),
        firstAccessCompleted: false,
      };

      setAlunos([...alunos, novoAluno]);
      setShowNewAlunoForm(false);
      setNewAlunoNomeCompleto('');
      setNewAlunoMatricula('');
      setNewAlunoCurso('');
      setNewAlunoEmail('');
      setNewAlunoCampus('');
      setSearchQuery('');
    } catch {
      setCreateAlunoError('Erro inesperado ao cadastrar aluno.');
    } finally {
      setIsCreatingAluno(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-cyan-600" />
        <span className="font-bold text-slate-800 text-xs">
          Alunos Participantes ({alunos.length})
        </span>
      </div>

      {isEditable && (
        <div className="space-y-2">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-2 rounded-xl border border-rose-200 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar aluno por nome, matrícula ou e-mail (mín. 2 caracteres)"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  className="bg-white p-2.5 pl-8 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 text-xs w-full"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-500 animate-spin" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewAlunoForm(!showNewAlunoForm)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 px-3 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 text-xs flex items-center gap-1 border border-cyan-200"
              >
                <UserPlus className="h-3.5 w-3.5" /> Cadastrar novo aluno
              </button>
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => {
                  const isAdded = alunos.some(a => a.profileId === result.profileId);
                  const status = computeAccessStatus({ first_access_completed: result.firstAccessCompleted });
                  const badge = accessStatusBadge(status);

                  return (
                    <button
                      key={result.profileId}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleSelectAluno(result)}
                      className={`w-full text-left p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition cursor-pointer ${
                        isAdded ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {result.nomeCompleto || `${result.firstName} ${result.lastName}`}
                            </span>
                            {isAdded && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Já adicionado
                              </span>
                            )}
                          </div>
                          {result.matricula && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Mat: {result.matricula}</div>
                          )}
                          {result.curso && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{result.curso}</div>
                          )}
                          <div className="text-[11px] text-slate-500 truncate">{result.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {result.campus && (
                              <span className="text-[10px] text-slate-400">{campusDisplay(result.campus)}</span>
                            )}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                        {!isAdded && (
                          <Plus className="h-4 w-4 text-cyan-500 shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                <p className="text-xs text-slate-500">Nenhum aluno encontrado para "{searchQuery}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAlunoForm(true);
                    setNewAlunoEmail(searchQuery.includes('@') ? searchQuery : '');
                    setShowDropdown(false);
                  }}
                  className="mt-2 text-xs text-cyan-600 font-semibold hover:underline cursor-pointer"
                >
                  Cadastrar novo aluno
                </button>
              </div>
            )}
          </div>

          {showNewAlunoForm && (
            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-800 text-xs">Cadastrar Novo Aluno</span>
                <button
                  type="button"
                  onClick={() => { setShowNewAlunoForm(false); setCreateAlunoError(null); }}
                  className="text-cyan-600 hover:text-cyan-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {createAlunoError && (
                <div className="bg-rose-50 text-rose-700 p-2 rounded-xl border border-rose-200 text-xs font-semibold">
                  {createAlunoError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={newAlunoNomeCompleto}
                  onChange={e => setNewAlunoNomeCompleto(e.target.value)}
                  className="bg-white p-2 rounded-xl border border-cyan-200 focus:outline-none text-xs"
                />
                <input
                  type="text"
                  placeholder="Matrícula *"
                  value={newAlunoMatricula}
                  onChange={e => setNewAlunoMatricula(e.target.value)}
                  className="bg-white p-2 rounded-xl border border-cyan-200 focus:outline-none text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="Curso *"
                  value={newAlunoCurso}
                  onChange={e => setNewAlunoCurso(e.target.value)}
                  className="bg-white p-2 rounded-xl border border-cyan-200 focus:outline-none text-xs"
                />
                <input
                  type="email"
                  placeholder="E-mail *"
                  value={newAlunoEmail}
                  onChange={e => setNewAlunoEmail(e.target.value)}
                  className="bg-white p-2 rounded-xl border border-cyan-200 focus:outline-none text-xs"
                />
                <select
                  value={newAlunoCampus}
                  onChange={e => setNewAlunoCampus(e.target.value as CampusCode | '')}
                  className="bg-white p-2 rounded-xl border border-cyan-200 focus:outline-none text-xs"
                >
                  <option value="">Campus *</option>
                  <option value="GRAÇAS">UNINASSAU Graças</option>
                  <option value="CAXANGÁ">UNINASSAU Caxangá</option>
                  <option value="BOA_VIAGEM">UNINASSAU Boa Viagem</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewAlunoForm(false); setCreateAlunoError(null); }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateAluno}
                  disabled={isCreatingAluno}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isCreatingAluno ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Cadastrar e Incluir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {alunos.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                <th className="p-2.5">Nome</th>
                <th className="p-2.5">Matrícula</th>
                <th className="p-2.5">Curso</th>
                <th className="p-2.5">E-mail</th>
                <th className="p-2.5">Campus</th>
                <th className="p-2.5">Situação</th>
                {isEditable && <th className="p-2.5 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {alunos.map(aluno => {
                const status = computeAccessStatus({ first_access_completed: aluno.firstAccessCompleted ?? false });
                const badge = accessStatusBadge(status);

                return (
                  <tr key={aluno.profileId} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold">{aluno.nome}</td>
                    <td className="p-2.5 text-slate-500 font-mono text-[11px]">{aluno.matricula || '—'}</td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{aluno.curso || '—'}</td>
                    <td className="p-2.5 text-slate-500">{aluno.email}</td>
                    <td className="p-2.5 text-slate-500">{campusDisplay(aluno.campus) || '—'}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    {isEditable && (
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(aluno.profileId)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Remover aluno"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">Nenhum aluno incluído ainda. Use a busca acima para adicionar participantes.</p>
      )}
    </div>
  );
};
