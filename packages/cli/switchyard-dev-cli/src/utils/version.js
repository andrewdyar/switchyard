exports.getVersionInfo = () => {
  const { version: devCliVersion } = require(`../../package.json`)
  return `Switchyard Dev CLI version: ${devCliVersion}`
}
