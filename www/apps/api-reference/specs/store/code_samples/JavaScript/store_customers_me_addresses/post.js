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

// TODO must be authenticated as the customer to create an address
sdk.store.customer.createAddress({
  country_code: "us"
})
.then(({ customer }) => {
  console.log(customer)
})