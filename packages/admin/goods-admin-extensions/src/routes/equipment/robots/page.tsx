/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text } from "@switchyard/ui"

const RobotsPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 pt-4">
        <Heading level="h1" className="mb-4">
          Robots
        </Heading>
        <Text className="text-ui-fg-subtle">
          Robot equipment management coming soon.
        </Text>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Robots",
  link: {
    label: "Robots",
    icon: null,
  },
})

export default RobotsPage
