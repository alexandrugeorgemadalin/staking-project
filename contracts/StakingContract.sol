// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error DeadlineMustBeInTheFuture();
error RewardsPoolAmountMustBeGreaterThanZero();
error PoolNotCreated();
error StakingPeriodEnded();
error StakedAmountMustBeGreaterThanZero();
error UnstakeAmountMustBeGreaterThanZero();
error InsufficientStakedBalance();
error NoRewardsEarned();

contract StakingContract is AccessControl {
    IERC20 public stakingToken;

    // used to store the staked balance of each user
    mapping(address => uint256) public stakedBalance;
    // used to store the rewards per token paid to each user
    mapping(address => uint256) public rewardsPerTokenPaid;
    // used to store the rewards earned by each user
    mapping(address => uint256) public rewardsEarned;

    // used to check if the pool has been created
    bool public isPoolCreated;
    // used to store the total staked balance
    uint256 public totalStakedBalance;
    // used to store the deadline of the staking period
    uint256 public deadline;
    // used to store the rewards pool amount
    uint256 public rewardsPoolAmount;
    // used to store the rewards rate per second
    uint256 public rewardsRatePerSecond;
    // used to store the rewards per token
    uint256 public rewardsPerToken;
    // used to store the last update time
    uint256 public lastUpdateTime;

    event PoolCreated(uint256 rewardsPoolAmount, uint256 deadline);
    event Staked(address user, uint256 amount);
    event Unstaked(address user, uint256 amount);
    event ClaimedRewards(address user, uint256 amount);
    event Restaked(address user, uint256 amount);

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createPool(uint256 _rewardsPoolAmount, uint256 _days) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_days == 0) {
            revert DeadlineMustBeInTheFuture();
        }

        if (_rewardsPoolAmount == 0) {
            revert RewardsPoolAmountMustBeGreaterThanZero();
        }

        rewardsPoolAmount = _rewardsPoolAmount;
        deadline = block.timestamp + (_days * 1 days);
        isPoolCreated = true;
        rewardsRatePerSecond = (_rewardsPoolAmount * 1e18) / (_days * 1 days);
        lastUpdateTime = block.timestamp;
        stakingToken.transferFrom(msg.sender, address(this), _rewardsPoolAmount);

        emit PoolCreated(_rewardsPoolAmount, deadline);
    }

    function stake(uint256 _amount) public {
        if (!isPoolCreated) {
            revert PoolNotCreated();
        }

        if (block.timestamp > deadline) {
            revert StakingPeriodEnded();
        }

        if (_amount == 0) {
            revert StakedAmountMustBeGreaterThanZero();
        }

        _stake(_amount);
    }

    function _stake(uint256 _amount) internal {
        // this is to prevent paying rewards after the deadline
        uint256 currentTimestamp = block.timestamp > deadline ? deadline : block.timestamp;

        if (totalStakedBalance != 0) {
            rewardsPerToken += ((rewardsRatePerSecond * (currentTimestamp - lastUpdateTime) * 1e18) /
                totalStakedBalance);
        }

        lastUpdateTime = currentTimestamp;
        rewardsEarned[msg.sender] += stakedBalance[msg.sender] * (rewardsPerToken - rewardsPerTokenPaid[msg.sender]);
        rewardsPerTokenPaid[msg.sender] = rewardsPerToken;
        stakedBalance[msg.sender] += _amount;
        totalStakedBalance += _amount;
        stakingToken.transferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) public {
        if (!isPoolCreated) {
            revert PoolNotCreated();
        }

        if (_amount == 0) {
            revert UnstakeAmountMustBeGreaterThanZero();
        }

        if (stakedBalance[msg.sender] < _amount) {
            revert InsufficientStakedBalance();
        }

        _unstake(_amount);
    }

    function _unstake(uint256 _amount) internal {
        uint256 currentTimestamp = block.timestamp > deadline ? deadline : block.timestamp;

        if (totalStakedBalance != 0) {
            rewardsPerToken += (rewardsRatePerSecond * (currentTimestamp - lastUpdateTime) * 1e18) / totalStakedBalance;
        }

        lastUpdateTime = currentTimestamp;
        rewardsEarned[msg.sender] +=
            (stakedBalance[msg.sender] * (rewardsPerToken - rewardsPerTokenPaid[msg.sender])) /
            1e18;
        rewardsPerTokenPaid[msg.sender] = rewardsPerToken;
        stakedBalance[msg.sender] -= _amount;
        totalStakedBalance -= _amount;
        stakingToken.transfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _amount);
    }

    function claimRewards() public {
        if (!isPoolCreated) {
            revert PoolNotCreated();
        }

        _claimRewards();
    }

    function _claimRewards() internal {
        uint256 currentTimestamp = block.timestamp > deadline ? deadline : block.timestamp;

        if (totalStakedBalance != 0) {
            rewardsPerToken += (rewardsRatePerSecond * (currentTimestamp - lastUpdateTime) * 1e18) / totalStakedBalance;
        }

        lastUpdateTime = currentTimestamp;
        rewardsEarned[msg.sender] +=
            (stakedBalance[msg.sender] * (rewardsPerToken - rewardsPerTokenPaid[msg.sender])) /
            1e18;
        rewardsPerTokenPaid[msg.sender] = rewardsPerToken;

        if (rewardsEarned[msg.sender] == 0) {
            revert NoRewardsEarned();
        }

        uint256 earnedReward = rewardsEarned[msg.sender] / 1e18;
        rewardsEarned[msg.sender] = 0;
        stakingToken.transfer(msg.sender, earnedReward);

        emit ClaimedRewards(msg.sender, earnedReward);
    }

    function getRewardsAmount() public view returns (uint256) {
        uint256 currentTimestamp = block.timestamp > deadline ? deadline : block.timestamp;
        uint256 rewardPerToken = rewardsPerToken;
        if (totalStakedBalance != 0) {
            rewardPerToken += (rewardsRatePerSecond * (currentTimestamp - lastUpdateTime) * 1e18) / totalStakedBalance;
        }

        return
            (rewardsEarned[msg.sender] +
                stakedBalance[msg.sender] *
                (rewardPerToken - rewardsPerTokenPaid[msg.sender])) / 1e18 ** 2;
    }

    // defined only for testing purposes
    function getRewardsEarned(address _address) public view returns (uint256) {
        return rewardsEarned[_address];
    }

    function getStakedBalance(address _address) public view returns (uint256) {
        return stakedBalance[_address];
    }

    function getRewardsPerTokenPaid(address _address) public view returns (uint256) {
        return rewardsPerTokenPaid[_address];
    }

    function restake() public {
        if (!isPoolCreated) {
            revert PoolNotCreated();
        }

        if (block.timestamp > deadline) {
            revert StakingPeriodEnded();
        }

        if (getRewardsAmount() == 0) {
            revert NoRewardsEarned();
        }

        _restake();
    }

    function _restake() internal {
        uint256 currentTimestamp = block.timestamp > deadline ? deadline : block.timestamp;

        if (totalStakedBalance != 0) {
            rewardsPerToken += ((rewardsRatePerSecond * (currentTimestamp - lastUpdateTime) * 1e18) /
                totalStakedBalance);
        }

        lastUpdateTime = currentTimestamp;
        rewardsEarned[msg.sender] += stakedBalance[msg.sender] * (rewardsPerToken - rewardsPerTokenPaid[msg.sender]);
        rewardsPerTokenPaid[msg.sender] = rewardsPerToken;
        uint256 earnedRewards = rewardsEarned[msg.sender] / 1e18 ** 2;
        rewardsEarned[msg.sender] = 0;
        stakedBalance[msg.sender] += earnedRewards;
        totalStakedBalance += earnedRewards;

        emit Restaked(msg.sender, earnedRewards);
    }
}
