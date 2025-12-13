"use client"

import React from "react"
import clsx from "clsx"
import { CopyButton } from "@/components"

export type InlineCodeProps = React.ComponentProps<"code"> & {
  variant?: "default" | "grey-bg"
}

export const InlineCode = ({
  variant = "default",
  ...props
}: InlineCodeProps) => {
  return (
    <CopyButton
      text={props.children as string}
      buttonClassName={clsx(
        "bg-transparent border-0 p-0 inline text-medusa-fg-subtle group",
        "font-monospace"
      )}
    >
      <code
        {...props}
        className={clsx(
          "text-medusa-tag-neutral-text border whitespace-break-spaces",
          "font-monospace text-code-label rounded-docs_sm py-0 px-[5px]",
          variant === "default" && [
            "bg-medusa-tag-neutral-bg group-hover:bg-medusa-tag-neutral-bg-hover",
            "group-active:bg-switchyard-bg-subtle-pressed group-focus:bg-switchyard-bg-subtle-pressed",
            "border-medusa-tag-neutral-border",
          ],
          variant === "grey-bg" && [
            "bg-switchyard-bg-switch-off group-hover:bg-switchyard-bg-switch-off-hover",
            "group-active:bg-switchyard-bg-switch-off-hover group-focus:bg-medusa-switch-off-hover",
            "border-medusa-border-strong",
          ],
          props.className
        )}
      />
    </CopyButton>
  )
}
