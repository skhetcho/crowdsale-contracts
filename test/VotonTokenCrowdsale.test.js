import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const VotonTokenCrowdsale = artifacts.require("VotonTokenCrowdsale");
const VotonV1Token = artifacts.require("VotonV1Token");

const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();



contract('VotonTokenCrowdsale', function ([_, wallet, investor1, investor2, investor3, investor4, investor5]) {
    // before(async function() {
    //     // Transfer extra ether to investor1's account for testing
    //     await web3.eth.sendTransaction({ from: investor5, to: investor1, value: ether(75) })
    //   });    
    beforeEach(async function () {
        this.name = "Voton Token";
        this.symbol = "VOTON";
        this.decimals = 18;

        this.rate = 500; //500 tokens per ether
        this.rate_round2 = 250;
        this.wallet = wallet;
        this.cap = ether(100)

        this.intevstoMinCap = ether(0.05);
        this.investorHardCap = ether(2);

        this.openingTime = latestTime() + duration.weeks(1); //starts in a week from now
        this.closingTime = this.openingTime + duration.weeks(1); //runs for a week "ends in two weeks from now"

        //Crowdsale Stage
        this.Round1 = 0;
        this.Round2 = 1;
        this.Round3 = 2;


        //deply the token
        this.token = await VotonV1Token.new(this.name, this.symbol, this.decimals);


        //deploy the crowdsale
        this.crowdsale = await VotonTokenCrowdsale.new(
            this.rate,
            this.wallet,
            this.token.address,
            this.cap,
            this.openingTime,
            this.closingTime,
        );

        //pause the token
        await this.token.pause();

        //transfer the ownership to the crowdsale contract
        await this.token.transferOwnership(this.crowdsale.address)

        //Advance blockchain date/time to the opening time
        await increaseTimeTo(this.openingTime + 1);
    });

    describe('Crowdsale: ', function () {
        it('tracks the token', async function () {
            const token = await this.crowdsale.token();
            token.should.equal(this.token.address);
        });
        it('tracks the rate', async function () {
            const rate = await this.crowdsale.rate();
            rate.should.be.bignumber.equal(this.rate);
        })
        it('tracks beneficiary wallet', async function () {
            const wallet = await this.crowdsale.wallet();
            wallet.should.equal(this.wallet);
        })
    })

    describe('Minted crowdsale: ', async function () {
        it('mints tokens after purchase', async function () {
            const originalTotalSupply = await this.token.totalSupply();
            const value = ether(1)
            await this.crowdsale.sendTransaction({ value: value, from: investor1 })

            const newTotalSupply = await this.token.totalSupply();
            assert.isTrue(newTotalSupply > originalTotalSupply);
        })
    });

    describe('Capped crowdsale: ', function () {
        it('has the correct hard cap', async function () {
            const cap = await this.crowdsale.cap();
            cap.should.be.bignumber.equal(this.cap);
        })
    });

    describe('Accepts payments: ', function () {
        it('should accept payments', async function () {
            const value = ether(1)
            await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled
        })
    })
    describe('Buying tokens: ', function () {
        it('Rejects the transaction - Min cap', async function () {
            const value = this.intevstoMinCap - 215;
            await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.rejectedWith(EVMRevert);
        })
        it('Rejects the transaction - Max cap', async function () {
            const value = this.investorHardCap + 1;
            await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.rejectedWith(EVMRevert);
        })
        it('Allow investor who met minimum cap to contribute below minimum cap', async function () {
            const value1 = ether(0.1); //meets min cap requirement
            await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });

            const value2 = ether(0.003); //contribute below min cap while already meeting min cap requirement
            await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.fulfilled;

        })
        it('Reject investor who met maximum cap to not contribute within requirement', async function () {
            const value1 = ether(2); //meets max cap requirement
            await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });

            const value2 = ether(1); //contribute below max cap while already meeting max cap requirement
            await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
        })
        it('Succeeds & updates the contribution amount', async function () {
            const value = ether(1); //meets max cap requirement
            await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 });
            const contribution = await this.crowdsale.getUserContribution(investor2)
            contribution.should.be.bignumber.equal(value)
        })
        it('Buys token with the correct rate at the given round', async function () {
            const value = ether(1);
            await this.crowdsale.buyTokens(investor3, { value: value, from: investor3 });
            const rate = await this.crowdsale.rate();
            const stage = await this.crowdsale.stage()
            const contribution = await this.crowdsale.getUserContribution(investor3);
            console.log("       Rate: ", rate.toNumber());
            console.log("       Stage: ", stage.toNumber());
            console.log("       investor3 contribution", contribution.toNumber());
            const ethBalance = await web3.eth.getBalance(investor3);
            console.log("       investor3 Eth balance: ", ethBalance.toNumber());
            const tokenBalance = await this.token.balanceOf(investor3);
            console.log("       investor3 Voton balance: ", tokenBalance.toNumber());
        })
    })
    describe('Timed crowdsale: ', function () {
        it('is open', async function () {
            const isClosed = await this.crowdsale.hasClosed();
            isClosed.should.be.false;
        })
    })
    describe('Crowdsale stage: ', function () {
        it('track the crowdsale stage', async function () {
            const stage = await this.crowdsale.stage();
            stage.should.be.bignumber.equal(this.Round1);
        });
        it('Starts at round 1 rate', async function () {
            const rate = await this.crowdsale.rate();
            rate.should.be.bignumber.equal(this.rate)
        });
        it('allows the admin to update the stage & rate', async function () {
            await this.crowdsale.setCrowdsaleStage(this.Round3, { from: _ });
            const stage = await this.crowdsale.stage();
            stage.should.be.bignumber.equal(this.Round3);
            const rate = await this.crowdsale.rate();
            console.log("Rate Round 3: ", rate.toNumber());
        });
        it('prevents non-admin to update the stage', async function () {
            await this.crowdsale.setCrowdsaleStage(this.Round2, { from: investor1 }).should.be.rejectedWith(EVMRevert);
        });
    })
    describe('token transfers', function () {
        it('does not allow investors to transfer tokens during the crowdsale', async function () {
            //buy some tokens first
            await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
            //attempt to transfer tokens during crowdsale
            await this.token.transfer(investor2, 1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
        });
    });
    describe('Finalize crowdsale: ', function () {
        beforeEach(async function () {
            await this.crowdsale.buyTokens(investor2, { value: ether(1), from: investor2 });
            await increaseTimeTo(this.closingTime + 1);
            await this.crowdsale.finalize({ from: _ });
        });
        it("Prevent purchasing", async function () {
            await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 }).should.be.rejectedWith(EVMRevert);
        })
        it("Prevent Minting", async function () {
            const mintingFinished = await this.token.mintingFinished();
            mintingFinished.should.be.true;
        });
        it("Should unpause the token", async function () {
            const paused = await this.token.paused();
            paused.should.be.false;
        });
        it("Should allow investors to transfer the tokens", async function () {
            //attempt to transfer tokens after crowdsale
            await this.token.transfer(investor2, 1, { from: investor2 }).should.be.fulfilled;

        });
        // it("Should transfer ownership to the wallet", async function () {
        //     const owner = await this.token.owner();
        //     owner.should.equal(this.wallet);
        // });
    })
    // describe('Can Retrieve Price from the Oracle: ', function () {
    //     it("Retrieves Rate live: ", async function() {
    //         const price = await this.crowdsale.getLatestPrice();
    //         console.log(price);
    //     })
    // })
})