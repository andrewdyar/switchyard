import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.product.retrieveOption(
  "prod_123",
  "prodopt_123"
)
.then(({ product_option }) => {
  console.log(product_option)
})