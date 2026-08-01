'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  FileText,
  FileCheck2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDeletePatientConsent,
  useDeletePatientDocument,
  usePatientConsents,
  usePatientDocuments,
  useUploadPatientConsent,
  useUploadPatientDocument,
  type DocumentType,
} from '@/hooks/use-documents';

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  xray: 'Radiografía',
  photo: 'Foto',
  id: 'Identificación',
  other: 'Otro',
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

function UploadDocumentDialog({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<DocumentType>('photo');
  const [file, setFile] = useState<File | null>(null);
  const uploadDocument = useUploadPatientDocument(patientId);

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }
    try {
      await uploadDocument.mutateAsync({ file, type });
      toast.success('Documento subido');
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo subir el documento'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="document-type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as DocumentType)}>
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document-file">Archivo (JPG, PNG, WEBP o PDF · máx. 10MB)</Label>
            <Input
              id="document-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploadDocument.isPending}>
            {uploadDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadConsentDialog({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const uploadConsent = useUploadPatientConsent(patientId);

  const handleSubmit = async () => {
    if (!title.trim() || !file) {
      toast.error('Completa el título y selecciona un archivo');
      return;
    }
    try {
      await uploadConsent.mutateAsync({ file, title });
      toast.success('Consentimiento subido');
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo subir el consentimiento'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Subir consentimiento firmado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="consent-title">Título</Label>
            <Input
              id="consent-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Consentimiento informado — endodoncia"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="consent-file">Archivo escaneado (JPG, PNG, WEBP o PDF · máx. 10MB)</Label>
            <Input
              id="consent-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploadConsent.isPending}>
            {uploadConsent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PatientDocumentsPanel({ patientId }: { patientId: string }) {
  const { data: documents, isLoading: isLoadingDocuments } = usePatientDocuments(patientId);
  const { data: consents, isLoading: isLoadingConsents } = usePatientConsents(patientId);
  const deleteDocument = useDeletePatientDocument(patientId);
  const deleteConsent = useDeletePatientConsent(patientId);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingConsent, setUploadingConsent] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="glass-panel elevated rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Documentos
          </h2>
          <Button size="sm" onClick={() => setUploadingDocument(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Subir
          </Button>
        </div>

        {isLoadingDocuments ? null : documents && documents.length > 0 ? (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
              >
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {doc.fileName}
                </a>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {DOCUMENT_TYPE_LABEL[doc.type]}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={async () => {
                    try {
                      await deleteDocument.mutateAsync(doc.id);
                      toast.success('Documento eliminado');
                    } catch {
                      toast.error('No se pudo eliminar el documento');
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
            <Upload className="mb-2 h-6 w-6" />
            Sin documentos registrados.
          </div>
        )}
      </div>

      <div className="glass-panel elevated rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 className="h-4 w-4" />
            Consentimientos
          </h2>
          <Button size="sm" onClick={() => setUploadingConsent(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Subir
          </Button>
        </div>

        {isLoadingConsents ? null : consents && consents.length > 0 ? (
          <ul className="space-y-2">
            {consents.map((consent) => (
              <li
                key={consent.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
              >
                <a
                  href={consent.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {consent.title}
                </a>
                {consent.signedAt && (
                  <Badge className="shrink-0 border-none bg-success/15 text-[10px] text-success">
                    Firmado
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={async () => {
                    try {
                      await deleteConsent.mutateAsync(consent.id);
                      toast.success('Consentimiento eliminado');
                    } catch {
                      toast.error('No se pudo eliminar el consentimiento');
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
            <Upload className="mb-2 h-6 w-6" />
            Sin consentimientos registrados.
          </div>
        )}
      </div>

      {uploadingDocument && (
        <UploadDocumentDialog patientId={patientId} onClose={() => setUploadingDocument(false)} />
      )}
      {uploadingConsent && (
        <UploadConsentDialog patientId={patientId} onClose={() => setUploadingConsent(false)} />
      )}
    </div>
  );
}
