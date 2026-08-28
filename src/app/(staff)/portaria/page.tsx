"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { CheckCircle2, XCircle, AlertTriangle, Scan, Camera } from "lucide-react";

type ScanResult =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: any }
  | { type: "error"; message: string }
  | { type: "warning"; message: string; usedAt?: string; buyer?: string };

export default function PortariaPage() {
  const [result, setResult] = useState<ScanResult>({ type: "idle" });
  const [scannerActive, setScannerActive] = useState(false);
  const [manualHash, setManualHash] = useState("");
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Áudio opcional para feedback (beep)
  const playBeep = (type: "success" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "success") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = "square";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignorar erros de áudio
    }
  };

  const startScanner = () => {
    if (scannerRef.current) return;
    setScannerActive(true);
    setResult({ type: "idle" });

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    let isProcessing = false;

    scanner.render(
      async (decodedText) => {
        if (isProcessing) return;
        isProcessing = true;
        setResult({ type: "loading" });

        try {
          // Pausar scanner durante a validação
          scanner.pause(true);
          
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrHash: decodedText }),
          });
          
          const data = await res.json();

          if (res.ok && data.success) {
            playBeep("success");
            setResult({ type: "success", data: data.ticket });
          } else {
            playBeep("error");
            if (res.status === 409 && data.usedAt) {
              setResult({
                type: "warning",
                message: data.error,
                usedAt: data.usedAt,
                buyer: data.buyer,
              });
            } else {
              setResult({ type: "error", message: data.error || "Erro desconhecido" });
            }
          }
        } catch (error) {
          playBeep("error");
          setResult({ type: "error", message: "Erro de conexão com o servidor." });
        } finally {
          // Aguarda 3 segundos antes de permitir nova leitura automaticamente
          setTimeout(() => {
            isProcessing = false;
            scanner.resume();
            setResult({ type: "idle" });
          }, 3500);
        }
      },
      (error) => {
        // Ignorar erros de leitura de frame (muito comuns enquanto não foca)
      }
    );

    scannerRef.current = scanner;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHash.trim()) return;
    
    setResult({ type: "loading" });
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrHash: manualHash.trim() }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        playBeep("success");
        setResult({ type: "success", data: data.ticket });
      } else {
        playBeep("error");
        if (res.status === 409 && data.usedAt) {
          setResult({
            type: "warning",
            message: data.error,
            usedAt: data.usedAt,
            buyer: data.buyer,
          });
        } else {
          setResult({ type: "error", message: data.error || "Erro desconhecido" });
        }
      }
    } catch (error) {
      playBeep("error");
      setResult({ type: "error", message: "Erro de conexão com o servidor." });
    }
    setManualHash("");
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
        
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-1 text-white">Validador</h1>
          <p className="text-gray-400 text-sm">Aponte a câmera para o QR Code</p>
        </div>

        {/* Scanner Container */}
        <div 
          className={`w-full bg-black rounded-xl overflow-hidden shadow-inner border-2 transition-colors duration-300 ${
            result.type === 'success' ? 'border-success' : 
            result.type === 'error' ? 'border-error' : 
            result.type === 'warning' ? 'border-warning' : 
            'border-gray-800'
          }`}
          style={{ minHeight: "300px", position: "relative" }}
        >
          {/* This div is exclusively for html5-qrcode */}
          <div id="reader" style={{ width: "100%", height: "100%", display: scannerActive ? 'block' : 'none' }}></div>

          {!scannerActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-4 text-center">
              <Camera size={48} className="mb-2 opacity-50" />
              <button 
                onClick={startScanner}
                className="px-4 py-2 mt-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors w-full max-w-[200px]"
              >
                Iniciar Câmera
              </button>
              
              {cameraError && (
                <p className="mt-4 text-xs text-red-400 break-all bg-red-950/30 p-2 rounded border border-red-900">
                  Erro na Câmera: {cameraError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Feedback Area */}
        <div className="mt-6 w-full min-h-[120px] flex items-center justify-center">
          {result.type === "idle" && (
            <div className="text-center text-gray-500 flex flex-col items-center animate-pulse">
              <Scan size={32} className="mb-2" />
              <p>Aguardando leitura...</p>
            </div>
          )}

          {result.type === "loading" && (
            <div className="text-center text-brand flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="font-medium">Validando ingresso...</p>
            </div>
          )}

          {result.type === "success" && (
            <div className="w-full bg-success/10 border border-success/30 rounded-xl p-4 text-center text-success animate-in zoom-in-95 duration-200">
              <CheckCircle2 size={40} className="mx-auto mb-2" />
              <h2 className="text-lg font-bold">Acesso Liberado</h2>
              <p className="text-sm opacity-90 mt-1">{result.data?.buyerName}</p>
              <p className="text-xs opacity-70">{result.data?.batchName}</p>
            </div>
          )}

          {result.type === "error" && (
            <div className="w-full bg-error/10 border border-error/30 rounded-xl p-4 text-center text-error animate-in zoom-in-95 duration-200">
              <XCircle size={40} className="mx-auto mb-2" />
              <h2 className="text-lg font-bold">Ingresso Inválido</h2>
              <p className="text-sm opacity-90 mt-1">{result.message}</p>
            </div>
          )}

          {result.type === "warning" && (
            <div className="w-full bg-warning/10 border border-warning/30 rounded-xl p-4 text-center text-warning animate-in zoom-in-95 duration-200">
              <AlertTriangle size={40} className="mx-auto mb-2" />
              <h2 className="text-lg font-bold">Já Utilizado</h2>
              <p className="text-sm opacity-90 mt-1">{result.message}</p>
              {result.buyer && <p className="text-xs opacity-70 mt-1">Nome: {result.buyer}</p>}
              {result.usedAt && (
                <p className="text-xs font-mono mt-1">
                  Hora do check-in: {new Date(result.usedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual Input (Contingência / Teste) */}
        <form onSubmit={handleManualSubmit} className="mt-8 w-full border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400 mb-2 text-center">Ou digite o código do ingresso manualmente:</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Código Curto (Ex: 8A4B2C1D)" 
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
            />
            <button 
              type="submit" 
              disabled={!manualHash.trim() || result.type === 'loading'}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Validar
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
