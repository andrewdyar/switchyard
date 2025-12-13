import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.payment.listPaymentProviders()
.then(({ payment_providers, count, limit, offset }) => {
  console.log(payment_providers)
})