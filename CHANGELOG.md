# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.4.0](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/compare/v0.3.0...v0.4.0) (2023-07-27)


### Features

* Add support for entry zones ([44a8104](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/44a81040f8b5277163f02b00c0254d6c12a962ca))


### Bug Fixes

* Add logging tpBeforeEntry to detailed log ([c2b9dac](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/c2b9dac73aa875940b5f7fcb965b7af2a0364d82))
* Fix mapPriceTargets calculations, add tests ([d12f23b](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/d12f23b89edab26afa37daecfc7415b3ea66279a))
* Fix realized profit for unopened trades ([aa0ea66](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/aa0ea66cc91624c252e61cbce546b10df246ecfb))
* Use updated order for reports ([108c525](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/108c525a5c18b76be6eca082fea1046c2a9ef398))

## 0.3.0 (2023-07-24)


### Features

* Add average trade duration ([fa24650](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/fa2465005df5ec90cba7f1bd306ea11d38e426ee))
* Filter out cross events from output order events ([52c200e](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/52c200edd2b6648932d088687dbdb058831a1c20))
* Update backtracker to use STM ([bd6a499](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/bd6a4996abde2d78a25a6c6d216e74d0f727c206))


### Bug Fixes

* Add cancellation event to charts ([e17ab74](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/e17ab74afc2d7dde3c9dbb4a43fb2cf46f88452c))
* Fix detailed backtracking - add cancel event to log ([18162aa](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/18162aa737e967afe72ba57b9505ad1e50039f43))
* Fix logging data for executed TP ([4d77f46](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/4d77f46e38bd7171202b27455d2112f25cf4df1f))
* Fix NPE when order events are null ([62404cb](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/62404cb26128a00c4c46026fc07a559a4065e117))
* Fix profit for trades closed before first entry ([44bb17e](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/44bb17ebf3932b15186f944cd81508e65e3cc44b))
* Fix reading input dates ([9dedb31](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/9dedb3145baebcd3edaadfcc2e2247a9ded80c87))
* Fix trailing price update for short positions ([2dfd22c](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/2dfd22c9159a65a6764e9299e86fc88d6fd6c863))
* Normalize the direction to uppercase ([517ddb6](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/517ddb6df589301d458e4ae0e577b282ab0d3732))
* Use just date for order date ([bd3e760](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/bd3e760ed85577096a562a56824ccca936ae49ac))
