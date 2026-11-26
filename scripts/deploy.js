const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with", deployer.address, "on", hre.network.name);

  const Stay = await hre.ethers.getContractFactory("StayEscrow");
  const stay = await Stay.deploy(deployer.address);
  await stay.waitForDeployment();

  const address = await stay.getAddress();
  console.log("StayEscrow deployed to:", address);
  console.log("Put this in NEXT_PUBLIC_CONTRACT_ADDRESS (and KEEPER settings) for the web app.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
