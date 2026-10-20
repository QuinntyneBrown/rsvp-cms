# Security policy

rsvp-cms stores personal data about guests: names, email addresses, meal choices and dietary or allergy details. We take reports of security issues seriously and thank everyone who reports them responsibly.

## Supported versions

rsvp-cms has not had a release yet. Until version 1.0, only the latest commit on `main` receives security fixes.

| Version | Supported |
|---|---|
| `main` | Yes |

## Reporting a vulnerability

**Do not report security vulnerabilities through public GitHub issues, discussions or pull requests.**

Report them privately through GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/QuinntyneBrown/rsvp-cms/security) of the repository.
2. Select **Report a vulnerability**.
3. Fill in the form.

Please include as much of the following as you can:

- The type of issue, for example broken access control, injection, cross-site scripting or exposure of guest data.
- The full paths of the source files involved.
- The location of the affected code: tag, branch, commit or direct URL.
- Any special configuration needed to reproduce the issue.
- Step-by-step instructions to reproduce it.
- Proof-of-concept or exploit code, if you have it.
- The impact, including how an attacker could use the issue.

## What to expect

- We will acknowledge your report within **3 business days**.
- We will send an initial assessment within **10 business days**.
- We will keep you informed while we work on a fix, and tell you when it is released.
- We will credit you in the advisory unless you ask us not to.

## Coordinated disclosure

Please give us a reasonable amount of time to fix the issue before you disclose it publicly. We will publish a GitHub security advisory once a fix is available.

## Scope

In scope:

- Code in this repository.
- Any way a guest could see another guest's data, or a guest or anonymous user could reach organizer-only features.
- Weaknesses in invitation links or invitation codes, such as guessable values or links that keep working after they are regenerated.

Out of scope:

- Deployments of rsvp-cms run by third parties. Report those to the operator.
- Denial-of-service attacks, spam and social engineering.
- Reports from automated scanners that do not show a real impact.
