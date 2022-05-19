//// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25;

import "./ERC20/DetailedERC20.sol";
import "./ERC20/MintableToken.sol";
import "./ERC20/PausableToken.sol";


contract VotonV1Token is MintableToken, PausableToken, DetailedERC20{
    constructor(string _name, string _symbol, uint8 _decimals)
    DetailedERC20(_name, _symbol, _decimals)
    public {

    }
}