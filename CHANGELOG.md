# [1.1.0](https://github.com/a1678991/reinfolib/compare/v1.0.0...v1.1.0) (2026-05-26)


### Features

* **examples:** add CLI demo querying XIT001 transaction prices ([#1](https://github.com/a1678991/reinfolib/issues/1)) ([2f971bc](https://github.com/a1678991/reinfolib/commit/2f971bc2a1f9e5d9a35089293bc551ae0a266a9e))

# 1.0.0 (2026-05-26)


### Bug Fixes

* **release:** drop manual .npmrc step; set NPM_TOKEN for @semantic-release/npm ([754a7ab](https://github.com/a1678991/reinfolib/commit/754a7ab9506db8c32d50de0791734b25c693861b))
* **request:** convert abort during backoff into aborted Result ([711207c](https://github.com/a1678991/reinfolib/commit/711207cb26f2a478c66ba09610e4434913d4b98c))


### Features

* add common parameter zod schemas ([632749e](https://github.com/a1678991/reinfolib/commit/632749e79cc093b7e9fe745267118ae0c9413d69))
* add core request pipeline with rate-limit, retry, and zod validation ([27749af](https://github.com/a1678991/reinfolib/commit/27749afc0b562723a55dd416f1d2fa8cccd60c9b))
* add exponential backoff with full jitter and Retry-After support ([35f55fa](https://github.com/a1678991/reinfolib/commit/35f55fa697dc941900c586af2e45af2fefb4c21c))
* add ReinfolibClient skeleton with category facade stubs ([81e5496](https://github.com/a1678991/reinfolib/commit/81e54963d065a15707a962fb257e9452c6f1475b))
* add ReinfolibError discriminated union ([eb92f3d](https://github.com/a1678991/reinfolib/commit/eb92f3d818f469c6a83b7021c194a4e37fa4e98d))
* add Result<T,E> discriminated union ([e99e304](https://github.com/a1678991/reinfolib/commit/e99e304aaef2218934d6ef5fafdf8490e249fb57))
* add token bucket rate limiter ([ad50536](https://github.com/a1678991/reinfolib/commit/ad50536bceb928ba4f7570d9f3657aa17a3a791b))
* **prices:** add XIT001 transaction-points endpoint ([3767a57](https://github.com/a1678991/reinfolib/commit/3767a578ca7a72be497421f48076c8b0c803ea95))
