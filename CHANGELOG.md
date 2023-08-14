# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.6.0](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/compare/v0.5.0...v0.6.0) (2023-08-14)


### ⚠ BREAKING CHANGES

* This change pretty much invalidates the cache
* Changes the cache directory format.

Run command `update-cache` to update existing cache directory.

### Features

* Add amount override ([8e0b9f6](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/8e0b9f653d99bacc29fada8b9500b1274fbe9dd1))
* Add backtracking in "Account" mode ([29ac318](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/29ac31811836f8212fa326a6fee3a55041c45894))
* Add support for ByBit exchange ([4d07cc8](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/4d07cc85876c5f6f938381597036eb3e9b230611))
* Clear scriptName for standalone mode ([c5e5141](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/c5e5141489702f05ed54646af6d8c3f451b87d7f))
* Change default config ([4c93419](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/4c93419fcb0a67a77ced727338d63d4fc652bf30))


### Bug Fixes

* ByBit API - make sure data is sorted and error properly handled ([ec543e5](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/ec543e5a45a6f96b674b458c2bcb8467911ee274))
* Fix account mode ([c73b6a7](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/c73b6a7dae833aeb1890bfd996fb6d4d17266657))
* Fix amount calculation for account mode ([5ee9c84](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/5ee9c847a954fc4d43566f7b76effa5ce5c7ab7b))
* Fix bybit API - replace coin names ([aabc5bd](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/aabc5bde882db29c207c7e883a4641953f1f3682))
* Fix calculateWeightedAverage ([99a6bc2](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/99a6bc228c9a4b58cbb13d4533e8ba4738b4ff2c))
* Fix downloaded data interval ([4c2037d](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/4c2037d6f91a925d145150131bc07831ae6fa3f0))
* Fix types ([8c3b701](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/8c3b701b832cd2bbe46a5c0dc0909d8e1f2db107))

## [0.5.0](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/compare/v0.4.0...v0.5.0) (2023-08-02)


### Features

* Add cornix log .csv format ([34cacdc](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/34cacdcdead59606d7e9339f226c00ba51ed504b))
* Add logging invalid coin tickers ([db4ce44](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/db4ce448e2cf0e5710f8f97754ba095926b220b2))
* Add more details to results summary ([6b2c239](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/6b2c239c803091caec137d6f3aa9617cf9692d6f))
* Add order validation ([f374e0e](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/f374e0ec4353c4ea08aa1c63b68de82848f7220d))
* Add support for overriding cornix config in order ([c50f358](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/c50f358006258da723cf9815d5c929e7c9dad6cf))
* Add support for SL Breakeven and moving target 2 ([29698ab](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/29698ab1aa597e7d6fdad6ad3e6927e98e568ccc))
* Export used cornix config to results .csv ([c47f907](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/c47f9075a88ffef3457a8617abdf447b8f678993))


### Bug Fixes

* Fix bug that caused trailing to be activated by default ([2d7e5c8](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/2d7e5c81e13d3c75104f1ada809acd472d1e1884))
* Fix reporting of all targets achieved ([a101555](https://cryptobot/CryptobotCZ/crypto-trade-backtracker/commit/a101555fed0d2a9fa2dede2eed197df98efb62c8))

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
