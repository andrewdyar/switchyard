import Switchyard from "@switchyard/js-sdk"

export const sdk = new Switchyard({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

sdk.admin.refundReason.create({
  code: "refund",
  label: "Refund",
})
.then(({ refund_reason }) => {
  console.log(refund_reason)
})