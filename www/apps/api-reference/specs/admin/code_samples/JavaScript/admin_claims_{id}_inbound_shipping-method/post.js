import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.claim.addInboundShipping(
  "claim_123", 
  {
    shipping_option_id: "so_123",
    custom_amount: 10
  },
  )
.then(({ return: returnData }) => {
  console.log(returnData)
})