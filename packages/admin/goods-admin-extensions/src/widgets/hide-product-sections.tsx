/* @refresh reload */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const HideProductSectionsWidget = () => {
  useEffect(() => {
    const hideSections = () => {
      const headings = document.querySelectorAll("h2")
      headings.forEach((heading) => {
        const text = heading.textContent || ""
        if (text.trim() === "Options" || text.trim() === "Shipping Configuration" || text.trim() === "Shipping") {
          let parent = heading.parentElement
          let depth = 0
          while (parent && parent !== document.body && depth < 5) {
            if (parent.classList && (parent.classList.contains("divide-y") || parent.getAttribute("class")?.includes("Container"))) {
              parent.style.display = "none"
              break
            }
            parent = parent.parentElement
            depth++
          }
        }
      })
    }

    const timeoutId = setTimeout(hideSections, 500)
    const intervalId = setInterval(hideSections, 2000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default HideProductSectionsWidget
