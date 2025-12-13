import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.salesChannel.update(
  "sc_123",
  {
    name: "Storefront",
  }
)
.then(({ salesChannel }) => {
  console.log(salesChannel)
})