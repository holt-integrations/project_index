"""
Data models for Project Viewer.
"""
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from pydantic import BaseModel, Field


class GitCommit(BaseModel):
    """Represents a git commit."""

    sha: str = Field(..., description="Full commit SHA")
    sha_short: str = Field(..., description="Short commit SHA (7 chars)")
    author_name: str = Field(..., description="Commit author name")
    author_email: str = Field(..., description="Commit author email")
    date: datetime = Field(..., description="Commit date")
    message: str = Field(..., description="Full commit message")
    message_short: str = Field(..., description="Short commit message (first line)")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class GitContributor(BaseModel):
    """Represents a contributor to a file."""

    name: str = Field(..., description="Contributor name")
    email: str = Field(..., description="Contributor email")
    commit_count: int = Field(..., description="Number of commits by this contributor")


class GitInfo(BaseModel):
    """Git metadata for a document."""

    last_commit: Optional[GitCommit] = Field(None, description="Last commit that modified this file")
    contributors: Optional[List[GitContributor]] = Field(None, description="List of contributors")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class Document(BaseModel):
    """Represents a single markdown document."""

    name: str = Field(..., description="Filename of the document")
    path: str = Field(..., description="Absolute path to the document")
    relative_path: str = Field(..., description="Path relative to project root")
    size: int = Field(..., description="File size in bytes")
    modified_time: datetime = Field(..., description="Last modification timestamp")
    git_info: Optional[GitInfo] = Field(None, description="Git metadata for this document")

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
    is_git_repo: bool = Field(False, description="Whether this project is a git repository")
    git_remote_url: Optional[str] = Field(None, description="Git remote URL if available")
    git_branch: Optional[str] = Field(None, description="Current git branch")
    git_remote_type: Optional[str] = Field(None, description="Type of remote (github, gitlab, etc.)")

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
