import { join } from "path"
import { LinkLoader } from "../link-loader"
import { SwitchyardModule } from "@switchyard/modules-sdk"

describe("LinkLoader", () => {
  const rootDir = join(__dirname, "../__fixtures__", "links")

  it("should register each link in the '/links' folder and sub folder", async () => {
    let links = SwitchyardModule.getCustomLinks()

    expect(links.length).toBe(0)

    await new LinkLoader(rootDir).load()

    links = SwitchyardModule.getCustomLinks()

    expect(links.length).toBe(2)
  })
})
