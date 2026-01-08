"""
Data models for Project Viewer.
"""
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field


class Document(BaseModel):
    """Represents a single markdown document."""

    name: str = Field(..., description="Filename of the document")
    path: str = Field(..., description="Absolute path to the document")
    relative_path: str = Field(..., description="Path relative to project root")
    size: int = Field(..., description="File size in bytes")
    modified_time: datetime = Field(..., description="Last modification timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Project(BaseModel):
    """Represents a project with its documentation."""

    id: str = Field(..., description="Unique identifier (directory name)")
    name: str = Field(..., description="Project name")
    path: str = Field(..., description="Absolute path to project root")
    description: Optional[str] = Field(None, description="Project description from README")
    documents: List[Document] = Field(default_factory=list, description="List of markdown documents")
    document_count: int = Field(0, description="Total number of documents")
    last_modified: Optional[datetime] = Field(None, description="Most recent document modification")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class Manifest(BaseModel):
    """Represents the complete project manifest."""

    scan_time: datetime = Field(default_factory=datetime.now, description="When the scan was performed")
    projects_dir: str = Field(..., description="Base directory that was scanned")
    project_count: int = Field(0, description="Total number of projects found")
    document_count: int = Field(0, description="Total number of documents found")
    projects: List[Project] = Field(default_factory=list, description="List of all projects")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
