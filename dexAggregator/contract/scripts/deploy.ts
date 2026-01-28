import { ethers } from 'hardhat';
import * as args from './argument';

async function main() {
  const Base = await ethers.getContractFactory('ERC721Preset');
  const base = await Base.deploy(args[0], args[1]);

  await base.deployed();

  console.log('ERC721Preset deployed to:', base.address);
  console.log(
    `npx hardhat verify --constructor-args /scripts/argument..js ${base.address} --network rinkeby`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
