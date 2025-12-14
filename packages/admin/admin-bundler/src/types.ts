import { AdminOptions } from "@switchyard/types"

export type BundlerOptions = Required<Pick<AdminOptions, "path">> &
  Pick<AdminOptions, "vite" | "backendUrl" | "storefrontUrl"> & {
    outDir: string
    sources?: string[]
    plugins?: string[]
  }
