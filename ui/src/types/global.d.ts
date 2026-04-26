export {};

declare global {
  interface Window {
    tauriAPI?: {
      readFileAsDataUrl?: (args: { filePath: string; maxDim?: number }) => Promise<string>;
      readFileAsAssetUrl?: (args: { filePath: string; maxDim?: number }) => Promise<string>;
      readFileAsAssetInfo?: (args: { filePath: string; maxDim?: number }) => Promise<{ filePath: string; assetUrl?: string }>;
      filePathToAssetUrl?: (filePath: string) => string;
      applyBackgroundFx?: (args: { bytes: Uint8Array; blurPx?: number; brightness?: number }) => Promise<{ filePath: string; assetUrl: string }>;
      applyExportWatermark?: (args: { baseDataUrl: string; watermarkDataUrl: string; x: number; y: number }) => Promise<string | { dataUrl?: string }>;
      captureScreenshotToFile?: (args: { mode?: string }) => Promise<string>;
      captureRegionUpload?: (args: { filePath?: string; x: number; y: number; w: number; h: number; dpr?: number; intent?: string | null }) => Promise<{ ok?: boolean; status?: number; responseText?: string; filePath?: string; canceled?: boolean; error?: string }>;
      captureCancel?: (args: { filePath?: string } | undefined) => Promise<void>;
    };
  }
}
