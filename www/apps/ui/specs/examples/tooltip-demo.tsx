import { InformationCircleSolid } from "@switchyard/icons"
import { Tooltip } from "@switchyard/ui"

export default function TooltipDemo() {
  return (
    <Tooltip content="The quick brown fox jumps over the lazy dog.">
      <InformationCircleSolid />
    </Tooltip>
  )
}
