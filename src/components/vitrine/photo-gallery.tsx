"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListingPhoto } from "@/components/vitrine/types";

export function PhotoGallery({
  listingId,
  photos,
  onChanged
}: {
  listingId: string;
  photos: ListingPhoto[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/vitrine/${listingId}/photos`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao enviar foto.");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/vitrine/photos/${photoId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao remover foto.");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover foto.");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">Fotos</span>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "+ Adicionar foto"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-xs font-medium text-rose-700">{error}</p>
        </div>
      ) : null}

      {photos.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-slate-500">
          Nenhuma foto. Clique em &quot;Adicionar foto&quot; para enviar.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-[color:var(--line)] bg-slate-100"
            >
              <Image
                src={photo.url}
                alt="Foto do animal"
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className="absolute right-1 top-1 rounded-full bg-rose-600/90 p-1 text-white shadow hover:bg-rose-700"
                aria-label="Remover foto"
                title="Remover foto"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
