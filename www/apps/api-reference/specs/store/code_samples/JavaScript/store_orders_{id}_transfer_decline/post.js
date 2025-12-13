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

sdk.store.order.declineTransfer(
  "order_123",
  {
    token: "transfer_token"
  },
  {
    Authorization: `Bearer ${token}`
  }
)
.then(({ order }) => {
  console.log(order)
})