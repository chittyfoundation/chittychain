// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PropertyNFT is ERC721 {
    struct Property {
        string propertyAddress;
        string city;
        uint256 sqft;
        uint8 bedrooms;
        uint8 bathrooms;
        string ipfsHash; // Property images/docs
        uint256 value; // Property value in wei
        bool isActive;
    }
    
    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public ownerProperties;
    
    uint256 private _tokenIdCounter;
    
    event PropertyMinted(uint256 indexed tokenId, address indexed owner, string propertyAddress);
    event PropertyUpdated(uint256 indexed tokenId, uint256 newValue);
    
    constructor() ERC721("ChittyAssets", "CASSET") {}
    
    function mintProperty(
        address _owner,
        string memory _address,
        string memory _city,
        uint256 _sqft,
        uint8 _bedrooms,
        uint8 _bathrooms,
        string memory _ipfsHash,
        uint256 _value
    ) public returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _mint(_owner, tokenId);
        
        properties[tokenId] = Property({
            propertyAddress: _address,
            city: _city,
            sqft: _sqft,
            bedrooms: _bedrooms,
            bathrooms: _bathrooms,
            ipfsHash: _ipfsHash,
            value: _value,
            isActive: true
        });
        
        ownerProperties[_owner].push(tokenId);
        
        emit PropertyMinted(tokenId, _owner, _address);
        
        return tokenId;
    }
    
    function updatePropertyValue(uint256 _tokenId, uint256 _newValue) public {
        require(_exists(_tokenId), "Property does not exist");
        require(ownerOf(_tokenId) == msg.sender, "Only owner can update value");
        
        properties[_tokenId].value = _newValue;
        
        emit PropertyUpdated(_tokenId, _newValue);
    }
    
    function getProperty(uint256 _tokenId) public view returns (Property memory) {
        require(_exists(_tokenId), "Property does not exist");
        return properties[_tokenId];
    }
    
    function getOwnerProperties(address _owner) public view returns (uint256[] memory) {
        return ownerProperties[_owner];
    }
}
