# Security review

This site is a public, low-friction request board. The goal is not bank-grade identity. The goal is to keep casual participation easy while making spam, vote stuffing, and database abuse expensive enough that the site stays usable.

## Current controls

- Submitted request content is escaped before rendering.
- Submitted requests and comments are queued as `Pending` and do not publish until manually approved.
- Emails are optional for submissions and comments and are not displayed publicly.
- New requests and comments can notify Paul by email when `RESEND_API_KEY`, `SUBMISSION_NOTIFY_TO`, and `SUBMISSION_NOTIFY_FROM` are configured.
- API responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Write endpoints require `application/json` and reject oversized request bodies.
- Request submissions are rate-limited by browser voter ID and by a hashed client-IP bucket.
- Comment submissions, core request votes, and submitted request votes are rate-limited by hashed client-IP buckets.
- Rate-limit buckets are stored in D1 without raw IP addresses.

## Cloudflare controls to enable

Cloudflare should still do the edge work before traffic reaches Pages Functions.

### Rate limiting rule

Create a WAF rate limiting rule for API writes:

```txt
Name: API write burst limit
Expression:
(http.host in {"takebackthemac.org" "www.takebackthemac.org"} and starts_with(http.request.uri.path, "/api/") and http.request.method eq "POST")
Characteristic: IP
Limit: 30 requests per 1 minute
Action: Block
Mitigation timeout: 10 minutes
Response: JSON if your plan/UI allows it
```

If the account allows more than one rate limiting rule, split the submission endpoint from voting:

```txt
Name: Request submission limit
Expression:
(http.host in {"takebackthemac.org" "www.takebackthemac.org"} and http.request.uri.path in {"/api/ideas" "/api/comments"} and http.request.method eq "POST")
Characteristic: IP
Limit: 10 requests per 10 minutes
Action: Block
Mitigation timeout: 30 minutes
```

```txt
Name: Vote write limit
Expression:
(http.host in {"takebackthemac.org" "www.takebackthemac.org"} and http.request.uri.path in {"/api/votes" "/api/idea-vote"} and http.request.method eq "POST")
Characteristic: IP
Limit: 30 requests per 1 minute
Action: Block
Mitigation timeout: 10 minutes
```

Cloudflare docs:

- Rate limiting rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Rate limiting parameters: https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/

### Turnstile

If request spam starts, add Cloudflare Turnstile to request submission first. Do not add it to ordinary voting unless vote stuffing becomes a real problem; the site should stay low-friction while it can.

Cloudflare docs:

- Turnstile overview: https://developers.cloudflare.com/turnstile/
- Token validation: https://developers.cloudflare.com/turnstile/get-started/

### Secret

Set a production secret for IP-hash salting:

```sh
openssl rand -hex 32 | npx wrangler pages secret put RATE_LIMIT_SALT --project-name take-back-the-mac
```

This keeps rate-limit keys stable enough to enforce limits without storing raw IP addresses.

Set email notification secrets when ready:

```sh
npx wrangler pages secret put RESEND_API_KEY --project-name take-back-the-mac
npx wrangler pages secret put SUBMISSION_NOTIFY_TO --project-name take-back-the-mac
npx wrangler pages secret put SUBMISSION_NOTIFY_FROM --project-name take-back-the-mac
```

Cloudflare docs:

- Pages bindings, variables, and secrets: https://developers.cloudflare.com/pages/functions/bindings/
- Wrangler Pages secrets: https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-secret-put

## Manual moderation

Requests and comments are stored as `Pending`. The notification email includes SQL you can run after reviewing the text.

Approve a request:

```sh
npx wrangler d1 execute take-back-the-mac-votes --remote --command "UPDATE ideas SET status = 'Open' WHERE id = '<id>';"
```

Reject a request:

```sh
npx wrangler d1 execute take-back-the-mac-votes --remote --command "UPDATE ideas SET status = 'Rejected' WHERE id = '<id>';"
```

Approve a comment:

```sh
npx wrangler d1 execute take-back-the-mac-votes --remote --command "UPDATE comments SET status = 'Open' WHERE id = '<id>';"
```

## Remaining risks

- A distributed attacker can still vote from many IPs. Rate limiting slows cheap abuse; it does not prove identity.
- Email is not verified because it is optional and not an identity system.
- There is no admin/moderation UI yet. Pending requests and comments are approved or rejected through D1 SQL.
- Cloudflare WAF rules on the custom domain may not cover direct `*.pages.dev` deployment URLs. The application-level D1 rate limit exists partly to cover that path.
