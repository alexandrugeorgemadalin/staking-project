import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { timeStamp } from "console";
import { ethers } from "hardhat";
import Web3 from "web3";

import { StakingContract__factory, StakingToken__factory } from "../types";

describe("StakingToken", async () => {
  let StakingToken: any;
  let StakingTokenContract: any;

  let StakingContract: any;
  let StakingContractContract: any;

  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  // 86400
  let day = 60 * 60 * 24;

  before(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();

    StakingToken = (await ethers.getContractFactory("StakingToken", owner)) as StakingToken__factory;
    StakingContract = (await ethers.getContractFactory("StakingContract", owner)) as StakingContract__factory;
  });

  beforeEach(async () => {
    StakingTokenContract = await StakingToken.deploy("StakingToken", "STKN");
    StakingTokenContract.connect(owner).setMinter(owner.address);

    StakingContractContract = await StakingContract.deploy(StakingTokenContract.address);

    StakingTokenContract.connect(owner).mint(owner.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(owner).approve(StakingContractContract.address, ethers.utils.parseEther("1000000"));

    StakingTokenContract.connect(owner).mint(user1.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(user1).approve(StakingContractContract.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(owner).mint(user2.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(user2).approve(StakingContractContract.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(owner).mint(user3.address, ethers.utils.parseEther("1000000"));
    StakingTokenContract.connect(user3).approve(StakingContractContract.address, ethers.utils.parseEther("1000000"));
  });

  it("Deadline should be in the future when creating the pool", async () => {
    await expect(StakingContractContract.createPool(1, 0)).to.be.revertedWithCustomError(
      StakingContractContract,
      "DeadlineMustBeInTheFuture",
    );
  });

  it("Pool rewards amount must be positive", async () => {
    await expect(StakingContractContract.createPool(0, 1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "RewardsPoolAmountMustBeGreaterThanZero",
    );
  });

  it("Only owner can create the pool", async () => {
    await expect(StakingContractContract.connect(user1).createPool(0, 1)).to.be.reverted;
  });

  it("Create pool function should set the rewardsPoolAmount and the deadline", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther("100"), 1);
    const blockNumber = await time.latestBlock();
    const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
    expect(await StakingContractContract.totalStakedBalance()).to.be.equals(0);
    expect(await StakingContractContract.rewardsPoolAmount()).to.be.equals(ethers.utils.parseEther("100"));
    expect(await StakingContractContract.deadline()).to.be.equals(timestamp + day);
    expect(await StakingContractContract.isPoolCreated()).to.be.equals(true);
    expect(await StakingContractContract.rewardsPerToken()).to.be.equals(0);

    const rewardsRatePerSecond = Web3.utils.fromWei((await StakingContractContract.rewardsRatePerSecond()).toString());
    const expectedRewardsRatePerSecond = 100 / day;

    expect(expectedRewardsRatePerSecond - Number(rewardsRatePerSecond)).to.be.lessThan(0.0001);
  });

  it("Cannot stake in a pool that is not created", async () => {
    await expect(StakingContractContract.stake(1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "PoolNotCreated",
    );
  });

  it("Cannot stake in a pool after the deadline", async () => {
    await StakingContractContract.connect(owner).createPool(100, 1);

    await ethers.provider.send("evm_increaseTime", [day + 10]);

    await expect(StakingContractContract.stake(1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "StakingPeriodEnded",
    );
  });

  it("Staking amount must be greater than 0", async () => {
    await StakingContractContract.connect(owner).createPool(100, 1);

    await expect(StakingContractContract.stake(0)).to.be.revertedWithCustomError(
      StakingContractContract,
      "StakedAmountMustBeGreaterThanZero",
    );
  });

  it("Cannot unstake from a pool that is not created", async () => {
    await expect(StakingContractContract.unstake(1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "PoolNotCreated",
    );
  });

  it("Unstaking amount must be greater than 0", async () => {
    await StakingContractContract.connect(owner).createPool(100, 1);

    await expect(StakingContractContract.unstake(0)).to.be.revertedWithCustomError(
      StakingContractContract,
      "UnstakeAmountMustBeGreaterThanZero",
    );
  });

  it("Cannot unstake more than you have in the pool", async () => {
    await StakingContractContract.connect(owner).createPool(100, 1);

    await expect(StakingContractContract.unstake(1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "InsufficientStakedBalance",
    );
  });

  it("Users can stake tokens in the pool", async () => {
    // 1 token per second as reward rate
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("100"));

    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equals(ethers.utils.parseEther("999900"));
    expect(await StakingTokenContract.balanceOf(StakingContractContract.address)).to.be.equal(
      ethers.utils.parseEther("86500"),
    );
    expect(await StakingContractContract.totalStakedBalance()).to.be.equals(ethers.utils.parseEther("100"));
    expect(await StakingContractContract.rewardsPerToken()).to.be.equals(0);
    expect(await StakingContractContract.getRewardsEarned(user1.address)).to.be.equals(0);
    expect(await StakingContractContract.getStakedBalance(user1.address)).to.be.equals(ethers.utils.parseEther("100"));
    expect(await StakingContractContract.getRewardsPerTokenPaid(user1.address)).to.be.equals(0);

    await ethers.provider.send("evm_increaseTime", [10]);
    await StakingContractContract.connect(user2).stake(ethers.utils.parseEther("50"));

    expect(await StakingTokenContract.balanceOf(user2.address)).to.be.equals(ethers.utils.parseEther("999950"));
    expect(await StakingContractContract.totalStakedBalance()).to.be.equals(ethers.utils.parseEther("150"));

    const rewardsRatePerSecond = Number(ethers.utils.formatEther(await StakingContractContract.rewardsRatePerSecond()));
    const rewardsPerToken = Number(ethers.utils.formatEther(await StakingContractContract.rewardsPerToken()));

    expect(rewardsPerToken).to.be.equal((rewardsRatePerSecond * 10) / 100);
  });

  it("Users can unstake tokens from the pool", async () => {
    // 1 token per second as reward rate
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("100"));

    await ethers.provider.send("evm_increaseTime", [10]);
    await StakingContractContract.connect(user2).stake(ethers.utils.parseEther("50"));

    await StakingContractContract.connect(user1).unstake(ethers.utils.parseEther("50"));

    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equals(ethers.utils.parseEther("999950"));
    expect(await StakingContractContract.totalStakedBalance()).to.be.equals(ethers.utils.parseEther("100"));
    expect(await StakingContractContract.getStakedBalance(user1.address)).to.be.equals(ethers.utils.parseEther("50"));
  });

  it("Users cannot claim rewards from a pool that is not created", async () => {
    await expect(StakingContractContract.claimRewards()).to.be.revertedWithCustomError(
      StakingContractContract,
      "PoolNotCreated",
    );
  });

  it("Users cannot claim 0 rewards", async () => {
    // 1 token per second as reward rate
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);

    await expect(StakingContractContract.claimRewards()).to.be.revertedWithCustomError(
      StakingContractContract,
      "NoRewardsEarned",
    );
  });

  it("Check earned rewards", async () => {
    // 1 token per second as reward rate
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("999990"));
    await time.increase(10);

    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user1).getRewardsAmount())),
    ).to.be.equal(10);

    await StakingContractContract.connect(user2).stake(ethers.utils.parseEther("10"));
    await time.increase(10);
    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user1).getRewardsAmount())),
    ).to.be.equal(16);
    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user2).getRewardsAmount())),
    ).to.be.equal(5);
  });

  it("Users can claim their rewards", async () => {
    // 1 token per second as reward rate
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("999990"));
    await time.increase(10);

    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user1).getRewardsAmount())),
    ).to.be.equal(10);

    await StakingContractContract.connect(user2).stake(ethers.utils.parseEther("10"));
    await time.increase(10);

    // waited 1 second, got 0.5 TKN each
    await StakingContractContract.connect(user1).claimRewards();
    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("1000006.5"));
    expect(await StakingContractContract.connect(user1).getRewardsAmount()).to.be.equal(0);

    // waited 1 more second, got anonther 0.5 TKN each
    // user2 staked 10 tokens for 12 seconds at a rate of 1/20 tokens per second => should claim 6 tokens
    await StakingContractContract.connect(user2).claimRewards();
    expect(await StakingTokenContract.balanceOf(user2.address)).to.be.equal(ethers.utils.parseEther("999996"));
    expect(await StakingContractContract.connect(user2).getRewardsAmount()).to.be.equal(0);

    await StakingContractContract.connect(user1).unstake(ethers.utils.parseEther("10"));
    await StakingContractContract.connect(user2).unstake(ethers.utils.parseEther("10"));

    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("1000016.5"));
    expect(await StakingTokenContract.balanceOf(user2.address)).to.be.equal(ethers.utils.parseEther("1000006"));

    expect(await StakingContractContract.totalStakedBalance()).to.be.equal(0);

    await StakingContractContract.connect(user1).claimRewards();
    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("1000017.5"));
    expect(await StakingContractContract.connect(user1).getRewardsAmount()).to.be.equal(0);

    await StakingContractContract.connect(user2).claimRewards();
    expect(await StakingTokenContract.balanceOf(user2.address)).to.be.equal(ethers.utils.parseEther("1000007.5"));
    expect(await StakingContractContract.connect(user2).getRewardsAmount()).to.be.equal(0);

    expect(await StakingTokenContract.balanceOf(StakingContractContract.address)).to.be.equal(
      ethers.utils.parseEther("86375"),
    );
  });

  it("Rewards should be offered only for the specified period", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    // one second lost from the reward
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    await time.increase(day);
    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user1).getRewardsAmount())),
    ).to.be.equal(day - 1);

    // one more second passed
    await expect(StakingContractContract.connect(user2).stake(1)).to.be.revertedWithCustomError(
      StakingContractContract,
      "StakingPeriodEnded",
    );

    await time.increase(day);
    expect(
      Number(ethers.utils.formatEther(await StakingContractContract.connect(user1).getRewardsAmount())),
    ).to.be.equal(day - 1);

    await time.increase(day);

    await StakingContractContract.connect(user1).unstake(ethers.utils.parseEther("10"));
    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("1000000"));
    await StakingContractContract.connect(user1).claimRewards();
    expect(await StakingTokenContract.balanceOf(user1.address)).to.be.equal(ethers.utils.parseEther("1086399"));
  });

  it("Should emit PoolCreated event", async () => {
    const timestamp = 20000000000;
    await time.setNextBlockTimestamp(timestamp);
    // from the tests I saw that it takes about 8 seconds to create the pool this way
    await expect(StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1))
      .to.emit(StakingContractContract, "PoolCreated")
      .withArgs(ethers.utils.parseEther(day.toString()), timestamp + day + 8);
  });

  it("Should emit Staked event", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);

    await expect(StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10")))
      .to.emit(StakingContractContract, "Staked")
      .withArgs(user1.address, ethers.utils.parseEther("10"));
  });

  it("Should emit Unstaked event", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));
    await expect(StakingContractContract.connect(user1).unstake(ethers.utils.parseEther("10")))
      .to.emit(StakingContractContract, "Unstaked")
      .withArgs(user1.address, ethers.utils.parseEther("10"));
  });

  it("Should emit Restake event", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    await time.increase(10);

    await expect(StakingContractContract.connect(user1).restake())
      .to.emit(StakingContractContract, "Restaked")
      .withArgs(user1.address, ethers.utils.parseEther("11"));
  });

  it("Should emit ClaimedRewards event", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    await time.increase(10);

    await expect(StakingContractContract.connect(user1).claimRewards())
      .to.emit(StakingContractContract, "ClaimedRewards")
      .withArgs(user1.address, ethers.utils.parseEther("11"));
  });

  it("Restake earned rewards", async () => {
    await StakingContractContract.connect(owner).createPool(ethers.utils.parseEther(day.toString()), 1);
    await StakingContractContract.connect(user1).stake(ethers.utils.parseEther("10"));

    await time.increase(10);
    await StakingContractContract.connect(user1).restake();

    expect(await StakingContractContract.connect(user1).getRewardsAmount()).to.be.equal(0);
    expect(await StakingContractContract.connect(user1).totalStakedBalance()).to.be.equal(
      ethers.utils.parseEther("21"),
    );
    expect(await StakingContractContract.connect(user1).getStakedBalance(user1.address)).to.be.equal(
      ethers.utils.parseEther("21"),
    );
  });
});
