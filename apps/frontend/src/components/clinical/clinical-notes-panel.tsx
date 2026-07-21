'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAddClinicalNote } from '@/hooks/use-clinical-records';
import type { ClinicalNote } from '@/types/api';

export function ClinicalNotesPanel({
  patientId,
  notes,
}: {
  patientId: string;
  notes: ClinicalNote[];
}) {
  const [content, setContent] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const addNote = useAddClinicalNote(patientId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      await addNote.mutateAsync({ content: content.trim(), diagnosis: diagnosis.trim() || undefined });
      setContent('');
      setDiagnosis('');
      toast.success('Nota clínica agregada');
    } catch {
      toast.error('No se pudo agregar la nota');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="glass-panel space-y-3 rounded-2xl p-4">
        <Textarea
          placeholder="Describe la evolución, hallazgos o procedimiento realizado..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-20"
        />
        <Input
          placeholder="Diagnóstico (opcional)"
          value={diagnosis}
          onChange={(event) => setDiagnosis(event.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={addNote.isPending || !content.trim()}>
            {addNote.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Guardar nota
          </Button>
        </div>
      </form>

      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Dr(a). {note.doctor.firstName} {note.doctor.lastName}
                </span>
                <span>{new Date(note.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              {note.diagnosis && (
                <p className="mt-1.5 text-xs font-medium text-primary">Dx: {note.diagnosis}</p>
              )}
              <p className="mt-1 text-sm">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <NotebookPen className="mb-2 h-6 w-6" />
          Sin notas clínicas todavía.
        </div>
      )}
    </div>
  );
}
