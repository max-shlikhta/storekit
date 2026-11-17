# Security policy

Storekit is a demonstration project, but it handles authentication, sessions and per-store data
isolation, so reports about those areas are welcome.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting instead: open the
[Security tab](https://github.com/max-shlikhta/storekit/security) of this repository and choose
**Report a vulnerability**.

Useful details: what you found, how to reproduce it, and which part of the code it affects.

## What the project already does

- Passwords are hashed with scrypt; sessions are random tokens stored only as SHA-256 hashes.
- Two-factor authentication (TOTP) with single-use recovery codes.
- Sign-in attempts are rate limited, and every request that changes data has its `Origin` checked.
- Each store's data is isolated in the application and by composite foreign keys in the database.
