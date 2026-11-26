require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

// Offline/locked-down machines: set USE_SOLCJS=1 to compile with the bundled `solc` npm package
// instead of downloading the native compiler from binaries.soliditylang.org.
if (process.env.USE_SOLCJS) {
  const { subtask } = require("hardhat/config");
  const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
    if (args.solcVersion === "0.8.24") {
      return {
        compilerPath: require.resolve("solc/soljson.js"),
        isSolcJs: true,
        version: "0.8.24",
        longVersion: "0.8.24+commit.e11b9ed9",
      };
    }
    return runSuper();
  });
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // "paris" avoids the PUSH0 opcode in case the chain's EVM predates Shanghai.
      evmVersion: "paris",
    },
  },
  networks: {
    qieTestnet: {
      url: process.env.QIE_TESTNET_RPC || "https://rpc1testnet.qie.digital",
      chainId: 1983,
      accounts,
    },
    qieMainnet: {
      url: process.env.QIE_MAINNET_RPC || "https://rpc1mainnet.qie.digital",
      chainId: 1990,
      accounts,
    },
  },
};
