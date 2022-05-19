const VotonV1Token = artifacts.require("VotonV1Token");
const BigNumber = web3.BigNumber;

require('chai')
.use(require('chai-bignumber')(BigNumber))
.should();

contract('VotonV1Token', accounts => {
    const _name = "Voton Token";
    const _symbol = "VOTON";
    const _decimals = 18;

    beforeEach(async function () {
        this.token = await VotonV1Token.new(_name, _symbol, _decimals);
    });

    describe('Token attributes: ', function() {
        it('has the correct name', async function() {
            const name = await this.token.name();
            name.should.equal(_name);
        });
        it('has the correct symbol', async function() {
            const symbol = await this.token.symbol();
            symbol.should.equal(_symbol);
        })
        it('has the correct decimals', async function() {
            const decimals = await this.token.decimals();
            decimals.should.be.bignumber.equal(_decimals);
        })
    })
})