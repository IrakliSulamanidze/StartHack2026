"""
Composer package — generates news articles from simulation context.

Supports multiple provider modes:
- template_only: deterministic template-based output (default, no API key needed)
- mock: returns canned responses for testing
- gemini: uses Google Gemini API for richer narrative (requires GEMINI_API_KEY)
"""
