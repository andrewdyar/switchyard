import Switchyard from "@switchyard/js-sdk"

let SWITCHYARD_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_SWITCHYARD_BACKEND_URL) {
  SWITCHYARD_BACKEND_URL = process.env.NEXT_PUBLIC_SWITCHYARD_BACKEND_URL
}

export const sdk = new Switchyard({
  baseUrl: SWITCHYARD_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_SWITCHYARD_PUBLISHABLE_KEY,
})

sdk.store.payment.initiatePaymentSession(
  cart, // assuming you already have the cart object.
  {
    provider_id: "pp_stripe_stripe",
    data: {
      // any data relevant for the provider.
    }
  }
)
.then(({ payment_collection }) => {
  console.log(payment_collection)
})