const core = require('@actions/core')
const { Abi, ContractPromise } = require('@polkadot/api-contract')
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
const { cryptoWaitReady } = require('@polkadot/util-crypto')
const { BN, bnToBn } = require('@polkadot/util')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

/**
 * Helper function that returns Weights V2 `gasLimit` object.
 */
function getGasLimit(api, _refTime, _proofSize) {
  const refTime = bnToBn(_refTime)
  const proofSize = bnToBn(_proofSize)

  return api.registry.createType('WeightV2', {
    refTime,
    proofSize
  })
}

/**
 * Helper function that returns the maximum gas limit Weights V2 object
 * for an extrinsic based on the api chain constants.
 * NOTE: It's reduced by a given factor (defaults to 80%) to avoid storage exhaust.
 */
function getMaxGasLimit(api, reductionFactor = 0.8) {
  const blockWeights = api.consts.system.blockWeights.toPrimitive()
  const maxExtrinsic = blockWeights?.perClass?.normal?.maxExtrinsic
  const maxRefTime = maxExtrinsic?.refTime
    ? bnToBn(maxExtrinsic.refTime)
        .mul(new BN(reductionFactor * 100))
        .div(new BN(100))
    : new BN(0)
  const maxProofSize = maxExtrinsic?.proofSize
    ? bnToBn(maxExtrinsic.proofSize)
        .mul(new BN(reductionFactor * 100))
        .div(new BN(100))
    : new BN(0)

  return getGasLimit(api, maxRefTime, maxProofSize)
}

async function run() {
  try {
    const wsProviderUrl = core.getInput('ws-provider-url', { required: true })
    const mnemonicPhrase = core.getInput('mnemonic-phrase', { required: true })
    const contractAddress = core.getInput('contract-address', {
      required: true
    })
    const contractAbi = core.getInput('contract-abi', { required: true })
    const contributionId = +core.getInput('contribution-id', { required: true })
    const contributor = core.getInput('contributor', {
      required: true
    })

    await cryptoWaitReady()

    // Create a keyring instance
    const keyring = new Keyring({ type: 'sr25519' })

    // Add an account, straight mnemonic
    const account = keyring.addFromMnemonic(mnemonicPhrase)

    const storageDepositLimit = null

    // Construct API provider
    const wsProvider = new WsProvider(wsProviderUrl)
    const api = await ApiPromise.create({ provider: wsProvider })
    await api.isReady
    const abi = new Abi(
      JSON.parse(contractAbi),
      api.registry.getChainProperties()
    )

    const gasLimit = getMaxGasLimit(api)
    const contract = new ContractPromise(api, abi, contractAddress)

    console.log({ contractAddress, contributionId, contributor })

    await contract.tx
      .approve({ storageDepositLimit, gasLimit }, contributionId, contributor)
      .signAndSend(account, result => {
        console.log({ status: result.status })
        if (result.status.isFinalized) {
          core.setOutput('hash', result.txHash.toHuman())
          core.setOutput('block', result.status.asFinalized)
          wsProvider.disconnect()
        } else if (result.isError) {
          core.setFailed('error')
          wsProvider.disconnect()
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
