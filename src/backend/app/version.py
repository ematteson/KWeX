"""Version information for KWeX backend."""

VERSION = "0.2.0"
VERSION_NAME = "Task Curation"
BUILD_DATE = "2025-01-28"

def get_version_info() -> dict:
    """Get version information as a dictionary."""
    return {
        "version": VERSION,
        "name": VERSION_NAME,
        "build_date": BUILD_DATE,
    }
