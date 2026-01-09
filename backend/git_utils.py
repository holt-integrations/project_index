"""
Git integration utilities for Project Viewer.

Provides functions to extract git metadata from repositories.
"""
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime
import re

try:
    from git import Repo, InvalidGitRepositoryError, GitCommandError
    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    print("Warning: GitPython not available. Git integration disabled.")


def is_git_repository(project_path: Path) -> bool:
    """
    Check if a path is a git repository.

    Args:
        project_path: Path to check

    Returns:
        True if path contains a .git directory or is within a git repo
    """
    if not GIT_AVAILABLE:
        return False

    try:
        Repo(project_path)
        return True
    except (InvalidGitRepositoryError, Exception):
        return False


def get_repository_info(project_path: Path) -> Dict[str, Optional[str]]:
    """
    Get basic git repository information.

    Args:
        project_path: Path to git repository

    Returns:
        Dictionary with remote_url, branch, and remote_type
    """
    if not GIT_AVAILABLE:
        return {}

    try:
        repo = Repo(project_path)

        # Get remote URL
        remote_url = None
        remote_type = None
        if repo.remotes:
            try:
                remote_url = repo.remotes.origin.url
                remote_type = parse_remote_type(remote_url)
            except Exception:
                pass

        # Get current branch
        branch = None
        try:
            if not repo.head.is_detached:
                branch = repo.active_branch.name
            else:
                # Detached HEAD - use short SHA
                branch = repo.head.commit.hexsha[:7]
        except Exception:
            pass

        return {
            'remote_url': remote_url,
            'branch': branch,
            'remote_type': remote_type
        }

    except Exception as e:
        print(f"Warning: Could not get repository info for {project_path}: {e}")
        return {}


def parse_remote_type(remote_url: str) -> Optional[str]:
    """
    Parse git remote URL to determine hosting service.

    Args:
        remote_url: Git remote URL (SSH or HTTPS)

    Returns:
        'github', 'gitlab', 'bitbucket', or 'other'
    """
    if not remote_url:
        return None

    url_lower = remote_url.lower()

    if 'github.com' in url_lower:
        return 'github'
    elif 'gitlab.com' in url_lower:
        return 'gitlab'
    elif 'bitbucket.org' in url_lower:
        return 'bitbucket'
    else:
        return 'other'


def get_last_commit_for_file(repo: Repo, file_path: Path) -> Optional[Dict]:
    """
    Get the last commit that modified a file.

    Args:
        repo: GitPython Repo object
        file_path: Absolute path to file

    Returns:
        Dictionary with commit metadata or None if no commits found
    """
    if not GIT_AVAILABLE:
        return None

    try:
        # Get relative path from repo root
        repo_root = Path(repo.working_dir)
        try:
            relative_path = file_path.relative_to(repo_root)
        except ValueError:
            # File not in repo
            return None

        # Get last commit for this file
        commits = list(repo.iter_commits(paths=str(relative_path), max_count=1))

        if not commits:
            return None

        commit = commits[0]

        # Get commit message (short = first line only)
        message = commit.message.strip()
        message_short = message.split('\n')[0][:100]  # First line, max 100 chars

        return {
            'sha': commit.hexsha,
            'sha_short': commit.hexsha[:7],
            'author_name': commit.author.name,
            'author_email': commit.author.email,
            'date': datetime.fromtimestamp(commit.committed_date),
            'message': message,
            'message_short': message_short
        }

    except Exception as e:
        print(f"Warning: Could not get last commit for {file_path}: {e}")
        return None


def get_commit_history(repo: Repo, file_path: Path, limit: int = 50) -> List[Dict]:
    """
    Get commit history for a file.

    Args:
        repo: GitPython Repo object
        file_path: Absolute path to file
        limit: Maximum number of commits to return

    Returns:
        List of commit dictionaries
    """
    if not GIT_AVAILABLE:
        return []

    try:
        # Get relative path from repo root
        repo_root = Path(repo.working_dir)
        try:
            relative_path = file_path.relative_to(repo_root)
        except ValueError:
            return []

        # Get commit history with --follow to track renames
        commits = list(repo.iter_commits(
            paths=str(relative_path),
            max_count=limit
        ))

        history = []
        for commit in commits:
            message = commit.message.strip()
            message_short = message.split('\n')[0][:100]

            # Get stats for this commit
            stats = {
                'insertions': 0,
                'deletions': 0,
                'files_changed': 0
            }

            try:
                if commit.parents:
                    # Compare with parent to get stats
                    parent = commit.parents[0]
                    diff = parent.diff(commit)
                    stats['files_changed'] = len(diff)

                    for diff_item in diff:
                        if diff_item.a_path == str(relative_path) or diff_item.b_path == str(relative_path):
                            # Get diff stats for our file
                            diff_text = repo.git.diff(
                                parent.hexsha,
                                commit.hexsha,
                                '--',
                                str(relative_path),
                                '--numstat'
                            )
                            if diff_text:
                                parts = diff_text.split()
                                if len(parts) >= 2:
                                    try:
                                        stats['insertions'] = int(parts[0]) if parts[0] != '-' else 0
                                        stats['deletions'] = int(parts[1]) if parts[1] != '-' else 0
                                    except ValueError:
                                        pass
            except Exception:
                pass

            history.append({
                'sha': commit.hexsha,
                'sha_short': commit.hexsha[:7],
                'author_name': commit.author.name,
                'author_email': commit.author.email,
                'date': datetime.fromtimestamp(commit.committed_date),
                'message': message,
                'message_short': message_short,
                'stats': stats
            })

        return history

    except Exception as e:
        print(f"Warning: Could not get commit history for {file_path}: {e}")
        return []


