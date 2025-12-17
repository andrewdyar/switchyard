/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text } from "@switchyard/ui"

const HandheldsPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 pt-4">
        <Heading level="h1" className="mb-4">
          Handhelds
        </Heading>
        <Text className="text-ui-fg-subtle">
          Handheld equipment management coming soon.
        </Text>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Handhelds",
  link: {
    label: "Handhelds",
    icon: null,
  },
})

export default HandheldsPage
