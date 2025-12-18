/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text } from "@switchyard/ui"

const HandheldsPage = () => {
  return (
    <Container className="p-6">
      <Heading level="h1" className="mb-4">
        Handhelds
      </Heading>
      <Text className="text-ui-fg-subtle">
        Coming soon - Handheld device monitoring will be available here.
      </Text>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Handhelds",
})

export default HandheldsPage
