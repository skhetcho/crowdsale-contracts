//// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25;

import "./ERC20/ERC20.sol";
import "./ERC20/PausableToken.sol";
import "./ERC20/MintableToken.sol";
import "./crowdsale/Crowdsale.sol";
import "./crowdsale/emission/MintedCrowdsale.sol";
import "./crowdsale/validation/CappedCrowdsale.sol";
import "./crowdsale/validation/TimedCrowdsale.sol";
import "./crowdsale/distribution/FinalizableCrowdsale.sol";
import "./math/SafeMath.sol";
import "@chainlink/contracts/src/v0.4/interfaces/AggregatorV3Interface.sol";

contract VotonTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, FinalizableCrowdsale {
    using SafeMath for uint256;

    //Min investor contribution - $20
    uint256 public investorMinCap = 50000000000000000; //0.05 BNB
    //Max investor contribution - $1000
    uint256 public investorHardCap = 2000000000000000000; //2 BNB
    mapping(address => uint256) public contributions;

    //Crowdsale Stages:
    uint256 public stage = 0;

    //priceAggregator contract address
    AggregatorV3Interface internal priceFeed;


    constructor(
        uint256 _rate,
        address _wallet,
        ERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime
    )
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    public {
        priceFeed = AggregatorV3Interface(
            0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526
        );
    }

    function getUserContribution(address _beneficiary) public view returns (uint256) {
        return contributions[_beneficiary];
    }

    function setCrowdsaleStage(uint256 _stage) public onlyOwner {
        if (_stage == 0) {
            stage = 0;
        } else if (_stage == 1) {
            stage = 1;
        } else if (_stage == 2) {
            stage = 2;
        }
    }

    function _preValidatePurchase (address _beneficiary, uint256 _weiAmount) internal {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        setLatestPriceInternally();
        uint256 _existingContributions = contributions[_beneficiary];
        uint256 _newContribution = _existingContributions.add(_weiAmount);
        require(_newContribution >= investorMinCap && _newContribution <= investorHardCap);
        contributions[_beneficiary] = _newContribution;
    }

    //prevent minting after the crowdsale has been finalized (end time reached)
    function finalization() internal {
        MintableToken _mintableToken = MintableToken(token);
        _mintableToken.finishMinting();
        //unpause the token
        PausableToken _pausableToken = PausableToken(token);
        _pausableToken.unpause();
        _pausableToken.transferOwnership(wallet);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (uint256) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return uint256(price);
    }



    
    function setLatestPriceInternally() internal {
        uint256 currentBNBPrice = getLatestPrice();

        if(stage == 0){
            // Round1: US$0.0012
            rate = currentBNBPrice.mul(250).div(3).div(10 ** 8);
        }
        else if(stage == 1){
            // Round2: US$0.00152
            rate = currentBNBPrice.mul(1250).div(19).div(10 ** 8);
        }
        else if (stage == 2) {
            // Round3: US$0.00376
            rate = currentBNBPrice.mul(1250).div(47).div(10 ** 8);
        }
    }
    function publiclySetLatestPrice() public {
        uint256 currentBNBPrice = getLatestPrice();

        if(stage == 0){
            // Round1: US$0.0024
            rate = currentBNBPrice.mul(1250).div(3).div(10 ** 8);
        }
        else if(stage == 1){
            // Round2: US$0.00304
            rate = currentBNBPrice.mul(6250).div(19).div(10 ** 8);
        }
        else if (stage == 2) {
            // Round3: US$0.00752
            rate = currentBNBPrice.mul(6250).div(47).div(10 ** 8);
        }
    }
}