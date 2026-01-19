"use client";

import { useState, useEffect } from "react";
import { Dropzone } from "@/components/converter/dropzone";
import { FormatSelector, OutputFormat } from "@/components/converter/format-selector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Play, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [formats, setFormats] = useState<OutputFormat[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFormat, setCurrentFormat] = useState<OutputFormat | null>(null);

  const [downloadUrls, setDownloadUrls] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!file || formats.length === 0) return;

    setIsConverting(true);
    setProgress(0);
    setError(null);
    setDownloadUrls({});

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('formats', JSON.stringify(formats));

      // Use a custom progress simulation for better UX during the real request
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 1 : prev));
      }, 200);

      console.log('[Frontend] Request sent to /api/convert');
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      console.log('[Frontend] Response received from /api/convert', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Frontend] Conversion failed', errorData);
        throw new Error(errorData.details || errorData.error || 'Conversion failed');
      }

      const data = await response.json();
      console.log('[Frontend] Response data parsed', data);

      if (data.success) {
        setDownloadUrls(data.downloads);
        setProgress(100);
        console.log('[Frontend] State updated with download URLs');
        toast.success("Conversion completed successfully!");
      } else {
        throw new Error('API returned success: false');
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const isButtonDisabled = !file || formats.length === 0 || isConverting;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-primary selection:text-primary-foreground">
      <Toaster position="top-center" />

      {/* Background patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <main className="container max-w-4xl mx-auto py-20 px-4">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase"
          >
            <Sparkles className="w-3 h-3" />
            Jitter Companion
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight"
          >
            Convert your animations <br />
            <span className="text-primary italic">to any format.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl text-zinc-600 dark:text-zinc-400 md:text-lg"
          >
            Upload your Jitter .json export and get high-quality MP4, GIF, or WebP versions in seconds. Professional-grade optimization included.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <CardTitle>File Converter</CardTitle>
              <CardDescription>Upload your Jitter JSON file to start the process</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <Dropzone onFileSelect={(f) => { setFile(f); setDownloadUrls({}); setError(null); }} selectedFile={file} />

              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-8"
                  >
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                    <FormatSelector selectedFormats={formats} onChange={setFormats} />
                  </motion.div>
                )}
              </AnimatePresence>

              {isConverting && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{progress >= 90 && progress < 100 ? "Finalizing..." : "Converting..."}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {Object.keys(downloadUrls).length > 0 && (
                <div className="space-y-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Ready for download</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(downloadUrls).map(([format, url]) => (
                      <a
                        key={format}
                        href={url}
                        download
                        className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-primary transition-colors group"
                      >
                        <span className="font-bold uppercase text-sm">{format}</span>
                        <div className="flex items-center text-primary text-xs font-medium">
                          Download
                          <ArrowRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
                  <p className="font-semibold">Conversion Error</p>
                  <p className="mt-1 opacity-90">{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 p-6">
              <Button
                onClick={handleConvert}
                disabled={isButtonDisabled}
                className="w-full h-12 text-lg font-semibold group relative overflow-hidden transition-all active:scale-95"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Convert Files
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>


        <footer className="mt-12 text-center text-sm text-zinc-500">
          Built with Jitter exports in mind. No data ever leaves your browser.
        </footer>
      </main>
    </div>
  );
}
