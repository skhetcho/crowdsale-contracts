const VotonV1Token = artifacts.require("./VotonV1Token.sol");
const VotonTokenCrowdsale = artifacts.require("./VotonTokenCrowdsale.sol");



module.exports = async function (deployer) {
    const _name = "Voton Token";
    const _symbol = "VOTON";
    const _decimals = 18;

    deployer.deploy(VotonV1Token, _name, _symbol, _decimals)
        .then(async () => {
            const _rate = 24000;
            const _wallet = 0xcB4836B5954be777220AaCf74da1022251A05fF0;
            const _token = VotonV1Token.address;
            const _cap = ether(4600);
            const _openingTime = parseInt((latestTime().toString()).slice(0, -3)) + duration.minutes(5);
            const _closingTime = 1669881540;
            

            return await deployer.deploy(VotonTokenCrowdsale,
                _rate,
                _wallet,
                _token,
                _cap,
                _openingTime,
                _closingTime,
            );
        })
    return true;

};

function ether(n) {
    return new web3.BigNumber(web3.toWei(n, 'ether'));
}

function latestTime() {
    return (new Date).getTime();
}

const duration = {
    seconds: function (val) { return val; },
    minutes: function (val) { return val * this.seconds(60); },
    hours: function (val) { return val * this.minutes(60); },
    days: function (val) { return val * this.hours(24); },
    weeks: function (val) { return val * this.days(7); },
    years: function (val) { return val * this.days(365); },
};