import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import type { StakingToken, StakingToken__factory } from "../../types";

task("deploy:StakingToken").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const StakingTokenFactory: StakingToken__factory = <StakingToken__factory>(
    await ethers.getContractFactory("StakingToken")
  );
  const StakingToken: StakingToken = <StakingToken>await StakingTokenFactory.deploy("StakingToken", "STKN");
  await StakingToken.deployed();
  console.log("StakingToken deployed to: ", StakingToken.address);
});

// npx hardhat deploy:StakingToken --network polygon-mumbai
// npx hardhat verify {contract_address} --network polygon-mumbai --contract contracts/StakingToken.sol:StakingToken StakingToken STKN
