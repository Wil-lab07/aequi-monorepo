import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("Lens", function () {
    let lens: Contract;
    let mockV2Pair: Contract;
    let mockV3Pool: Contract;
    let v2Factory: Contract;
    let v3Factory: Contract;
    let tokenA: Contract;
    let tokenB: Contract;
    let tokenC: Contract;

    beforeEach(async function () {
        // Deploy Token Mocks
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        tokenA = await MockERC20.deploy("Token A", "TKA");
        tokenB = await MockERC20.deploy("Token B", "TKB");
        tokenC = await MockERC20.deploy("Token C", "TKC");

        // Deploy Pair/Pool Mocks (for basic data tests)
        const MockUniswapV2Pair = await ethers.getContractFactory("MockUniswapV2Pair");
        mockV2Pair = await MockUniswapV2Pair.deploy(
            tokenA.address,
            tokenB.address,
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("20")
        );

        const MockUniswapV3Pool = await ethers.getContractFactory("MockUniswapV3Pool");
        mockV3Pool = await MockUniswapV3Pool.deploy(
            tokenA.address,
            tokenB.address,
            3000,
            "79228162514264337593543950336", // 1.0
            0,
            ethers.utils.parseEther("100")
        );

        // Deploy Factory Mocks (for discovery tests)
        const MockV2Factory = await ethers.getContractFactory("MockUniswapV2Factory");
        v2Factory = await MockV2Factory.deploy();

        const MockV3Factory = await ethers.getContractFactory("MockUniswapV3Factory");
        v3Factory = await MockV3Factory.deploy();

        // Setup factory mappings
        // V2: A-B exists (using our mock pair address)
        await v2Factory.setPair(tokenA.address, tokenB.address, mockV2Pair.address);

        // V3: A-B exists for 0.3% (using our mock pool) and 0.05% (using fake address)
        await v3Factory.setPool(tokenA.address, tokenB.address, 3000, mockV3Pool.address);
        await v3Factory.setPool(tokenA.address, tokenB.address, 500, "0x0000000000000000000000000000000000000005");

        // Deploy Lens
        const Lens = await ethers.getContractFactory("Lens");
        lens = await Lens.deploy();
    });

    describe("Basic Data Fetching", function () {
        it("should get V2 pool data", async function () {
            const results = await lens.batchGetV2PoolData([mockV2Pair.address]);
            const data = results[0];

            expect(data.exists).to.be.true;
            expect(data.pool).to.equal(mockV2Pair.address);
            expect(data.token0).to.equal(tokenA.address);
            expect(data.reserve0).to.equal(ethers.utils.parseEther("10"));
        });

        it("should get V3 pool data", async function () {
            const results = await lens.batchGetV3PoolData([mockV3Pool.address]);
            const data = results[0];

            expect(data.exists).to.be.true;
            expect(data.pool).to.equal(mockV3Pool.address);
            expect(data.liquidity).to.equal(ethers.utils.parseEther("100"));
            expect(data.fee).to.equal(3000);
        });

        it("should check token balances", async function () {
            const [owner] = await ethers.getSigners();
            const balances = await lens.batchCheckTokenBalances([tokenA.address], owner.address);
            expect(balances[0]).to.equal(ethers.utils.parseEther("1000000"));
        });
    });

    describe("Pool Discovery (Optimization Check)", function () {
        it("should batch discover V2 pools", async function () {
            const requests = [
                { token0: tokenA.address, token1: tokenB.address }, // Exists
                { token0: tokenA.address, token1: tokenC.address }  // Does not exist
            ];

            const gasEstimate = await lens.estimateGas.batchGetV2Pools(v2Factory.address, requests);
            console.log(`Gas for batchGetV2Pools (2 pairs): ${gasEstimate.toString()}`);

            const results = await lens.batchGetV2Pools(v2Factory.address, requests);

            expect(results[0]).to.equal(mockV2Pair.address);
            expect(results[1]).to.equal(ethers.constants.AddressZero);
        });

        it("should batch discover V3 pools (all fees)", async function () {
            const requests = [
                { token0: tokenA.address, token1: tokenB.address }, // Exists
                { token0: tokenA.address, token1: tokenC.address }  // Does not exist
            ];

            const gasEstimate = await lens.estimateGas.batchGetV3PoolsAllFees(v3Factory.address, requests);
            console.log(`Gas for batchGetV3PoolsAllFees (2 pairs, 4 fees each): ${gasEstimate.toString()}`);

            const results = await lens.batchGetV3PoolsAllFees(v3Factory.address, requests);

            // Result 0: A-B
            // Fees: [100, 500, 3000, 10000]
            expect(results[0][0]).to.equal(ethers.constants.AddressZero); // 100
            expect(results[0][1]).to.equal("0x0000000000000000000000000000000000000005"); // 500
            expect(results[0][2]).to.equal(mockV3Pool.address); // 3000
            expect(results[0][3]).to.equal(ethers.constants.AddressZero); // 10000

            // Result 1: A-C (None)
            expect(results[1][0]).to.equal(ethers.constants.AddressZero);
            expect(results[1][1]).to.equal(ethers.constants.AddressZero);
            expect(results[1][2]).to.equal(ethers.constants.AddressZero);
            expect(results[1][3]).to.equal(ethers.constants.AddressZero);
        });
    });
});
