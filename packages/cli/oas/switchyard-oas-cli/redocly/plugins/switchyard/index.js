const CircularPatch = require("./decorators/circular-patch")

const id = "switchyard"

const decorators = {
  oas3: {
    "circular-patch": CircularPatch,
  },
}

module.exports = {
  id,
  decorators,
}
