import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("Lens", function () {
    let lens: Contract;
    let mockV2Pair: Contract;
    let mockV3Pool: Contract;
    let tokenA: Contract;
    let tokenB: Contract;

    beforeEach(async function () {
        // Deploy Mocks
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        tokenA = await MockERC20.deploy("Token A", "TKA");
        tokenB = await MockERC20.deploy("Token B", "TKB");

        const MockUniswapV2Pair = await ethers.getContractFactory("MockUniswapV2Pair");
        // token0, token1, reserve0, reserve1
        mockV2Pair = await MockUniswapV2Pair.deploy(
            tokenA.address,
            tokenB.address,
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("20")
        );

        const MockUniswapV3Pool = await ethers.getContractFactory("MockUniswapV3Pool");
        // token0, token1, fee, sqrtPriceX96, tick, liquidity
        mockV3Pool = await MockUniswapV3Pool.deploy(
            tokenA.address,
            tokenB.address,
            3000,
            "79228162514264337593543950336", // 1.0 (Square root of 1 * 2^96)
            0,
            ethers.utils.parseEther("100")
        );

        // Deploy Lens
        const Lens = await ethers.getContractFactory("Lens");
        lens = await Lens.deploy();
    });

    it("should get V2 pool data", async function () {
        const results = await lens.batchGetV2PoolData([mockV2Pair.address]);
        const data = results[0];

        expect(data.exists).to.be.true;
        expect(data.pool).to.equal(mockV2Pair.address);
        // Note: Mock constructor assigns token0/token1 directly. 
        // Lens reads token0() which returns what we passed.
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
        const [owner] = await ethers.getSigners(); // Owner has 1M minted by mock constructor
        const balances = await lens.batchCheckTokenBalances([tokenA.address], owner.address);

        expect(balances[0]).to.equal(ethers.utils.parseEther("1000000"));
    });
});
