/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text } from "@switchyard/ui"

const RobotsPage = () => {
  return (
    <Container className="p-6">
      <Heading level="h1" className="mb-4">
        Robots
      </Heading>
      <Text className="text-ui-fg-subtle">
        Coming soon - Robot monitoring will be available here.
      </Text>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Robots",
})

export default RobotsPage
