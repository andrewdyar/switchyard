import { switchyardIntegrationTestRunner } from "@switchyard/test-utils"

jest.setTimeout(100000)

switchyardIntegrationTestRunner({
  testSuite: ({ getContainer, dbConnection, api, dbConfig }) => {
    let appContainer

    beforeAll(() => {
      appContainer = getContainer()
    })

    describe("auto-generated CRUD methods", () => {
      it("should create brands", async () => {
        const brandModule = appContainer.resolve("brand")

        const brand = await brandModule.createBrands({
          name: "Switchyard Brand",
        })

        expect(brand).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: "Switchyard Brand",
          })
        )

        const multipleBrands = await brandModule.createBrands([
          {
            name: "Switchyard Brand 2",
          },
          {
            name: "Switchyard Brand 3",
          },
        ])

        expect(multipleBrands).toEqual([
          expect.objectContaining({
            id: expect.stringMatching("brand_"),
            name: "Switchyard Brand 2",
          }),
          expect.objectContaining({
            id: expect.stringMatching("brand_"),
            name: "Switchyard Brand 3",
          }),
        ])
      })

      it("should update brands", async () => {
        const brandModule = appContainer.resolve("brand")

        const multipleBrands = await brandModule.createBrands([
          {
            name: "Switchyard Brand 2",
          },
          {
            name: "Switchyard Brand 3",
          },
        ])

        const brand = await brandModule.updateBrands({
          id: multipleBrands[0].id,
          name: "Switchyard Brand",
        })

        expect(brand).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: "Switchyard Brand",
          })
        )

        const multipleBrandsUpdated = await brandModule.updateBrands([
          {
            id: multipleBrands[0].id,
            name: "Switchyard Brand 22",
          },
          {
            id: multipleBrands[1].id,
            name: "Switchyard Brand 33",
          },
        ])

        expect(multipleBrandsUpdated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: "Switchyard Brand 22",
            }),
            expect.objectContaining({
              id: expect.any(String),
              name: "Switchyard Brand 33",
            }),
          ])
        )

        const multipleBrandsUpdatedWithSelector =
          await brandModule.updateBrands({
            selector: {
              name: { $like: "Switchyard Brand 22" },
            },
            data: {
              name: "Switchyard Brand **",
            },
          })

        expect(multipleBrandsUpdatedWithSelector).toEqual([
          expect.objectContaining({
            id: expect.any(String),
            name: "Switchyard Brand **",
          }),
        ])
      })
    })
  },
})
