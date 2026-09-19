"""
services/ai_service.py
────────────────────────
Rule-based text classification service for determining incident severity.
This acts as a placeholder for a future ML model or LLM integration.
"""

from typing import Tuple

# Predefined keywords for severity classification
HIGH_KEYWORDS = [
    "major fire",
    "people trapped",
    "building collapse",
    "multiple casualties",
    "explosion",
    "severe flood",
    "rapidly spreading flood",
    "life-threatening emergency",
    "trapped"
]

MEDIUM_KEYWORDS = [
    "localized fire",
    "moderate flooding",
    "accident with injuries",
    "urgent assistance required",
    "significant",
    "injuries",
    "urgent"
]

async def classify_severity(description: str) -> Tuple[str, str]:
    """
    Classify the severity of an incident based on its description text.
    
    Returns:
        Tuple[str, str]: (severity, reason)
    """
    if not description:
        return "Low", "No description provided. Defaulting to Low."
        
    desc_lower = description.lower()
    
    # Check for High severity indicators
    for kw in HIGH_KEYWORDS:
        if kw in desc_lower:
            return "High", f"Description contains indicators of a high severity event: '{kw}'."
            
    # Check for Medium severity indicators
    for kw in MEDIUM_KEYWORDS:
        if kw in desc_lower:
            return "Medium", f"Description contains indicators of a medium severity event: '{kw}'."
            
    # Default to Low if no strong indicators found
    return "Low", "Description does not match any strong high/medium indicators. Safely classified as Low."
