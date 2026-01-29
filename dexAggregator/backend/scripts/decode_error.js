const { ethers } = require("ethers");

// Define errors
const abi = [
    "error ExecutionFailed(uint256 index, address target, bytes reason)",
    "error InvalidInjectionOffset(uint256 offset, uint256 length)",
    "error ZeroAmountInjection()"
];

const iface = new ethers.Interface(abi);

const errorData = "0xbe44d5fa00000000000000000000000000000000000000000000000000000000000000010000000000000000000000003bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4414bf389000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d00000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e00000000000000000000000000000000000000000000000000000000697b9fb0000000000000000000000000000000000000000000000000000000049a0b7c68000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

try {
    const decoded = iface.parseError(errorData);
    console.log("Decoded Error Name:", decoded.name);
    console.log("Args:", decoded.args);

    const reason = decoded.args[2];
    console.log("Reason Bytes:", reason);

    // Attempt to decode reason if it looks like a string
    try {
        const reasonString = ethers.toUtf8String(reason);
        console.log("Reason String:", reasonString);
    } catch {
        console.log("Reason is not UTF8 string");
    }
} catch (e) {
    console.error("Failed to decode:", e);
}
