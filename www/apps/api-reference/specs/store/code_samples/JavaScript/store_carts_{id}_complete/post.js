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

sdk.store.cart.complete("cart_123")
.then((data) => {
  if(data.type === "cart") {
    // an error occurred
    console.log(data.error, data.cart)
  } else {
    // order placed successfully
    console.log(data.order)
  }
})