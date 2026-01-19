"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileJson, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropzoneProps {
    onFileSelect: (file: File | null) => void;
    selectedFile: File | null;
}

export function Dropzone({ onFileSelect, selectedFile }: DropzoneProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFileSelect(acceptedFiles[0]);
            }
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/json": [".json"],
        },
        maxFiles: 1,
    });

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFileSelect(null);
    };

    return (
        <Card
            {...getRootProps()}
            className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-10 transition-all duration-200",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
                selectedFile ? "border-solid border-green-500/50 bg-green-500/5 shadow-inner" : ""
            )}
        >
            <input {...getInputProps()} />

            {selectedFile ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <div className="relative">
                        <div className="rounded-2xl bg-green-500/10 p-4">
                            <FileJson className="h-12 w-12 text-green-500" />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                            onClick={removeFile}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-center">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-2xl bg-muted p-4 transition-colors group-hover:bg-primary/10">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {isDragActive ? "Drop the file here" : "Drag & drop your .json file here"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            or click to browse from your computer
                        </p>
                    </div>
                </div>
            )}
        </Card>
    );
}
