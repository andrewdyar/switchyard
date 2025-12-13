import { PlusMini } from "@switchyard/icons"
import { IconButton } from "@switchyard/ui"

export default function IconButtonLoading() {
  return (
    <IconButton isLoading className="relative">
      <PlusMini />
    </IconButton>
  )
}
