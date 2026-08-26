/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProjetoArea, CampusCode, CAMPUS_OPTIONS } from '../../../types';
import { Info, MapPin } from 'lucide-react';

interface DataStepProps {
  nome: string;
  setNome: (v: string) => void;
  areaTematica: ProjetoArea;
  setAreaTematica: (v: ProjetoArea) => void;
  campus: CampusCode | '';
  setCampus: (v: CampusCode | '') => void;
  descricao: string;
  setDescricao: (v: string) => void;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataTermino: string;
  setDataTermino: (v: string) => void;
  cargaHoraria: number;
  setCargaHoraria: (v: number) => void;
}

export const DataStep: React.FC<DataStepProps> = ({
  nome, setNome,
  areaTematica, setAreaTematica,
  campus, setCampus,
  descricao, setDescricao,
  dataInicio, setDataInicio,
  dataTermino, setDataTermino,
  cargaHoraria, setCargaHoraria,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2 text-xs">
        <Info className="h-4 w-4 text-cyan-600 mt-0.5 shrink-0" />
        <p className="text-cyan-800 font-medium">
          O <strong>título oficial</strong>, o <strong>campus</strong> e a <strong>carga horária</strong> serão utilizados no certificado digital de cada participante.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <label className="font-semibold text-slate-600 text-xs">Campus *</label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={campus}
              onChange={e => setCampus(e.target.value as CampusCode | '')}
              className="bg-slate-50 p-2.5 pl-8 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800 text-xs w-full"
            >
              <option value="">Selecione o campus...</option>
              {CAMPUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <label className="font-semibold text-slate-600 text-xs">Título do Projeto *</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Capacitação em Programação para Jovens"
            className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-semibold text-slate-600 text-xs">Categoria *</label>
        <select
          value={areaTematica}
          onChange={e => setAreaTematica(e.target.value as ProjetoArea)}
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none font-medium text-slate-800 text-xs"
        >
          <option value="Extensão">Extensão Universitária</option>
          <option value="IC">Iniciação Científica (IC)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-semibold text-slate-600 text-xs">Descrição *</label>
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Descreva as atividades práticas, metodologia e alcance do projeto..."
          rows={3}
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-slate-800 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-600 text-xs">Data Inicial *</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="bg-slate-50 p-2 rounded-xl border border-slate-200 focus:outline-none text-slate-800 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-600 text-xs">Data Final *</label>
          <input
            type="date"
            value={dataTermino}
            onChange={e => setDataTermino(e.target.value)}
            className="bg-slate-50 p-2 rounded-xl border border-slate-200 focus:outline-none text-slate-800 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-600 text-xs">Carga Horária (h) *</label>
          <input
            type="number"
            value={cargaHoraria}
            onChange={e => setCargaHoraria(Number(e.target.value))}
            min={1}
            className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none font-bold text-cyan-600 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
