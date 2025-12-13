import { Button } from "@switchyard/ui"

export default function ButtonAsLink() {
  return (
    <Button asChild>
      <a href="https://switchyard.com" target="_blank" rel="noopener noreferrer">
        Open Switchyard Website
      </a>
    </Button>
  )
}
