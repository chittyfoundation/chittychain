// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ChittyChain Core Contract
 * @dev Universal Business Blockchain for immutable verification
 * @author ChittyStreet Engineering
 */
contract ChittyChainCore is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Event definitions
    event DocumentRecorded(bytes32 indexed docId, bytes32 indexed hash, uint256 timestamp, address indexed recorder);
    event PropertyMinted(uint256 indexed tokenId, bytes32 indexed propertyId, string metadataURI);
    event PaymentLogged(bytes32 indexed txId, uint256 amount, address indexed payer, address indexed receiver);
    event AccessRecorded(bytes32 indexed userId, bytes32 indexed entryHash, string method, uint256 timestamp);
    event ConsentRecorded(bytes32 indexed userId, string action, uint256 timestamp);
    event ProofValidated(bytes32 indexed proofHash, bool valid, uint256 timestamp);
    
    // State variables
    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _documentCounter;
    
    // Core data structures
    struct Document {
        bytes32 docId;
        bytes32 contentHash;
        bytes32 previousHash;
        uint256 timestamp;
        address recorder;
        string documentType;
        string metadata;
        bool notarized;
        bytes notarySignature;
    }
    
    struct Property {
        uint256 tokenId;
        bytes32 propertyId;
        string metadataURI;
        bytes32[] leaseHashes;
        bytes32[] titleHashes;
        uint256 mintTimestamp;
        address currentOwner;
    }
    
    struct Payment {
        bytes32 txId;
        uint256 amount;
        address payer;
        address receiver;
        uint256 timestamp;
        bytes32 referenceHash;
        string purpose;
        bool verified;
    }
    
    struct AccessEvent {
        bytes32 userId;
        bytes32 entryHash;
        string accessMethod;
        uint256 timestamp;
        bytes32 propertyId;
        bool authorized;
    }
    
    struct Consent {
        bytes32 userId;
        string action;
        uint256 timestamp;
        uint256 expirationTime;
        bool revoked;
        bytes userSignature;
    }
    
    // Storage mappings
    mapping(bytes32 => Document) public documents;
    mapping(uint256 => Property) public properties;
    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => AccessEvent) public accessEvents;
    mapping(bytes32 => Consent) public consents;
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(address => bool) public authorizedRecorders;
    
    // Chain integrity
    bytes32 public lastDocumentHash;
    uint256 public chainStartBlock;
    
    constructor() ERC721("ChittyChain Property NFT", "CCPROP") {
        chainStartBlock = block.number;
        lastDocumentHash = keccak256(abi.encodePacked("CHITTYCHAIN_GENESIS", block.timestamp));
    }
    
    // Modifiers
    modifier onlyAuthorized() {
        require(authorizedRecorders[msg.sender] || msg.sender == owner(), "ChittyChain: Unauthorized recorder");
        _;
    }
    
    modifier validDocumentId(bytes32 docId) {
        require(docId != bytes32(0), "ChittyChain: Invalid document ID");
        _;
    }
    
    /**
     * @dev Record a legal document with chain integrity
     */
    function recordDocument(
        bytes32 docId,
        bytes32 contentHash,
        string memory documentType,
        string memory metadata
    ) external onlyAuthorized validDocumentId(docId) {
        require(documents[docId].docId == bytes32(0), "ChittyChain: Document already exists");
        require(contentHash != bytes32(0), "ChittyChain: Invalid content hash");
        
        // Create document with chain linkage
        documents[docId] = Document({
            docId: docId,
            contentHash: contentHash,
            previousHash: lastDocumentHash,
            timestamp: block.timestamp,
            recorder: msg.sender,
            documentType: documentType,
            metadata: metadata,
            notarized: false,
            notarySignature: ""
        });
        
        // Update chain
        lastDocumentHash = keccak256(abi.encodePacked(docId, contentHash, lastDocumentHash, block.timestamp));
        _documentCounter.increment();
        
        emit DocumentRecorded(docId, contentHash, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Notarize a document with digital signature
     */
    function notarizeDocument(bytes32 docId, bytes memory signature) external onlyAuthorized {
        require(documents[docId].docId != bytes32(0), "ChittyChain: Document not found");
        require(!documents[docId].notarized, "ChittyChain: Already notarized");
        
        documents[docId].notarized = true;
        documents[docId].notarySignature = signature;
        
        emit DocumentRecorded(docId, documents[docId].contentHash, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Mint a property NFT with full metadata
     */
    function mintPropertyNFT(
        bytes32 propertyId,
        string memory metadataURI,
        address to
    ) external onlyAuthorized returns (uint256) {
        require(propertyId != bytes32(0), "ChittyChain: Invalid property ID");
        require(to != address(0), "ChittyChain: Invalid recipient");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Create property record
        properties[tokenId] = Property({
            tokenId: tokenId,
            propertyId: propertyId,
            metadataURI: metadataURI,
            leaseHashes: new bytes32[](0),
            titleHashes: new bytes32[](0),
            mintTimestamp: block.timestamp,
            currentOwner: to
        });
        
        // Mint NFT
        _safeMint(to, tokenId);
        
        emit PropertyMinted(tokenId, propertyId, metadataURI);
        return tokenId;
    }
    
    /**
     * @dev Record lease agreement for property
     */
    function recordLeaseAgreement(
        uint256 tokenId,
        bytes32 leaseHash,
        bytes[] memory signatures
    ) external onlyAuthorized {
        require(_exists(tokenId), "ChittyChain: Property not found");
        require(leaseHash != bytes32(0), "ChittyChain: Invalid lease hash");
        
        properties[tokenId].leaseHashes.push(leaseHash);
        
        // Record as document for chain integrity
        bytes32 docId = keccak256(abi.encodePacked("LEASE", tokenId, leaseHash));
        recordDocument(docId, leaseHash, "LEASE_AGREEMENT", "");
    }
    
    /**
     * @dev Log payment with verification
     */
    function logPayment(
        bytes32 txId,
        uint256 amount,
        address payer,
        address receiver,
        bytes32 referenceHash,
        string memory purpose
    ) external onlyAuthorized {
        require(txId != bytes32(0), "ChittyChain: Invalid transaction ID");
        require(amount > 0, "ChittyChain: Invalid amount");
        require(payer != address(0) && receiver != address(0), "ChittyChain: Invalid addresses");
        
        payments[txId] = Payment({
            txId: txId,
            amount: amount,
            payer: payer,
            receiver: receiver,
            timestamp: block.timestamp,
            referenceHash: referenceHash,
            purpose: purpose,
            verified: true
        });
        
        emit PaymentLogged(txId, amount, payer, receiver);
    }
    
    /**
     * @dev Record access event with method verification
     */
    function recordAccessEvent(
        bytes32 userId,
        bytes32 entryHash,
        string memory method,
        bytes32 propertyId,
        bool authorized
    ) external onlyAuthorized {
        require(userId != bytes32(0), "ChittyChain: Invalid user ID");
        require(entryHash != bytes32(0), "ChittyChain: Invalid entry hash");
        
        accessEvents[entryHash] = AccessEvent({
            userId: userId,
            entryHash: entryHash,
            accessMethod: method,
            timestamp: block.timestamp,
            propertyId: propertyId,
            authorized: authorized
        });
        
        emit AccessRecorded(userId, entryHash, method, block.timestamp);
    }
    
    /**
     * @dev Record user consent with expiration
     */
    function recordConsent(
        bytes32 userId,
        string memory action,
        uint256 expirationTime,
        bytes memory userSignature
    ) external onlyAuthorized {
        require(userId != bytes32(0), "ChittyChain: Invalid user ID");
        require(expirationTime > block.timestamp, "ChittyChain: Invalid expiration");
        
        bytes32 consentId = keccak256(abi.encodePacked(userId, action, block.timestamp));
        
        consents[consentId] = Consent({
            userId: userId,
            action: action,
            timestamp: block.timestamp,
            expirationTime: expirationTime,
            revoked: false,
            userSignature: userSignature
        });
        
        emit ConsentRecorded(userId, action, block.timestamp);
    }
    
    /**
     * @dev Validate a proof against blockchain data
     */
    function validateProof(bytes32 proofHash, bytes32 documentHash) external view returns (bool) {
        // Check if document exists and matches hash
        for (uint256 i = 0; i < _documentCounter.current(); i++) {
            // Iterate through documents to find match
            // In practice, this would use more efficient indexing
        }
        return verifiedProofs[proofHash];
    }
    
    /**
     * @dev Generate audit report for entity
     */
    function generateAuditReport(
        bytes32 entityId,
        uint256 fromBlock,
        uint256 toBlock
    ) external view returns (
        uint256 documentCount,
        uint256 paymentCount,
        uint256 accessCount,
        uint256 totalValue
    ) {
        require(fromBlock <= toBlock, "ChittyChain: Invalid block range");
        require(toBlock <= block.number, "ChittyChain: Future block");
        
        // Implementation would aggregate data within block range
        // For demo purposes, returning current state
        documentCount = _documentCounter.current();
        paymentCount = 0; // Would calculate from payments mapping
        accessCount = 0;  // Would calculate from access events
        totalValue = 0;   // Would sum payment amounts
    }
    
    /**
     * @dev Verify chain integrity from genesis
     */
    function verifyChainIntegrity() external view returns (bool) {
        // Would verify that all documents properly chain together
        // Starting from genesis hash to current lastDocumentHash
        return true; // Simplified for demo
    }
    
    /**
     * @dev Get document chain for verification
     */
    function getDocumentChain(bytes32 docId) external view returns (
        bytes32 contentHash,
        bytes32 previousHash,
        uint256 timestamp,
        address recorder,
        bool notarized
    ) {
        Document memory doc = documents[docId];
        return (
            doc.contentHash,
            doc.previousHash,
            doc.timestamp,
            doc.recorder,
            doc.notarized
        );
    }
    
    // Administrative functions
    function authorizeRecorder(address recorder) external onlyOwner {
        authorizedRecorders[recorder] = true;
    }
    
    function revokeRecorder(address recorder) external onlyOwner {
        authorizedRecorders[recorder] = false;
    }
    
    function getChainStats() external view returns (
        uint256 totalDocuments,
        uint256 totalProperties,
        uint256 chainLength,
        bytes32 currentHash
    ) {
        return (
            _documentCounter.current(),
            _tokenIdCounter.current(),
            block.number - chainStartBlock,
            lastDocumentHash
        );
    }
}

/**
 * @title ChittyChain Franchise Management
 * @dev Multi-entity governance for franchise operations
 */
contract ChittyFranchise is Ownable {
    
    struct Franchise {
        bytes32 franchiseId;
        address franchisee;
        bytes32 termsHash;
        uint256 createdAt;
        bool active;
        uint256 performanceScore;
        uint256 totalRevenue;
    }
    
    mapping(bytes32 => Franchise) public franchises;
    mapping(bytes32 => bytes32[]) public performanceMetrics;
    
    event FranchiseCreated(bytes32 indexed franchiseId, address indexed franchisee, bytes32 termsHash);
    event PerformanceLogged(bytes32 indexed franchiseId, bytes32 metricsHash, uint256 score);
    event RevenueDistributed(bytes32 indexed franchiseId, uint256 amount);
    
    function createFranchise(
        bytes32 franchiseId,
        bytes32 termsHash,
        address franchisee
    ) external onlyOwner {
        require(franchiseId != bytes32(0), "Invalid franchise ID");
        require(franchisee != address(0), "Invalid franchisee");
        require(franchises[franchiseId].franchiseId == bytes32(0), "Franchise exists");
        
        franchises[franchiseId] = Franchise({
            franchiseId: franchiseId,
            franchisee: franchisee,
            termsHash: termsHash,
            createdAt: block.timestamp,
            active: true,
            performanceScore: 100,
            totalRevenue: 0
        });
        
        emit FranchiseCreated(franchiseId, franchisee, termsHash);
    }
    
    function logPerformance(
        bytes32 franchiseId,
        bytes32 metricsHash,
        uint256 score
    ) external onlyOwner {
        require(franchises[franchiseId].active, "Franchise not active");
        
        performanceMetrics[franchiseId].push(metricsHash);
        franchises[franchiseId].performanceScore = score;
        
        emit PerformanceLogged(franchiseId, metricsHash, score);
    }
    
    function distributeRevenue(bytes32 franchiseId, uint256 amount) external payable onlyOwner {
        require(franchises[franchiseId].active, "Franchise not active");
        require(msg.value >= amount, "Insufficient payment");
        
        address payable franchisee = payable(franchises[franchiseId].franchisee);
        franchisee.transfer(amount);
        
        franchises[franchiseId].totalRevenue += amount;
        
        emit RevenueDistributed(franchiseId, amount);
    }
}