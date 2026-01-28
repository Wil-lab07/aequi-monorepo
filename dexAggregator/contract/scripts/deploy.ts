import { ethers, run, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Network:", network.name);

  // 1. Deploy Lens (No constructor args)
  const Lens = await ethers.getContractFactory("Lens");
  const lens = await Lens.deploy();
  await lens.deployed();
  console.log("Lens deployed to:", lens.address);

  // 2. Deploy Executor (Takes initialOwner)
  const Executor = await ethers.getContractFactory("Executor");
  const executor = await Executor.deploy(deployer.address);
  await executor.deployed();
  console.log("Executor deployed to:", executor.address);
  console.log("\nWaiting for block confirmations...");
  await lens.deployTransaction.wait(6);
  await executor.deployTransaction.wait(6);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
