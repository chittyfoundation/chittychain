// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PropertyNFT is ERC721 {
    struct Property {
        string address;
        string city;
        uint256 sqft;
        uint8 bedrooms;
        uint8 bathrooms;
        string ipfsHash; // Property images/docs
    }
    
    mapping(uint256 => Property) public properties;
    
    constructor() ERC721("ChittyAssets", "CASSET") {}
    
    function mintProperty(
        address _owner,
        string memory _address,
        string memory _city
    ) public returns (uint256) {
        uint256 tokenId = uint256(keccak256(abi.encodePacked(_address, block.timestamp)));
        _mint(_owner, tokenId);
        return tokenId;
    }
}