---
name: playwright-cli
description: Playwright CLI with SKILLS - Token-efficient browser automation for coding agents
metadata:
  type: reference
---

Playwright CLI provides a token-efficient CLI interface into Playwright for coding agents. It avoids loading large tool schemas and verbose accessibility trees into model context, making it better suited for high-throughput coding agents.

Key Features:
- Token-efficient: Does not force page data into LLM
- SKILLS support: Exposes workflows as SKILLs for agent consumption
- Session management: Preserves browser profile between calls
- Visual dashboard: Monitor and control browser sessions
- Comprehensive commands: Navigation, input, emulation, network, DevTools, etc.

Usage:
- Install: npm install -g @playwright/cli@latest
- Basic commands: open, goto, type, click, fill, press, screenshot, etc.
- Session control: list, close-all, kill-all, show
- Advanced: tracing, video recording, WebMCP, storage state management

References:
- Repository: https://github.com/microsoft/playwright-cli
- Installation: playwright-cli install --skills
- Help: playwright-cli --help