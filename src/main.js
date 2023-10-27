const core = require('@actions/core')
const { Abi, ContractPromise } = require('@polkadot/api-contract')
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
const { cryptoWaitReady } = require('@polkadot/util-crypto')
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const wsProviderUrl = core.getInput('ws-provider-url', { required: true })
    const mnemonicPhrase = core.getInput('mnemonic-phrase', { required: true })
    const contractAddress = core.getInput('contract-address', {
      required: true
    })
    const contractAbi = core.getInput('contract-abi', { required: true })
    const contributionId = +core.getInput('contribution-id', { required: true })
    const contributorIdentity = +core.getInput('contributor-identity', {
      required: true
    })

    await cryptoWaitReady()

    // Create a keyring instance
    const keyring = new Keyring({ type: 'sr25519' })

    // Add an account, straight mnemonic
    const account = keyring.addFromMnemonic(mnemonicPhrase)
    // fix
    const gasLimit = 3000n * 1000000n
    const storageDepositLimit = null

    // Construct API provider
    const wsProvider = new WsProvider(wsProviderUrl)
    const api = await ApiPromise.create({ provider: wsProvider })
    await api.isReady
    const abi = new Abi(
      JSON.parse(contractAbi),
      api.registry.getChainProperties()
    )

    const contract = new ContractPromise(api, abi, contractAddress)

    await contract.tx
      .approve(
        { storageDepositLimit, gasLimit },
        contributionId,
        contributorIdentity
      )
      .signAndSend(account, result => {
        if (result.status.isFinalized) {
          core.setOutput('hash', result.txHash.toHuman())
        }
      })
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