def get_contributors(repo: Repo, file_path: Path) -> List[Dict]:
    """
    Get list of contributors for a file.

    Args:
        repo: GitPython Repo object
        file_path: Absolute path to file

    Returns:
        List of contributor dictionaries with name, email, and commit count
    """
    if not GIT_AVAILABLE:
        return []

    try:
        # Get relative path from repo root
        repo_root = Path(repo.working_dir)
        try:
            relative_path = file_path.relative_to(repo_root)
        except ValueError:
            return []

        # Get all commits for this file
        commits = list(repo.iter_commits(paths=str(relative_path)))

        # Count commits per author
        contributors_map = {}
        for commit in commits:
            author_key = f"{commit.author.name}|{commit.author.email}"

            if author_key not in contributors_map:
                contributors_map[author_key] = {
                    'name': commit.author.name,
                    'email': commit.author.email,
                    'commit_count': 0
                }

            contributors_map[author_key]['commit_count'] += 1

        # Sort by commit count (descending)
        contributors = sorted(
            contributors_map.values(),
            key=lambda x: x['commit_count'],
            reverse=True
        )

        return contributors

    except Exception as e:
        print(f"Warning: Could not get contributors for {file_path}: {e}")
        return []


def get_diff(repo: Repo, file_path: Path, from_sha: str, to_sha: str) -> Dict:
    """
    Get diff between two commits for a file.

    Args:
        repo: GitPython Repo object
        file_path: Absolute path to file
        from_sha: Starting commit SHA
        to_sha: Ending commit SHA

    Returns:
        Dictionary with diff text and stats
    """
    if not GIT_AVAILABLE:
        return {'diff': '', 'stats': {'insertions': 0, 'deletions': 0}}

    try:
        # Get relative path from repo root
        repo_root = Path(repo.working_dir)
        try:
            relative_path = file_path.relative_to(repo_root)
        except ValueError:
            return {'diff': '', 'stats': {'insertions': 0, 'deletions': 0}}

        # Get diff between commits
        diff_text = repo.git.diff(from_sha, to_sha, '--', str(relative_path))

        # Get stats
        stats = {'insertions': 0, 'deletions': 0}
        try:
            numstat = repo.git.diff(
                from_sha,
                to_sha,
                '--',
                str(relative_path),
                '--numstat'
            )
            if numstat:
                parts = numstat.split()
                if len(parts) >= 2:
                    try:
                        stats['insertions'] = int(parts[0]) if parts[0] != '-' else 0
                        stats['deletions'] = int(parts[1]) if parts[1] != '-' else 0
                    except ValueError:
                        pass
        except Exception:
            pass

        return {
            'diff': diff_text,
            'stats': stats
        }

    except Exception as e:
        print(f"Warning: Could not get diff for {file_path}: {e}")
        return {'diff': '', 'stats': {'insertions': 0, 'deletions': 0}}


def generate_remote_file_url(
    remote_url: str,
    branch: str,
    file_path: Path,
    repo_root: Path,
    commit_sha: Optional[str] = None
) -> Optional[str]:
    """
    Generate URL to view file on remote hosting service.

    Args:
        remote_url: Git remote URL
        branch: Branch name
        file_path: Absolute path to file
        repo_root: Repository root path
        commit_sha: Optional commit SHA (if provided, link to specific commit)

    Returns:
        URL to file on remote service, or None if cannot generate
    """
    if not remote_url:
        return None

    try:
        # Convert SSH to HTTPS
        url = remote_url
        if url.startswith('git@'):
            # git@github.com:user/repo.git -> https://github.com/user/repo
            url = url.replace(':', '/', 1).replace('git@', 'https://')

        # Remove .git suffix
        url = url.rstrip('.git')

        # Get relative path from repo root
        try:
            relative_path = file_path.relative_to(repo_root)
        except ValueError:
            return None

        # Generate URL based on hosting service
        remote_type = parse_remote_type(remote_url)

        if remote_type == 'github':
            if commit_sha:
                return f"{url}/blob/{commit_sha}/{relative_path}"
            else:
                return f"{url}/blob/{branch}/{relative_path}"

        elif remote_type == 'gitlab':
            if commit_sha:
                return f"{url}/-/blob/{commit_sha}/{relative_path}"
            else:
                return f"{url}/-/blob/{branch}/{relative_path}"

        elif remote_type == 'bitbucket':
            if commit_sha:
                return f"{url}/src/{commit_sha}/{relative_path}"
            else:
                return f"{url}/src/{branch}/{relative_path}"

        else:
            # Unknown service, can't generate URL
            return None

    except Exception as e:
        print(f"Warning: Could not generate remote URL: {e}")
        return None


def generate_commit_url(remote_url: str, commit_sha: str) -> Optional[str]:
    """
    Generate URL to view commit on remote hosting service.

    Args:
        remote_url: Git remote URL
        commit_sha: Commit SHA

    Returns:
        URL to commit on remote service, or None if cannot generate
    """
    if not remote_url or not commit_sha:
        return None

    try:
        # Convert SSH to HTTPS
        url = remote_url
        if url.startswith('git@'):
            url = url.replace(':', '/', 1).replace('git@', 'https://')

        # Remove .git suffix
        url = url.rstrip('.git')

        # Generate URL based on hosting service
        remote_type = parse_remote_type(remote_url)

        if remote_type == 'github':
            return f"{url}/commit/{commit_sha}"
        elif remote_type == 'gitlab':
            return f"{url}/-/commit/{commit_sha}"
        elif remote_type == 'bitbucket':
            return f"{url}/commits/{commit_sha}"
        else:
            return None

    except Exception as e:
        print(f"Warning: Could not generate commit URL: {e}")
        return None
