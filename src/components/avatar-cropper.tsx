"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function AvatarCropper({ imageSrc, onCancel, onUploadSuccess }: { imageSrc: string, onCancel: () => void, onUploadSuccess: () => void }) {
  const router = useRouter();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 300;
    canvas.height = 300;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      300,
      300
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const base64 = await createCroppedImage();
      if (!base64) throw new Error("Erro ao recortar imagem");

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUploadSuccess();
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar a foto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
        <button onClick={onCancel} className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-fg hover:text-foreground">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold text-foreground mb-4">Recorte sua Foto</h2>
        
        <div className="relative w-full h-64 bg-black/20 rounded-xl overflow-hidden mb-6">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium text-muted-fg block mb-2">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 py-2 bg-brand text-white font-medium rounded-xl hover:bg-brand/90 transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
            Salvar Foto
          </button>
        </div>
      </div>
    </div>
  );
}
