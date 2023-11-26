/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
const core = require('@actions/core')
const main = require('../src/main')
const abi = require('./abi.json')
// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug').mockImplementation()
const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('call contract', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'ws-provider-url':
          return 'wss://ws.test.azero.dev'
        case 'mnemonic-phrase':
          return 'entire material egg meadow latin bargain dutch coral blood melt acoustic thought'
        case 'contract-address':
          return '5DP3Ss7z5SWK37FD71NhRfrrwYKSfTbMrUBDRYUshYiLQsw8'
        case 'contract-abi':
          return JSON.stringify(abi)
        case 'contribution-id':
          return '1'
        case 'contributor':
          return '5GspWdbeG69eH6nNnZBhjY3ay15SVfxwt5zapxbVkDQP27Vy'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(0)
  })
})
