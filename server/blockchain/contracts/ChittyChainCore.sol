// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ChittyChainCore is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct Block {
        uint256 blockNumber;
        bytes32 hash;
        bytes32 previousHash;
        uint256 timestamp;
        bytes32 merkleRoot;
        uint256 nonce;
        uint256 difficulty;
        address miner;
    }

    struct Transaction {
        bytes32 hash;
        address from;
        address to;
        uint256 value;
        uint256 gasPrice;
        uint256 gasUsed;
        string txType;
        bytes data;
        uint256 timestamp;
    }

    struct ProofOfAudit {
        uint256 evidenceCount;
        uint256 verificationRate;
        bool auditTrailComplete;
        uint256 complianceScore;
    }

    mapping(uint256 => Block) public blocks;
    mapping(bytes32 => Transaction) public transactions;
    mapping(bytes32 => bool) public validTransactions;
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorizedMiners;
    mapping(address => bool) public authorizedAuditors;

    uint256 public currentBlockNumber;
    uint256 public constant DIFFICULTY = 4;
    uint256 public constant MINING_REWARD = 100 ether;
    uint256 public constant AUDIT_REQUIREMENT = 95; // 95% compliance
    
    bytes32 public constant GENESIS_HASH = keccak256("ChittyChain Genesis Block");

    event BlockMined(uint256 indexed blockNumber, bytes32 indexed hash, address indexed miner);
    event TransactionAdded(bytes32 indexed hash, address indexed from, address indexed to);
    event EvidenceRecorded(bytes32 indexed evidenceHash, string caseId);
    event AuditCompleted(uint256 indexed blockNumber, uint256 complianceScore);

    modifier onlyAuthorizedMiner() {
        require(authorizedMiners[msg.sender] || msg.sender == owner(), "Not authorized to mine");
        _;
    }

    modifier onlyAuthorizedAuditor() {
        require(authorizedAuditors[msg.sender] || msg.sender == owner(), "Not authorized to audit");
        _;
    }

    constructor() {
        _createGenesisBlock();
        authorizedMiners[msg.sender] = true;
        authorizedAuditors[msg.sender] = true;
    }

    function _createGenesisBlock() internal {
        Block memory genesisBlock = Block({
            blockNumber: 0,
            hash: GENESIS_HASH,
            previousHash: bytes32(0),
            timestamp: block.timestamp,
            merkleRoot: bytes32(0),
            nonce: 0,
            difficulty: DIFFICULTY,
            miner: address(0)
        });

        blocks[0] = genesisBlock;
        currentBlockNumber = 0;
        
        emit BlockMined(0, GENESIS_HASH, address(0));
    }

    function addTransaction(
        address to,
        uint256 value,
        string memory txType,
        bytes memory data
    ) external returns (bytes32) {
        bytes32 txHash = keccak256(abi.encodePacked(
            msg.sender,
            to,
            value,
            txType,
            data,
            block.timestamp,
            block.number
        ));

        require(!validTransactions[txHash], "Transaction already exists");

        Transaction memory newTx = Transaction({
            hash: txHash,
            from: msg.sender,
            to: to,
            value: value,
            gasPrice: tx.gasprice,
            gasUsed: 0,
            txType: txType,
            data: data,
            timestamp: block.timestamp
        });

        transactions[txHash] = newTx;
        validTransactions[txHash] = true;

        emit TransactionAdded(txHash, msg.sender, to);
        return txHash;
    }

    function recordEvidence(
        string memory caseId,
        bytes32 evidenceHash,
        string memory ipfsHash,
        bytes memory metadata
    ) external returns (bytes32) {
        bytes memory evidenceData = abi.encode(caseId, evidenceHash, ipfsHash, metadata);
        
        bytes32 txHash = addTransaction(
            address(this),
            0,
            "evidence",
            evidenceData
        );

        emit EvidenceRecorded(evidenceHash, caseId);
        return txHash;
    }

    function validateProofOfAudit(
        bytes32[] memory txHashes
    ) public view returns (ProofOfAudit memory) {
        uint256 evidenceCount = 0;
        uint256 verifiedCount = 0;
        uint256 auditCount = 0;

        for (uint256 i = 0; i < txHashes.length; i++) {
            Transaction memory tx = transactions[txHashes[i]];
            
            if (keccak256(bytes(tx.txType)) == keccak256(bytes("evidence"))) {
                evidenceCount++;
                // Check if evidence is verified (simplified check)
                if (tx.gasUsed > 0) {
                    verifiedCount++;
                }
            }
            
            if (keccak256(bytes(tx.txType)) == keccak256(bytes("audit"))) {
                auditCount++;
            }
        }

        uint256 verificationRate = evidenceCount > 0 ? (verifiedCount * 100) / evidenceCount : 100;
        bool auditTrailComplete = auditCount >= evidenceCount;
        uint256 complianceScore = (verificationRate + (auditTrailComplete ? 100 : 0)) / 2;

        return ProofOfAudit({
            evidenceCount: evidenceCount,
            verificationRate: verificationRate,
            auditTrailComplete: auditTrailComplete,
            complianceScore: complianceScore
        });
    }

    function mineBlock(
        bytes32[] memory txHashes,
        uint256 nonce
    ) external onlyAuthorizedMiner nonReentrant {
        require(txHashes.length > 0, "No transactions to mine");

        // Validate proof of audit
        ProofOfAudit memory auditResult = validateProofOfAudit(txHashes);
        require(auditResult.complianceScore >= AUDIT_REQUIREMENT, "Block failed proof-of-audit validation");

        // Calculate merkle root
        bytes32 merkleRoot = _calculateMerkleRoot(txHashes);
        
        // Create new block
        uint256 newBlockNumber = currentBlockNumber + 1;
        bytes32 previousHash = blocks[currentBlockNumber].hash;
        
        bytes32 blockHash = keccak256(abi.encodePacked(
            newBlockNumber,
            previousHash,
            block.timestamp,
            merkleRoot,
            nonce
        ));

        // Validate mining difficulty (simplified)
        require(_validateDifficulty(blockHash), "Block hash doesn't meet difficulty requirement");

        Block memory newBlock = Block({
            blockNumber: newBlockNumber,
            hash: blockHash,
            previousHash: previousHash,
            timestamp: block.timestamp,
            merkleRoot: merkleRoot,
            nonce: nonce,
            difficulty: DIFFICULTY,
            miner: msg.sender
        });

        blocks[newBlockNumber] = newBlock;
        currentBlockNumber = newBlockNumber;

        // Reward miner
        balances[msg.sender] += MINING_REWARD;

        emit BlockMined(newBlockNumber, blockHash, msg.sender);
        emit AuditCompleted(newBlockNumber, auditResult.complianceScore);
    }

    function _calculateMerkleRoot(bytes32[] memory txHashes) internal pure returns (bytes32) {
        if (txHashes.length == 0) return bytes32(0);
        if (txHashes.length == 1) return txHashes[0];

        bytes32[] memory currentLevel = txHashes;
        
        while (currentLevel.length > 1) {
            bytes32[] memory nextLevel = new bytes32[]((currentLevel.length + 1) / 2);
            
            for (uint256 i = 0; i < currentLevel.length; i += 2) {
                bytes32 left = currentLevel[i];
                bytes32 right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;
                nextLevel[i / 2] = keccak256(abi.encodePacked(left, right));
            }
            
            currentLevel = nextLevel;
        }
        
        return currentLevel[0];
    }

    function _validateDifficulty(bytes32 hash) internal pure returns (bool) {
        // Simplified difficulty check - hash must start with required number of zeros
        for (uint256 i = 0; i < DIFFICULTY; i++) {
            if (hash[i] != 0) {
                return false;
            }
        }
        return true;
    }

    function getBlock(uint256 blockNumber) external view returns (Block memory) {
        return blocks[blockNumber];
    }

    function getTransaction(bytes32 txHash) external view returns (Transaction memory) {
        return transactions[txHash];
    }

    function addAuthorizedMiner(address miner) external onlyOwner {
        authorizedMiners[miner] = true;
    }

    function removeAuthorizedMiner(address miner) external onlyOwner {
        authorizedMiners[miner] = false;
    }

    function addAuthorizedAuditor(address auditor) external onlyOwner {
        authorizedAuditors[auditor] = true;
    }

    function removeAuthorizedAuditor(address auditor) external onlyOwner {
        authorizedAuditors[auditor] = false;
    }

    function getStats() external view returns (
        uint256 totalBlocks,
        uint256 currentBlock,
        uint256 totalMiners,
        uint256 totalAuditors
    ) {
        // Note: This is a simplified implementation
        // In a real system, you'd track these metrics more efficiently
        totalBlocks = currentBlockNumber + 1;
        currentBlock = currentBlockNumber;
        totalMiners = 1; // Simplified
        totalAuditors = 1; // Simplified
    }
}
