"""
Directory scanner for Project Viewer.

Scans the projects directory to find markdown documentation
and generates a manifest file.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

try:
    # Try relative imports (when imported as a module)
    from .models import Document, Project, Manifest, GitInfo, GitCommit
    from . import config
    from . import git_utils
except ImportError:
    # Fall back to absolute imports (when run as a script)
    from models import Document, Project, Manifest, GitInfo, GitCommit
    import config
    import git_utils


def is_excluded_dir(dir_path: Path) -> bool:
    """Check if a directory should be excluded from scanning."""
    return dir_path.name in config.EXCLUDED_DIRS


def is_markdown_file(file_path: Path) -> bool:
    """Check if a file is a markdown file."""
    return file_path.suffix.lower() in config.MARKDOWN_EXTENSIONS


def is_project_root(dir_path: Path) -> bool:
    """
    Determine if a directory is a project root.

    A directory is considered a project root if it contains
    any of the PROJECT_ROOT_MARKERS.
    """
    for marker in config.PROJECT_ROOT_MARKERS:
        if (dir_path / marker).exists():
            return True
    return False


def extract_description_from_readme(readme_path: Path) -> Optional[str]:
    """
    Extract a brief description from a README file.

    Returns the first non-empty paragraph after the title.
    """
    try:
        with open(readme_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Skip lines until we find content after the first heading
        found_heading = False
        description_lines = []

        for line in lines:
            line = line.strip()

            # Skip empty lines at the start
            if not found_heading and not line:
                continue

            # Mark that we've found the title
            if line.startswith('#'):
                found_heading = True
                continue

            # After finding heading, collect non-empty lines
            if found_heading:
                if not line:
                    # Stop at first empty line after content
                    if description_lines:
                        break
                    continue

                description_lines.append(line)

                # Stop after collecting enough (around 200 chars)
                if len(' '.join(description_lines)) > 200:
                    break

        description = ' '.join(description_lines)

        # Truncate if too long
        if len(description) > 250:
            description = description[:247] + "..."

        return description if description else None

    except Exception as e:
        print(f"Warning: Could not read README at {readme_path}: {e}")
        return None


def find_markdown_files(project_root: Path) -> List[Document]:
    """
    Recursively find all markdown files in a project directory.

    Excludes files in EXCLUDED_DIRS.
    """
    documents = []

    try:
        for item in project_root.rglob("*"):
            # Skip if in an excluded directory
            if any(is_excluded_dir(parent) for parent in item.parents if parent != project_root):
                continue

            # Skip if the item itself is an excluded directory
            if item.is_dir() and is_excluded_dir(item):
                continue

            # Process markdown files
            if item.is_file() and is_markdown_file(item):
                try:
                    stat = item.stat()
                    relative_path = item.relative_to(project_root)

                    document = Document(
                        name=item.name,
                        path=str(item.absolute()),
                        relative_path=str(relative_path),
                        size=stat.st_size,
                        modified_time=datetime.fromtimestamp(stat.st_mtime)
                    )
                    documents.append(document)

                except Exception as e:
                    print(f"Warning: Could not process file {item}: {e}")

    except Exception as e:
        print(f"Error scanning {project_root}: {e}")

    return documents


def scan_projects_directory(base_dir: Path) -> List[Project]:
    """
    Scan the base directory for projects.

    A project is any subdirectory that:
    1. Contains a project root marker, OR
    2. Contains at least one markdown file
    """
    projects = []

    if not base_dir.exists():
        print(f"Error: Projects directory does not exist: {base_dir}")
        return projects

    if not base_dir.is_dir():
        print(f"Error: Projects path is not a directory: {base_dir}")
        return projects

    print(f"Scanning {base_dir} for projects...")

    # Iterate through immediate subdirectories
    for item in sorted(base_dir.iterdir()):
        # Skip files and excluded directories
        if not item.is_dir() or is_excluded_dir(item):
            continue

        # Check if this is a project root or contains markdown files
        documents = find_markdown_files(item)

        # Only include if it's a project root OR has markdown files
        if is_project_root(item) or documents:
            # Try to get description from README
            description = None
            readme_path = item / "README.md"
            if readme_path.exists():
                description = extract_description_from_readme(readme_path)

            # Find most recent document modification
            last_modified = None
            if documents:
                last_modified = max(doc.modified_time for doc in documents)

            # Check if this is a git repository and collect git metadata
            is_git = git_utils.is_git_repository(item)
            git_info_dict = {}

            if is_git:
                git_info_dict = git_utils.get_repository_info(item)

                # Get git metadata for documents
                try:
                    from git import Repo
                    repo = Repo(item)

                    for doc in documents:
                        last_commit_dict = git_utils.get_last_commit_for_file(repo, Path(doc.path))
                        if last_commit_dict:
                            # Convert dict to GitCommit model
                            last_commit = GitCommit(**last_commit_dict)
                            doc.git_info = GitInfo(last_commit=last_commit)

                except Exception as e:
                    print(f"  Warning: Could not get git info for documents in {item.name}: {e}")

            project = Project(
                id=item.name,
                name=item.name,
                path=str(item.absolute()),
                description=description,
                documents=documents,
                document_count=len(documents),
                last_modified=last_modified,
                is_git_repo=is_git,
                git_remote_url=git_info_dict.get('remote_url'),
                git_branch=git_info_dict.get('branch'),
                git_remote_type=git_info_dict.get('remote_type')
            )

            projects.append(project)
            git_status = f" [git: {git_info_dict.get('branch', 'N/A')}]" if is_git else ""
            print(f"  Found project: {item.name} ({len(documents)} documents){git_status}")

    return projects


def generate_manifest(projects: List[Project], base_dir: Path) -> Manifest:
    """Generate a manifest from the list of projects."""
    total_documents = sum(p.document_count for p in projects)

    manifest = Manifest(
        scan_time=datetime.now(),
        projects_dir=str(base_dir.absolute()),
        project_count=len(projects),
        document_count=total_documents,
        projects=projects
    )

    return manifest


def save_manifest(manifest: Manifest, output_path: Path) -> None:
    """Save the manifest to a JSON file."""
    # Ensure the output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write the manifest
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest.model_dump(), f, indent=2, default=str)

    print(f"\nManifest saved to: {output_path}")


def main():
    """Main entry point for the scanner."""
    print("=" * 60)
    print("Project Viewer - Directory Scanner")
    print("=" * 60)
    print()

    # Scan for projects
    projects = scan_projects_directory(config.PROJECTS_DIR)

    # Generate manifest
    manifest = generate_manifest(projects, config.PROJECTS_DIR)

    # Save to file
    save_manifest(manifest, config.MANIFEST_PATH)

    # Print summary
    print()
    print("=" * 60)
    print("Scan Complete")
    print("=" * 60)
    print(f"Projects found:  {manifest.project_count}")
    print(f"Documents found: {manifest.document_count}")
    print(f"Scan time:       {manifest.scan_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Print per-project breakdown
    if projects:
        print("Project Breakdown:")
        print("-" * 60)
        for project in sorted(projects, key=lambda p: p.document_count, reverse=True):
            print(f"  {project.name:30s} {project.document_count:4d} documents")

    print()


if __name__ == "__main__":
    main()
