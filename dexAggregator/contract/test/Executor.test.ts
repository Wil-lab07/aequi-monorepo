import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Executor", function () {
    let executor: Contract;
    let tokenA: Contract;
    let tokenB: Contract;
    let mockRouter: Contract;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let other: SignerWithAddress;

    beforeEach(async function () {
        [owner, user, other] = await ethers.getSigners();

        // Deploy Mocks
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        tokenA = await MockERC20.deploy("Token A", "TKA");
        tokenB = await MockERC20.deploy("Token B", "TKB");

        const MockRouter = await ethers.getContractFactory("MockRouter");
        mockRouter = await MockRouter.deploy();

        // Deploy Executor
        const Executor = await ethers.getContractFactory("Executor");
        executor = await Executor.deploy(owner.address);

        // Setup initial balances
        await tokenA.mint(user.address, ethers.utils.parseEther("100"));
        await tokenB.mint(mockRouter.address, ethers.utils.parseEther("100")); // Fund router for swaps
    });

    describe("Core Logic", function () {
        it("should pull tokens from user", async function () {
            const amount = ethers.utils.parseEther("10");
            await tokenA.connect(user).approve(executor.address, amount);

            const pulls = [{ token: tokenA.address, amount: amount }];
            const approvals: any[] = [];
            const calls: any[] = [];
            const tokensToFlush = [tokenA.address];

            const balanceUserBefore = await tokenA.balanceOf(user.address);

            // Execute: Pull 10 -> Executor holds 10 -> Flush 10 -> User holds same as before
            await executor.connect(user).execute(pulls, approvals, calls, tokensToFlush);

            const balanceUserAfter = await tokenA.balanceOf(user.address);
            expect(balanceUserAfter).to.equal(balanceUserBefore);
        });

        it("should process swap with mock router and injection", async function () {
            // User has TokenA. Wants TokenB.
            // Path: TokenA -> Executor -> Router (Swap) -> User

            const amountIn = ethers.utils.parseEther("1");
            const amountOut = ethers.utils.parseEther("0.95");

            await tokenA.connect(user).approve(executor.address, amountIn);

            // 1. Pull TokenA
            const pulls = [{ token: tokenA.address, amount: amountIn }];

            // 2. Approve Router
            const approvals = [{
                token: tokenA.address,
                spender: mockRouter.address,
                amount: amountIn
            }];

            // 3. Call Router (with Injection)
            // We construct calldata for: mockRouter.swap(tokenA, tokenB, placeholder, amountOut, recipient)
            // The 'placeholder' (amountIn) is at offset: 4 (sig) + 32 (tA) + 32 (tB) = 68 bytes?
            // standard abi encoding:
            // swap(address,address,uint256,uint256,address)
            // 0: tokenIn (32)
            // 1: tokenOut (32)
            // 2: amountIn (32) <-- Injection Target
            // 3: amountOut (32)
            // 4: recipient (32)

            const abiCoder = new ethers.utils.AbiCoder();
            const sig = mockRouter.interface.getSighash("swap"); // 4 bytes
            const params = abiCoder.encode(
                ["address", "address", "uint256", "uint256", "address"],
                [tokenA.address, tokenB.address, 0, amountOut, user.address] // 0 is placeholder
            );

            // Remove 0x prefix from params
            const callData = sig + params.slice(2);

            // Offset calculation for 'amountIn' (the 3rd parameter index 2)
            // 32 bytes * 2 = 64 bytes offset in the data parameters.
            // So relative to 'data' start (including sig): 4 + 64 = 68.
            // However, AequiExecutor.sol uses assembly `add(add(data, 32), offset)`
            // The `data` memory pointer points to length. 32 bytes later is content.
            // Offset should be relative to content start.
            // Content: Sig (4) + P0 (32) + P1 (32) + P2 (32).
            // Offset to P2 = 4 + 32 + 32 = 68.

            const calls = [{
                target: mockRouter.address,
                value: 0,
                data: callData,
                injectToken: tokenA.address,
                injectOffset: 68 // 4 + 32 + 32
            }];

            const tokensToFlush = [tokenA.address, tokenB.address];

            // Execute
            await expect(
                executor.connect(user).execute(pulls, approvals, calls, tokensToFlush)
            )
                .to.emit(mockRouter, "Swap")
                .withArgs(tokenA.address, tokenB.address, amountIn, amountOut, user.address);

            // Verify User got TokenB
            expect(await tokenB.balanceOf(user.address)).to.equal(amountOut);
        });
    });

    describe("Security / Snapshots", function () {
        it("should prevent Bank Robbery (Disaster B)", async function () {
            // Scenario: Executor has 1M USDT (TokenB) fees.
            const fees = ethers.utils.parseEther("1000000");
            await tokenB.mint(executor.address, fees);

            // User does a swap wbnb -> 50 USDT
            const amountIn = ethers.utils.parseEther("1"); // WBNB
            const amountOut = ethers.utils.parseEther("50"); // USDT

            await tokenA.mint(user.address, amountIn);
            await tokenA.connect(user).approve(executor.address, amountIn);

            // Setup Calls
            const pulls = [{ token: tokenA.address, amount: amountIn }];
            const approvals = [{ token: tokenA.address, spender: mockRouter.address, amount: amountIn }];

            // Mock Swap Data
            const sig = mockRouter.interface.getSighash("swap");
            const abiCoder = new ethers.utils.AbiCoder();
            const params = abiCoder.encode(
                ["address", "address", "uint256", "uint256", "address"],
                [tokenA.address, tokenB.address, amountIn, amountOut, executor.address] // Send outcome to Executor to trigger flush
            );
            const callData = sig + params.slice(2);

            const calls = [{
                target: mockRouter.address,
                value: 0,
                data: callData,
                injectToken: ethers.constants.AddressZero, // No injection needed for this test
                injectOffset: 0
            }];

            // IMPORTANT: We flush TokenB.
            // If logic is WRONG (no snapshot), user gets 1,000,050.
            // If logic is RIGHT, user gets 50.
            const tokensToFlush = [tokenB.address];

            // Before: User has 0 TokenB. Fee = 1M.
            // After: User should have 50. Fee = 1M.
            await executor.connect(user).execute(pulls, approvals, calls, tokensToFlush);

            expect(await tokenB.balanceOf(user.address)).to.equal(amountOut); // 50
            expect(await tokenB.balanceOf(executor.address)).to.equal(fees); // 1,000,000
        });

        it("should prevent Black Hole (Disaster A - ETH)", async function () {
            // Scenario: User sends 1 ETH. Uses 0. Refund 1 ETH.
            // The contract snapshot logic: 'balance - msg.value' ensures correct baseline.

            const valueSent = ethers.utils.parseEther("1");

            const pulls: any[] = [];
            const approvals: any[] = [];
            const calls: any[] = []; // Do nothing
            const tokensToFlush: any[] = []; // Flush ETH is automatic, don't pass AddressZero as it triggers erc20 check

            // We check balances
            // User sends 1 ETH. Executor receives 1 ETH.
            // Flush sees: Current (1) > Before (0). Refunds 1.
            // Net change for user should be approx 0 (minus gas).
            // Since we are sending value, we need to provide tokens buffer if needed? No calls = 0 used.

            const tx = await executor.connect(user).execute(pulls, approvals, calls, tokensToFlush, { value: valueSent });
            await tx.wait();

            // Harder to check exact ETH balance due to gas, but we can check usage.
            await expect(tx).to.changeEtherBalance(executor, 0); // Executor should keep NOTHING.
        });
    });

    describe("Optimization Strategy", function () {
        it("should verify Off-Chain Optimization (Infinite Approval)", async function () {
            // Step 1: User does Swap #1
            const amount = ethers.utils.parseEther("10");
            await tokenA.mint(user.address, amount.mul(2)); // User has 20
            await tokenA.connect(user).approve(executor.address, amount.mul(2));

            const pulls = [{ token: tokenA.address, amount: amount }];
            const approvals = [{
                token: tokenA.address,
                spender: mockRouter.address,
                amount: ethers.constants.MaxUint256
            }];
            const calls: any[] = [];
            const tokensToFlush = [tokenA.address];

            // Execute Swap 1 (First Time - Triggers Approve)
            await executor.connect(user).execute(pulls, approvals, calls, tokensToFlush);

            // Verify: Executor -> Router allowance is now MAX (Infinite)
            const allowance = await tokenA.allowance(executor.address, mockRouter.address);
            expect(allowance).to.equal(ethers.constants.MaxUint256);

            // Step 2: User does Swap #2 (Simulating Off-Chain check finding allowance > 0)
            const pulls2 = [{ token: tokenA.address, amount: amount }];
            const approvalsOffChainOptimized: any[] = []; // SEND EMPTY!

            // Execute Swap 2 (Second Time - No Approvals Passed)
            // This relies on the previous infinite approval.
            await expect(
                executor.connect(user).execute(pulls2, approvalsOffChainOptimized, calls, tokensToFlush)
            ).to.not.reverted;
        });
    });
});
