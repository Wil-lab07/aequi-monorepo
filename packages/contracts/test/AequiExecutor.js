const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AequiExecutor", function () {
  let AequiExecutor;
  let executor;
  let MockERC20;
  let tokenA;
  let tokenB;
  let owner;
  let user;
  let recipient;
  let other;

  beforeEach(async function () {
    [owner, user, recipient, other] = await ethers.getSigners();

    // Deploy Executor
    AequiExecutor = await ethers.getContractFactory("AequiExecutor");
    executor = await AequiExecutor.deploy();
    await executor.waitForDeployment();

    // Deploy Mock Tokens
    MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA", ethers.parseEther("10000"));
    await tokenA.waitForDeployment();
    tokenB = await MockERC20.deploy("Token B", "TKB", ethers.parseEther("10000"));
    await tokenB.waitForDeployment();

    // Distribute tokens
    await tokenA.transfer(user.address, ethers.parseEther("1000"));
    await tokenB.transfer(user.address, ethers.parseEther("1000"));
  });

  describe("Execution", function () {
    it("Should pull tokens from sender", async function () {
      const amount = ethers.parseEther("100");
      await tokenA.connect(user).approve(executor.target, amount);

      const pulls = [
        {
          token: tokenA.target,
          amount: amount,
        },
      ];

      await executor.connect(user).execute(
        pulls,
        [], // approvals
        [], // calls
        recipient.address,
        [tokenA.target] // flush tokenA
      );

      expect(await tokenA.balanceOf(recipient.address)).to.equal(amount);
      expect(await tokenA.balanceOf(user.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should set and revoke approvals", async function () {
      const amount = ethers.parseEther("100");
      await tokenA.connect(user).approve(executor.target, amount);

      const pulls = [
        {
          token: tokenA.target,
          amount: amount,
        },
      ];

      // We will approve 'other' to spend tokens from executor
      const approvals = [
        {
          token: tokenA.target,
          spender: other.address,
          amount: amount,
          revokeAfter: true,
        },
      ];

      // A call that checks allowance would be ideal, but for now we just check if it runs without revert
      // and if allowance is 0 afterwards (because revokeAfter is true)
      
      // To verify allowance during execution, we would need a helper contract. 
      // For this test, we rely on the fact that if revokeAfter is true, it should be 0 at the end.
      
      await executor.connect(user).execute(
        pulls,
        approvals,
        [],
        recipient.address,
        [tokenA.target]
      );

      // Since we flushed, balance is 0, but allowance should also be reset to 0
      expect(await tokenA.allowance(executor.target, other.address)).to.equal(0);
    });

    it("Should not revoke approvals if revokeAfter is false", async function () {
        const amount = ethers.parseEther("100");
        await tokenA.connect(user).approve(executor.target, amount);
  
        const pulls = [
          {
            token: tokenA.target,
            amount: amount,
          },
        ];
  
        const approvals = [
          {
            token: tokenA.target,
            spender: other.address,
            amount: amount,
            revokeAfter: false,
          },
        ];
  
        await executor.connect(user).execute(
          pulls,
          approvals,
          [],
          recipient.address,
          [tokenA.target]
        );
  
        // Allowance should remain
        expect(await tokenA.allowance(executor.target, other.address)).to.equal(amount);
      });

    it("Should perform arbitrary calls", async function () {
      // We will make the executor call 'mint' on tokenB to the recipient
      const mintAmount = ethers.parseEther("50");
      const callData = tokenB.interface.encodeFunctionData("mint", [recipient.address, mintAmount]);

      const calls = [
        {
          target: tokenB.target,
          value: 0,
          data: callData,
        },
      ];

      await executor.connect(user).execute(
        [], // pulls
        [], // approvals
        calls,
        recipient.address,
        [] // flush
      );

      expect(await tokenB.balanceOf(recipient.address)).to.equal(mintAmount);
    });

    it("Should flush native ETH", async function () {
      const ethAmount = ethers.parseEther("1");
      
      const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);

      await executor.connect(user).execute(
        [],
        [],
        [],
        recipient.address,
        [],
        { value: ethAmount }
      );

      const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalRecipientBalance - initialRecipientBalance).to.equal(ethAmount);
    });

    it("Should flush remaining tokens", async function () {
        const amount = ethers.parseEther("100");
        await tokenA.connect(user).approve(executor.target, amount);
  
        const pulls = [
          {
            token: tokenA.target,
            amount: amount,
          },
        ];
  
        await executor.connect(user).execute(
          pulls,
          [],
          [],
          recipient.address,
          [tokenA.target]
        );
  
        expect(await tokenA.balanceOf(recipient.address)).to.equal(amount);
    });

    it("Should revert if pull fails", async function () {
        const amount = ethers.parseEther("100");
        // No approval given
  
        const pulls = [
          {
            token: tokenA.target,
            amount: amount,
          },
        ];
  
        await expect(
            executor.connect(user).execute(
            pulls,
            [],
            [],
            recipient.address,
            []
          )
        ).to.be.revertedWithCustomError(executor, "TokenTransferFailed");
    });

    it("Should revert if external call fails", async function () {
        // Call a non-existent function or force fail
        const calls = [
            {
              target: tokenA.target,
              value: 0,
              data: "0xdeadbeef", // Invalid selector likely to revert or do nothing if fallback not present, but MockERC20 has no fallback so it might revert or just succeed if no match? 
              // Actually solidity contracts without fallback revert on unknown selector.
            },
          ];
    
          await expect(
              executor.connect(user).execute(
              [],
              [],
              calls,
              recipient.address,
              []
            )
          ).to.be.reverted; // We expect a revert, specific message depends on how solidity handles it (ExternalCallFailed custom error in Executor)
    });
  });
});
