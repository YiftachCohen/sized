# Security Policy

## Overview

Sized is a client-side web application. All image processing happens entirely in the browser — no data is sent to any server. There is no backend, database, or external API integration.

## Reporting a Vulnerability

If you discover a security issue, please report it responsibly:

- **GitHub**: Use [private vulnerability reporting](https://github.com/YiftachCohen/sized/security/advisories/new)
- **Email**: Open an issue on GitHub describing the general area of concern (without exposing details), and we will coordinate a private channel

Please do **not** open a public issue for security vulnerabilities.

## Scope

Given the client-side-only architecture, the most relevant security concerns would be:

- XSS or injection through crafted image files
- Dependency vulnerabilities in third-party packages
- Issues in the build/deploy pipeline
