"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Database, FolderPlus, Images, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CatalogReference = { name: string; source_images: number; indexed_images: number; pending: boolean };
type RebuildStatus = { running: boolean; processed: number; total: number; error: string | null };
type CatalogOverview = { references: CatalogReference[]; total_images: number; total_references: number; rebuild: RebuildStatus };

const initialStatus: RebuildStatus = { running: false, processed: 0, total: 0, error: null };

function statusMessage(status: RebuildStatus) {
  if (status.error) return status.error;
  if (status.running) return status.total ? `Indexation de ${status.processed} photo${status.processed > 1 ? "s" : ""} sur ${status.total}.` : "Préparation de l’indexation…";
  return "Le catalogue en ligne est à jour.";
}

export function AdminPanel() {
  const [catalog, setCatalog] = useState<CatalogOverview | null>(null);
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/catalog", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Impossible de charger le catalogue.");
    setCatalog(body);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh().catch((cause: Error) => setError(cause.message)).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!catalog?.rebuild.running) return;
    const interval = window.setInterval(() => { refresh().catch((cause: Error) => setError(cause.message)); }, 1500);
    return () => window.clearInterval(interval);
  }, [catalog?.rebuild.running, refresh]);

  const addFiles = (incoming: FileList | File[]) => {
    const images = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...images.filter((file) => !known.has(`${file.name}-${file.size}-${file.lastModified}`))];
    });
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const submitReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    if (!reference.trim() || files.length === 0) {
      setError("Saisissez la référence et ajoutez au moins une photo.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("reference", reference.trim());
      files.forEach((file) => form.append("images", file));
      const response = await fetch("/api/admin/reference", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Ajout impossible.");
      setNotice(body.message);
      setReference("");
      setFiles([]);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ajout impossible.");
    } finally {
      setUploading(false);
    }
  };

  const rebuild = async () => {
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/rebuild", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Reconstruction impossible.");
      setNotice(body.message);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reconstruction impossible.");
    }
  };

  const rebuildStatus = catalog?.rebuild ?? initialStatus;
  const progress = rebuildStatus.total ? Math.round((rebuildStatus.processed / rebuildStatus.total) * 100) : 0;
  const pending = catalog?.references.filter((item) => item.pending).length ?? 0;

  return (
    <div className="mx-auto max-w-[1050px] pt-5 sm:pt-9">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-6 sm:mb-10">
        <div>
          <Badge className="mb-4 bg-[var(--accent-soft)] text-[var(--accent)]"><Database className="size-3.5" /> Administration du catalogue</Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">Préparer les références reconnues</h1>
          <p className="mt-3 max-w-[66ch] text-pretty text-sm leading-6 text-[var(--muted)] sm:text-base">Ajoutez les photos d’une référence, puis lancez une indexation pour rendre cette référence disponible dans l’application.</p>
        </div>
      </div>

      <AnimatePresence>
        {(notice || error) && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className={`mb-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-[var(--danger)]" : "bg-emerald-50 text-[var(--success)]"}`} role="status">
          {error ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}<span>{error || notice}</span>
        </motion.div>}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <form onSubmit={submitReference} className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent)]"><FolderPlus className="size-5" /></div><div><h2 className="text-lg font-semibold tracking-[-0.02em]">Ajouter une référence</h2><p className="mt-0.5 text-sm text-[var(--muted)]">Une ou plusieurs photos, au format JPEG, PNG ou WebP.</p></div></div>
          <label className="mt-7 block text-sm font-semibold text-[var(--ink)]" htmlFor="reference">Nom de la référence</label>
          <input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex. Bouteille 50 cl" maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#66717a] focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20" />
          <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={`mt-5 cursor-pointer rounded-2xl border border-dashed px-5 py-8 text-center transition-colors ${dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface-soft)]/50 hover:bg-[var(--surface-soft)]"}`}>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={onFileChange} />
            <Upload className="mx-auto size-5 text-[var(--accent)]" /><p className="mt-3 text-sm font-semibold">Déposez les photos ici</p><p className="mt-1 text-xs text-[var(--muted)]">ou cliquez pour parcourir vos fichiers · 20 Mo maximum par photo</p>
          </div>
          {files.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">{files.map((file, index) => <span key={`${file.name}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]"><Images className="size-3.5 shrink-0" /><span className="max-w-[160px] truncate">{file.name}</span><button type="button" onClick={(event) => { event.stopPropagation(); setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index)); }} className="rounded-full p-0.5 hover:bg-black/10" aria-label={`Retirer ${file.name}`}><X className="size-3.5" /></button></span>)}</div>}
          <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={uploading}>{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploading ? "Ajout en cours…" : "Ajouter au catalogue source"}</Button>
        </form>

        <section className="rounded-2xl bg-[var(--ink)] p-5 text-white sm:p-7" aria-labelledby="index-title">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white" id="index-title">Indexer le catalogue</p><p className="mt-1 text-sm leading-5 text-white/68">L’IA crée les vecteurs de recherche pour toutes les photos.</p></div><RefreshCw className={`size-5 text-white/75 ${rebuildStatus.running ? "animate-spin" : ""}`} /></div>
          <div className="mt-8 border-y border-white/15 py-5"><p className="text-sm text-white/72">{statusMessage(rebuildStatus)}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15" aria-label="Progression de l’indexation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} role="progressbar"><motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress}%` }} transition={{ duration: 0.25, ease: "easeOut" }} /></div></div>
          <p className="mt-5 text-sm leading-6 text-white/72">{pending > 0 ? `${pending} référence${pending > 1 ? "s" : ""} attend${pending > 1 ? "ent" : ""} encore d’être indexée${pending > 1 ? "s" : ""}.` : "Aucune photo en attente d’indexation."}</p>
          <Button type="button" variant="secondary" onClick={rebuild} disabled={rebuildStatus.running || loading} className="mt-5 border-white/20 bg-white text-[var(--ink)] hover:bg-white/90">{rebuildStatus.running ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{rebuildStatus.running ? "Indexation en cours" : "Reconstruire maintenant"}</Button>
        </section>
      </div>

      <section className="mt-10" aria-labelledby="catalog-title">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4"><div><h2 className="text-xl font-semibold tracking-[-0.025em]" id="catalog-title">Catalogue actuel</h2><p className="mt-1 text-sm text-[var(--muted)]">{loading ? "Chargement…" : `${catalog?.total_references ?? 0} références · ${catalog?.total_images ?? 0} photos indexées`}</p></div><Button type="button" size="sm" variant="ghost" onClick={() => refresh().catch((cause: Error) => setError(cause.message))}><RefreshCw className="size-3.5" /> Actualiser</Button></div>
        <div className="divide-y divide-[var(--line)]">{catalog?.references.map((item) => <div key={item.name} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-[var(--ink)]">{item.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{item.source_images} photo{item.source_images > 1 ? "s" : ""} dans la source</p></div>{item.pending ? <Badge className="bg-amber-50 text-amber-800">À indexer</Badge> : <Badge className="bg-emerald-50 text-[var(--success)]">{item.indexed_images} indexée{item.indexed_images > 1 ? "s" : ""}</Badge>}</div>)}{!loading && catalog?.references.length === 0 && <p className="py-8 text-sm text-[var(--muted)]">Aucune référence pour le moment.</p>}</div>
      </section>
    </div>
  );
}
