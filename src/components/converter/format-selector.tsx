"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type OutputFormat = "mp4" | "gif" | "webp";

interface FormatSelectorProps {
    selectedFormats: OutputFormat[];
    onChange: (formats: OutputFormat[]) => void;
}

export function FormatSelector({ selectedFormats, onChange }: FormatSelectorProps) {
    const formats: { id: OutputFormat; label: string }[] = [
        { id: "mp4", label: "MP4 Video" },
        { id: "gif", label: "GIF Animation" },
        { id: "webp", label: "WebP Animation" },
    ];

    const toggleFormat = (format: OutputFormat) => {
        if (selectedFormats.includes(format)) {
            onChange(selectedFormats.filter((f) => f !== format));
        } else {
            onChange([...selectedFormats, format]);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Select Output Formats
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {formats.map((format) => (
                    <div
                        key={format.id}
                        className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                        <Checkbox
                            id={format.id}
                            checked={selectedFormats.includes(format.id)}
                            onCheckedChange={() => toggleFormat(format.id)}
                        />
                        <Label
                            htmlFor={format.id}
                            className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {format.label}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
}
