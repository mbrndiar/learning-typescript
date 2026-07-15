# 🤝 Typed Task Client

`TaskClient` owns HTTP request construction, timeouts, status handling, and
response validation. `RestTaskStorage` adapts it to the capstone's storage
contract and translates HTTP 404 responses into `TaskNotFoundError`.
