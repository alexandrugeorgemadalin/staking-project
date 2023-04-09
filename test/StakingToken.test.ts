import { expect } from "chai";
import { ethers } from "hardhat";

import { StakingToken__factory } from "../types";

describe("StakingToken", async () => {
  let StakingToken: any;
  let StakingTokenContract: any;

  let owner: any;
  let minter: any;
  let burner: any;
  let sender: any;
  let user: any;

  before(async () => {
    [owner, minter, burner, sender, user] = await ethers.getSigners();

    StakingToken = (await ethers.getContractFactory("StakingToken", owner)) as StakingToken__factory;
  });

  beforeEach(async () => {
    StakingTokenContract = await StakingToken.deploy("StakingToken", "STKN");
  });

  it("Name must be set as StakingToken", async () => {
    expect(await StakingTokenContract.name()).to.be.equals("StakingToken");
  });

  it("Symbol must be set as STKN", async () => {
    expect(await StakingTokenContract.symbol()).to.be.equals("STKN");
  });

  it("Just default admin can set the minter", async () => {
    await expect(StakingTokenContract.connect(minter).setMinter(minter.address)).to.be.reverted;

    await expect(StakingTokenContract.connect(owner).setMinter(minter.address))
      .to.emit(StakingTokenContract, "SetMinter")
      .withArgs(minter.address);

    const MINTER_ROLE = await StakingTokenContract.MINTER_ROLE();

    expect(await StakingTokenContract.hasRole(MINTER_ROLE, minter.address)).to.be.equals(true);
  });

  it("Just default admin can set the burner", async () => {
    await expect(StakingTokenContract.connect(burner).setBurner(burner.address)).to.be.reverted;

    await expect(StakingTokenContract.connect(owner).setBurner(burner.address))
      .to.emit(StakingTokenContract, "SetBurner")
      .withArgs(burner.address);

    const BURNER_ROLE = await StakingTokenContract.BURNER_ROLE();

    expect(await StakingTokenContract.hasRole(BURNER_ROLE, burner.address)).to.be.equals(true);
  });

  it("Just default admin can set the sender", async () => {
    await expect(StakingTokenContract.connect(burner).setSender(sender.address)).to.be.reverted;

    await expect(StakingTokenContract.connect(owner).setSender(sender.address))
      .to.emit(StakingTokenContract, "SetSender")
      .withArgs(sender.address);

    const SENDER_ROLE = await StakingTokenContract.SENDER_ROLE();

    expect(await StakingTokenContract.hasRole(SENDER_ROLE, sender.address)).to.be.equals(true);
  });

  it("Testing mint function", async () => {
    await expect(StakingTokenContract.connect(owner).setMinter(minter.address))
      .to.emit(StakingTokenContract, "SetMinter")
      .withArgs(minter.address);

    await expect(StakingTokenContract.connect(owner).setBurner(burner.address))
      .to.emit(StakingTokenContract, "SetBurner")
      .withArgs(burner.address);

    await expect(StakingTokenContract.connect(owner).setSender(sender.address))
      .to.emit(StakingTokenContract, "SetSender")
      .withArgs(sender.address);

    await expect(StakingTokenContract.connect(owner).mint(user.address, 10)).to.be.reverted;

    await expect(StakingTokenContract.connect(minter).mint(user.address, 10))
      .emit(StakingTokenContract, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 10);

    expect(await StakingTokenContract.balanceOf(user.address)).to.be.equal(10);
  });

  it("Testing burn function", async () => {
    await expect(StakingTokenContract.connect(owner).setMinter(minter.address))
      .to.emit(StakingTokenContract, "SetMinter")
      .withArgs(minter.address);

    await expect(StakingTokenContract.connect(owner).setBurner(burner.address))
      .to.emit(StakingTokenContract, "SetBurner")
      .withArgs(burner.address);

    await expect(StakingTokenContract.connect(owner).setSender(sender.address))
      .to.emit(StakingTokenContract, "SetSender")
      .withArgs(sender.address);

    await expect(StakingTokenContract.connect(owner).burn(user.address, 10)).to.be.reverted;

    await expect(StakingTokenContract.connect(burner).burn(user.address, 10)).to.be.revertedWith(
      "ERC20: burn amount exceeds balance",
    );

    await expect(StakingTokenContract.connect(minter).mint(user.address, 10))
      .emit(StakingTokenContract, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, 10);

    expect(await StakingTokenContract.balanceOf(user.address)).to.be.equal(10);

    await expect(StakingTokenContract.connect(burner).burn(user.address, 5))
      .emit(StakingTokenContract, "Transfer")
      .withArgs(user.address, ethers.constants.AddressZero, 5);

    expect(await StakingTokenContract.balanceOf(user.address)).to.be.equal(5);

    await expect(StakingTokenContract.connect(burner).burn(user.address, 5))
      .emit(StakingTokenContract, "Transfer")
      .withArgs(user.address, ethers.constants.AddressZero, 5);

    expect(await StakingTokenContract.balanceOf(user.address)).to.be.equal(0);
  });

  it("Testing send function", async () => {
    await expect(StakingTokenContract.connect(owner).setMinter(minter.address))
      .to.emit(StakingTokenContract, "SetMinter")
      .withArgs(minter.address);

    await expect(StakingTokenContract.connect(owner).setBurner(burner.address))
      .to.emit(StakingTokenContract, "SetBurner")
      .withArgs(burner.address);

    await expect(StakingTokenContract.connect(owner).setSender(sender.address))
      .to.emit(StakingTokenContract, "SetSender")
      .withArgs(sender.address);

    await expect(StakingTokenContract.connect(owner).send()).to.be.reverted;

    await expect(StakingTokenContract.connect(sender).send())
      .to.emit(StakingTokenContract, "Transfer")
      .withArgs(sender.address, sender.address, 0);
  });
});
