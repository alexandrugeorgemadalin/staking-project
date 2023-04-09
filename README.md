# Staking contract

## Reward distribution algorithm

```
For the algorithm we use the following notation:
R = reward rate per second = total rewards / duration
T = total staked tokens

We will store in a variable called rewardPerToken the sum of the rewards accumulated in the reward distribution from the start to the current moment.

We will store in a mapping called rewardsPerTokenPaid for each user the moment at which it was last time paid

We know that the reward per token at time j1 is equal to:
rj1 = rj0 + R * (j1 - j0) / T

We can calculate the rewards for a user using the followig formula:
reward = stakedBalance[user](rewardPerToken - rewardsPerTokenPaid[user])
We basically can see this formula in two parts:

stakedBalance[user] * rewardPerToken = the reward if the user was in the pool from the beginning of it

stakedBalance[user] * rewardsPerTokenPaid[user] = the reward that the user is not eligible to receive becase he entered the pool at that specific time

Now if we go through an example to be able to deduct the steps of the algorithm:
Lets say we have the following interaction with the pool:
t = 3 Alice stakes 100
t = 5 Bob stakes 200
t = 6 Alice unstakes 100

-----------------------------------------------------------------------
t = 0: we have T = 0, rewardPerToken = 0;
-----------------------------------------------------------------------
t = 3: Alice +100
    rewardPerToken += R * (t3 - t0) / T = 0 because T is 0 for the moment
    rewards[Alice] += tokens[Alice](rewardPerToken - rewardPerTokenPaid[Alice]) = 0
    rewardPerTokenPaid[Alice] = rewardPerToken
    T += 100 = 100
    tokens[Alice] += 100 = 100
-----------------------------------------------------------------------
t = 5: Bob +200
    rewardPerToken += R * (t5 - t3) / T = 2 * R / 100
    rewards[Bob] += tokens[Bob](rewardPerToken - rewardPerTokenPaid[Bob]) = 0
    rewardPerTokenPaid[Bob] = rewardPerToken
    T += 200 = 300
    tokens[Bob] += 200 = 200
-----------------------------------------------------------------------
t = 6: Alice -100
    rewardPerToken += R * (t6 - t5) / T = 2 * R / 100 + R / 300
    rewards[Alice] += tokens[Alice](rewardPerToken - rewardPerTokenPaid[Alice]) =
= 100 * (2 * R / 100 + R / 300 - 0) = 100 * (7 * R / 300)
    rewardPerTokenPaid[Alice] = rewardPerToken
    T -= 100 = 200
    tokens[Alice] -= 100 = 0

```

### Using the steps from above, I implemented the staking contract that calculates the rewards for each second.

### As a bonus, I implemented a mechanism that lets you lock your staked tokens in order to boost the rewards. This locking mechanism can be called only once for all the staked tokens you have and you have to wait until the locking period has elapsed in order to unlock or lock more tokens. Also, in the meantime you have the posibility to stake and unstake more tokens but they will not be locked and will not get boosted rewards. Also, I added a restake functionality that lets you reinvest your tokens in the pool directly without having to claim the rewards and stake them afterwards.

```
I was able to do using by modifying the previous algorithm: each time a user locks their staked tokens, I will remove
the staked tokens from the stakedBalance mapping and add them to the lockedBalance mapping. After that I updated the
total totalStakedBalance:

`totalStakedBalance += stakedAmount * (rewardBoost - 1)`

And when I calculate the rewards I use the following formula:

`rewardsEarned[user] += (stakedBalance[user] + rewardBoost * lockedBalance[user]) * (rewardsPerToken - rewardsPerTokenPaid[user])`
```

### As a first basic implementation, I wanted to keep a mapping with all the rewards and each time someone interacts with the contract to calculate the rewards for all users but that was a poor implementation because it could easily revert the transactions if the contract would have a lot of users that staked tokens.

### For the math part I've watched a video that explains how to calculate the rewards:

`https://www.youtube.com/watch?v=32n3Vu0BK4g`
