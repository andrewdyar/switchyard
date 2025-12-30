/**
 * Label Printing Hooks
 *
 * React hooks for printing labels from the admin dashboard
 */

import { useState, useCallback } from "react";
import { sdk } from "../lib/sdk";

// Types matching backend validators
export interface BagLabelData {
  customerName: string;
  items: string[];
  bagNumber: number;
  totalBags: number;
  bagId: string;
  temperatureZone: "ambient" | "chilled" | "frozen";
  orderId?: string;
}

export interface ToteLabelData {
  toteId: string;
  toteNumber: string;
}

export interface ShelfLabelData {
  productName: string;
  upc: string;
  location: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  labelType?: string;
}

export interface PrinterStatus {
  connected: boolean;
  message: string;
  config: {
    host: string;
    port: number;
  };
}

/**
 * Hook for checking printer status
 */
export function usePrinterStatus() {
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<PrinterStatus>(
        "/admin/labels/printer-status",
        { method: "GET" }
      );
      setStatus(response);
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to check printer status");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, error, checkStatus };
}

/**
 * Hook for printing bag labels
 */
export function usePrintBagLabel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = useCallback(async (data: BagLabelData): Promise<PrintResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<PrintResult>("/admin/labels/bag", {
        method: "POST",
        body: data,
      });
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to print bag label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const printBatch = useCallback(
    async (labels: BagLabelData[]): Promise<PrintResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sdk.client.fetch<PrintResult>("/admin/labels/bag/batch", {
          method: "POST",
          body: { labels },
        });
        return response;
      } catch (err: any) {
        setError(err.message || "Failed to print bag labels");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { print, printBatch, loading, error };
}

/**
 * Hook for printing tote labels
 */
export function usePrintToteLabel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = useCallback(async (data: ToteLabelData): Promise<PrintResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<PrintResult>("/admin/labels/tote", {
        method: "POST",
        body: data,
      });
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to print tote label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const printBatch = useCallback(
    async (labels: ToteLabelData[]): Promise<PrintResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sdk.client.fetch<PrintResult>("/admin/labels/tote/batch", {
          method: "POST",
          body: { labels },
        });
        return response;
      } catch (err: any) {
        setError(err.message || "Failed to print tote labels");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { print, printBatch, loading, error };
}

/**
 * Hook for printing shelf labels
 */
export function usePrintShelfLabel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = useCallback(async (data: ShelfLabelData): Promise<PrintResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<PrintResult>("/admin/labels/shelf", {
        method: "POST",
        body: data,
      });
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to print shelf label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const printBatch = useCallback(
    async (labels: ShelfLabelData[]): Promise<PrintResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sdk.client.fetch<PrintResult>("/admin/labels/shelf/batch", {
          method: "POST",
          body: { labels },
        });
        return response;
      } catch (err: any) {
        setError(err.message || "Failed to print shelf labels");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { print, printBatch, loading, error };
}

/**
 * Hook for previewing labels (returns ZPL without printing)
 */
export function useLabelPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zpl, setZpl] = useState<string | null>(null);

  const previewBagLabel = useCallback(async (data: BagLabelData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<{ zpl: string }>("/admin/labels/preview/bag", {
        method: "POST",
        body: data,
      });
      setZpl(response.zpl);
      return response.zpl;
    } catch (err: any) {
      setError(err.message || "Failed to preview bag label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const previewToteLabel = useCallback(async (data: ToteLabelData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<{ zpl: string }>("/admin/labels/preview/tote", {
        method: "POST",
        body: data,
      });
      setZpl(response.zpl);
      return response.zpl;
    } catch (err: any) {
      setError(err.message || "Failed to preview tote label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const previewShelfLabel = useCallback(async (data: ShelfLabelData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<{ zpl: string }>("/admin/labels/preview/shelf", {
        method: "POST",
        body: data,
      });
      setZpl(response.zpl);
      return response.zpl;
    } catch (err: any) {
      setError(err.message || "Failed to preview shelf label");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    zpl,
    loading,
    error,
    previewBagLabel,
    previewToteLabel,
    previewShelfLabel,
  };
}

/**
 * Hook for sending test print
 */
export function useTestPrint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTestPrint = useCallback(async (): Promise<PrintResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await sdk.client.fetch<PrintResult>("/admin/labels/test", {
        method: "POST",
      });
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to send test print");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendTestPrint, loading, error };
}

