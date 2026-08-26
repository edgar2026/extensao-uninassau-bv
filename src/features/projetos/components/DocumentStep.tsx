/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { DocumentoComprobatorio } from '../../../types';
import { projetosService } from '../../../services/projetos.service';
import { Upload, FileText, Trash2, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface DocumentStepProps {
  projectId: string | null;
  documentos: DocumentoComprobatorio[];
  setDocumentos: (docs: DocumentoComprobatorio[]) => void;
  isEditable: boolean;
  onSaveDraft?: () => Promise<string | null>;
}

function validatePdfSignature(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);
      const header = String.fromCharCode(...arr.slice(0, 5));
      resolve(header === '%PDF-');
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 5));
  });
}

export const DocumentStep: React.FC<DocumentStepProps> = ({
  projectId, documentos, setDocumentos, isEditable, onSaveDraft,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    let currentProjectId = projectId;

    if (!currentProjectId) {
      if (!onSaveDraft) {
        setUploadError('Salve o projeto como rascunho antes de enviar documentos.');
        return;
      }
      try {
        setIsUploading(true);
        setUploadProgress(0);
        const savedId = await onSaveDraft();
        if (!savedId) {
          setUploadError('Não foi possível salvar o rascunho. Tente novamente.');
          return;
        }
        currentProjectId = savedId;
      } catch {
        setUploadError('Erro ao salvar rascunho. Tente novamente.');
        return;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    if (file.type !== 'application/pdf') {
      setUploadError('Apenas arquivos PDF são aceitos.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('O arquivo deve ter extensão .pdf.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`O arquivo excede 5 MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      return;
    }

    if (file.size === 0) {
      setUploadError('O arquivo está vazio.');
      return;
    }

    const isValidPdf = await validatePdfSignature(file);
    if (!isValidPdf) {
      setUploadError('O arquivo não é um PDF válido. Verifique a assinatura do arquivo.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const newDoc = await projetosService.uploadDocument(
        currentProjectId,
        file,
        (progress) => setUploadProgress(progress)
      );

      const existingActive = documentos.find(d => d.active);
      const updatedDocs = existingActive
        ? documentos.map(d => ({ ...d, active: false }))
        : documentos;

      setDocumentos([...updatedDocs, newDoc]);
      setUploadSuccess(`"${file.name}" enviado com sucesso!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async (doc: DocumentoComprobatorio) => {
    if (!doc.storagePath) return;
    try {
      await projetosService.deleteDocument(doc.id, doc.storagePath);
      setDocumentos(documentos.filter(d => d.id !== doc.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao remover documento.';
      setUploadError(message);
    }
  };

  const handleViewPdf = async (doc: DocumentoComprobatorio) => {
    if (!doc.storagePath) return;
    try {
      const url = await projetosService.getDocumentSignedUrl(doc.storagePath);
      window.open(url, '_blank');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir documento.';
      setUploadError(message);
    }
  };

  const activeDoc = documentos.find(d => d.active);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-cyan-600" />
        <span className="font-bold text-slate-800 text-xs">
          Documento Comprobatório (PDF, máximo de 5 MB) *
        </span>
      </div>

      {isEditable && (projectId || onSaveDraft) && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            isDragging
              ? 'border-cyan-400 bg-cyan-50'
              : 'border-slate-300 hover:border-cyan-400 bg-slate-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-2">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Enviando... {uploadProgress}%</p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-semibold">
                Arraste um PDF aqui ou clique para selecionar
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Somente PDF • Máximo 5 MB • Um arquivo principal ativo por projeto
              </p>
            </>
          )}
        </div>
      )}

      {!projectId && !onSaveDraft && isEditable && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold p-3 rounded-xl">
          Salve o projeto como rascunho antes de enviar documentos.
        </div>
      )}

      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {uploadSuccess}
        </div>
      )}

      {activeDoc && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-800 text-xs">{activeDoc.nome}</span>
              <span className="text-[10px] text-slate-400">({activeDoc.tamanho})</span>
              {activeDoc.version && activeDoc.version > 1 && (
                <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
                  v{activeDoc.version}
                </span>
              )}
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Ativo
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleViewPdf(activeDoc)}
                className="text-cyan-600 hover:text-cyan-800 p-1 cursor-pointer"
                title="Visualizar"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
                  title="Substituir"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              {isEditable && (
                <button
                  type="button"
                  onClick={() => handleRemove(activeDoc)}
                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!activeDoc && documentos.length === 0 && (
        <p className="text-[11px] text-rose-500 italic">Nenhum PDF anexado. O documento é obrigatório para envio.</p>
      )}
    </div>
  );
};
