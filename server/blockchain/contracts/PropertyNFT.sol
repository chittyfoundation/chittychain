// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PropertyNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");
    bytes32 public constant ASSESSOR_ROLE = keccak256("ASSESSOR_ROLE");

    struct PropertyData {
        uint256 tokenId;
        string propertyAddress;
        string legalDescription;
        uint256 squareFootage;
        string propertyType;
        uint256 yearBuilt;
        uint256 conditionScore; // 0-100
        uint256 marketValue;
        uint256 assessedValue;
        string ipfsMetadata;
        uint256 lastInspectionDate;
        address currentOwner;
        bool isActive;
        uint256 mintedAt;
    }

    struct ConditionHistory {
        uint256 timestamp;
        uint256 conditionScore;
        string inspectionType;
        address inspector;
        string ipfsReport;
        string notes;
    }

    struct PropertyImprovement {
        uint256 timestamp;
        string improvementType;
        uint256 costEstimate;
        uint256 conditionImpact;
        address reportedBy;
        bool verified;
        uint256 rewardAmount;
    }

    Counters.Counter private _tokenIdCounter;
    
    // Mappings
    mapping(uint256 => PropertyData) public propertyData;
    mapping(uint256 => ConditionHistory[]) public conditionHistory;
    mapping(uint256 => PropertyImprovement[]) public propertyImprovements;
    mapping(string => uint256) public addressToTokenId;
    mapping(address => uint256[]) public ownerProperties;
    
    // ChittyCash integration
    mapping(uint256 => uint256) public propertyChittyCash;
    mapping(address => uint256) public userChittyCash;
    
    uint256 public constant BASE_CONDITION_SCORE = 70;
    uint256 public constant MAX_CONDITION_SCORE = 100;
    uint256 public constant CHITTY_CASH_MULTIPLIER = 10; // 1 condition point = 10 ChittyCash

    event PropertyMinted(
        uint256 indexed tokenId,
        string propertyAddress,
        address indexed owner
    );
    
    event ConditionUpdated(
        uint256 indexed tokenId,
        uint256 oldScore,
        uint256 newScore,
        address indexed inspector
    );
    
    event PropertyImproved(
        uint256 indexed tokenId,
        string improvementType,
        uint256 conditionImpact,
        uint256 rewardAmount
    );
    
    event ChittyCashRewarded(
        address indexed user,
        uint256 amount,
        string reason
    );

    constructor() ERC721("ChittyProperty", "CPROP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
        _grantRole(INSPECTOR_ROLE, msg.sender);
        _grantRole(ASSESSOR_ROLE, msg.sender);
    }

    function mintProperty(
        address to,
        string memory propertyAddress,
        string memory legalDescription,
        uint256 squareFootage,
        string memory propertyType,
        uint256 yearBuilt,
        uint256 marketValue,
        string memory ipfsMetadata
    ) external onlyRole(PROPERTY_MANAGER_ROLE) nonReentrant {
        require(addressToTokenId[propertyAddress] == 0, "Property already exists");
        require(bytes(propertyAddress).length > 0, "Property address required");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsMetadata);
        
        PropertyData storage newProperty = propertyData[tokenId];
        newProperty.tokenId = tokenId;
        newProperty.propertyAddress = propertyAddress;
        newProperty.legalDescription = legalDescription;
        newProperty.squareFootage = squareFootage;
        newProperty.propertyType = propertyType;
        newProperty.yearBuilt = yearBuilt;
        newProperty.conditionScore = BASE_CONDITION_SCORE;
        newProperty.marketValue = marketValue;
        newProperty.ipfsMetadata = ipfsMetadata;
        newProperty.currentOwner = to;
        newProperty.isActive = true;
        newProperty.mintedAt = block.timestamp;
        
        addressToTokenId[propertyAddress] = tokenId;
        ownerProperties[to].push(tokenId);
        
        // Initial condition record
        ConditionHistory memory initialCondition = ConditionHistory({
            timestamp: block.timestamp,
            conditionScore: BASE_CONDITION_SCORE,
            inspectionType: "Initial Assessment",
            inspector: msg.sender,
            ipfsReport: ipfsMetadata,
            notes: "Property minted with baseline condition"
        });
        
        conditionHistory[tokenId].push(initialCondition);
        
        emit PropertyMinted(tokenId, propertyAddress, to);
    }

    function updateCondition(
        uint256 tokenId,
        uint256 newConditionScore,
        string memory inspectionType,
        string memory ipfsReport,
        string memory notes
    ) external onlyRole(INSPECTOR_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        require(newConditionScore <= MAX_CONDITION_SCORE, "Invalid condition score");
        
        PropertyData storage property = propertyData[tokenId];
        uint256 oldScore = property.conditionScore;
        
        property.conditionScore = newConditionScore;
        property.lastInspectionDate = block.timestamp;
        
        ConditionHistory memory newRecord = ConditionHistory({
            timestamp: block.timestamp,
            conditionScore: newConditionScore,
            inspectionType: inspectionType,
            inspector: msg.sender,
            ipfsReport: ipfsReport,
            notes: notes
        });
        
        conditionHistory[tokenId].push(newRecord);
        
        // Calculate ChittyCash reward for improvement
        if (newConditionScore > oldScore) {
            uint256 improvement = newConditionScore - oldScore;
            uint256 rewardAmount = improvement * CHITTY_CASH_MULTIPLIER;
            
            address propertyOwner = ownerOf(tokenId);
            userChittyCash[propertyOwner] += rewardAmount;
            propertyChittyCash[tokenId] += rewardAmount;
            
            emit ChittyCashRewarded(propertyOwner, rewardAmount, "Property condition improvement");
        }
        
        emit ConditionUpdated(tokenId, oldScore, newConditionScore, msg.sender);
    }

    function recordImprovement(
        uint256 tokenId,
        string memory improvementType,
        uint256 costEstimate,
        uint256 expectedConditionImpact
    ) external {
        require(_exists(tokenId), "Property does not exist");
        require(msg.sender == ownerOf(tokenId) || hasRole(PROPERTY_MANAGER_ROLE, msg.sender), 
                "Not authorized to record improvements");
        
        PropertyImprovement memory improvement = PropertyImprovement({
            timestamp: block.timestamp,
            improvementType: improvementType,
            costEstimate: costEstimate,
            conditionImpact: expectedConditionImpact,
            reportedBy: msg.sender,
            verified: false,
            rewardAmount: 0
        });
        
        propertyImprovements[tokenId].push(improvement);
        
        emit PropertyImproved(tokenId, improvementType, expectedConditionImpact, 0);
    }

    function verifyImprovement(
        uint256 tokenId,
        uint256 improvementIndex,
        uint256 actualConditionImpact
    ) external onlyRole(INSPECTOR_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        require(improvementIndex < propertyImprovements[tokenId].length, "Invalid improvement index");
        
        PropertyImprovement storage improvement = propertyImprovements[tokenId][improvementIndex];
        require(!improvement.verified, "Improvement already verified");
        
        improvement.verified = true;
        improvement.conditionImpact = actualConditionImpact;
        
        // Calculate reward based on actual improvement
        uint256 rewardAmount = actualConditionImpact * CHITTY_CASH_MULTIPLIER * 2; // Bonus for verified improvements
        improvement.rewardAmount = rewardAmount;
        
        address propertyOwner = ownerOf(tokenId);
        userChittyCash[propertyOwner] += rewardAmount;
        propertyChittyCash[tokenId] += rewardAmount;
        
        emit ChittyCashRewarded(propertyOwner, rewardAmount, "Verified property improvement");
    }

    function getPropertyData(uint256 tokenId) external view returns (PropertyData memory) {
        require(_exists(tokenId), "Property does not exist");
        return propertyData[tokenId];
    }

    function getConditionHistory(uint256 tokenId) external view returns (ConditionHistory[] memory) {
        require(_exists(tokenId), "Property does not exist");
        return conditionHistory[tokenId];
    }

    function getPropertyImprovements(uint256 tokenId) external view returns (PropertyImprovement[] memory) {
        require(_exists(tokenId), "Property does not exist");
        return propertyImprovements[tokenId];
    }

    function getPropertiesByOwner(address owner) external view returns (uint256[] memory) {
        return ownerProperties[owner];
    }

    function calculatePropertyValue(uint256 tokenId) external view returns (uint256 adjustedValue) {
        require(_exists(tokenId), "Property does not exist");
        
        PropertyData memory property = propertyData[tokenId];
        
        // Adjust market value based on condition score
        // Score above 80: +10% value, Score below 60: -15% value
        adjustedValue = property.marketValue;
        
        if (property.conditionScore >= 80) {
            adjustedValue = (adjustedValue * 110) / 100; // +10%
        } else if (property.conditionScore < 60) {
            adjustedValue = (adjustedValue * 85) / 100; // -15%
        }
        
        return adjustedValue;
    }

    function getChittyCashBalance(address user) external view returns (uint256) {
        return userChittyCash[user];
    }

    function getPropertyChittyCash(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Property does not exist");
        return propertyChittyCash[tokenId];
    }

    function redeemChittyCash(uint256 amount) external nonReentrant {
        require(userChittyCash[msg.sender] >= amount, "Insufficient ChittyCash balance");
        
        userChittyCash[msg.sender] -= amount;
        
        // In a real implementation, this would interact with a payment system
        // For now, we just emit an event
        emit ChittyCashRewarded(msg.sender, amount, "ChittyCash redeemed");
    }

    function updateMarketValue(uint256 tokenId, uint256 newValue) 
        external 
        onlyRole(ASSESSOR_ROLE) 
    {
        require(_exists(tokenId), "Property does not exist");
        propertyData[tokenId].marketValue = newValue;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            // Update owner properties mapping
            uint256[] storage fromProperties = ownerProperties[from];
            for (uint256 i = 0; i < fromProperties.length; i++) {
                if (fromProperties[i] == tokenId) {
                    fromProperties[i] = fromProperties[fromProperties.length - 1];
                    fromProperties.pop();
                    break;
                }
            }
            
            ownerProperties[to].push(tokenId);
            propertyData[tokenId].currentOwner = to;
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
