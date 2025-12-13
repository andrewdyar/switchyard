import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.product.updateOption(
  "prod_123",
  "prodopt_123",
  {
    title: "Color"
  }
)
.then(({ product }) => {
  console.log(product)
})