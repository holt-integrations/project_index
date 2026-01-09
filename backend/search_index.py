"""
Full-text search index using SQLite FTS5.

Provides fast content search across all markdown documents.
"""
import sqlite3
import re
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class SearchIndex:
    """Full-text search index using SQLite FTS5."""

    def __init__(self, db_path: Path):
        """
        Initialize search index.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = None

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection, creating if needed."""
        if self.conn is None:
            self.conn = sqlite3.connect(str(self.db_path))
            self.conn.row_factory = sqlite3.Row
        return self.conn

    def create_index(self):
        """Create FTS5 virtual table and metadata table."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create FTS5 virtual table for full-text search
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                path UNINDEXED,
                project_id UNINDEXED,
                name,
                content,
                headers,
                modified_time UNINDEXED
            )
        """)

        # Create metadata table for tracking indexed documents
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS indexed_metadata (
                path TEXT PRIMARY KEY,
                indexed_time TEXT NOT NULL,
                modified_time TEXT NOT NULL,
                size INTEGER NOT NULL
            )
        """)

        conn.commit()

    def index_document(
        self,
        path: str,
        project_id: str,
        name: str,
        content: str,
        modified_time: datetime,
        size: int
    ):
        """
        Add document to search index.

        Args:
            path: Absolute path to document
            project_id: Project identifier
            name: Document filename
            content: Full document content
            modified_time: Last modification time
            size: File size in bytes
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Extract headers for separate indexing (better ranking)
        headers = self._extract_headers(content)

        # Insert into FTS5 table
        cursor.execute("""
            INSERT INTO documents_fts (path, project_id, name, content, headers, modified_time)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (path, project_id, name, content, headers, modified_time.isoformat()))

        # Insert metadata
        cursor.execute("""
            INSERT OR REPLACE INTO indexed_metadata (path, indexed_time, modified_time, size)
            VALUES (?, ?, ?, ?)
        """, (path, datetime.now().isoformat(), modified_time.isoformat(), size))

        conn.commit()

    def update_document(
        self,
        path: str,
        project_id: str,
        name: str,
        content: str,
        modified_time: datetime,
        size: int
    ):
        """
        Update existing document in index.

        Args:
            path: Absolute path to document
            project_id: Project identifier
            name: Document filename
            content: Full document content
            modified_time: Last modification time
            size: File size in bytes
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Remove old entry
        cursor.execute("DELETE FROM documents_fts WHERE path = ?", (path,))

        # Re-index
        headers = self._extract_headers(content)
        cursor.execute("""
            INSERT INTO documents_fts (path, project_id, name, content, headers, modified_time)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (path, project_id, name, content, headers, modified_time.isoformat()))

        # Update metadata
        cursor.execute("""
            INSERT OR REPLACE INTO indexed_metadata (path, indexed_time, modified_time, size)
            VALUES (?, ?, ?, ?)
        """, (path, datetime.now().isoformat(), modified_time.isoformat(), size))

        conn.commit()

    def remove_document(self, path: str):
        """
        Remove document from index.

        Args:
            path: Absolute path to document
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM documents_fts WHERE path = ?", (path,))
        cursor.execute("DELETE FROM indexed_metadata WHERE path = ?", (path,))

        conn.commit()

    def search(
        self,
        query: str,
        project_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """
        Search documents and return results with snippets.

        Args:
            query: Search query (supports FTS5 syntax)
            project_id: Optional project filter
            limit: Maximum results to return
            offset: Pagination offset

        Returns:
            List of search results with snippets
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Build query
        sql = """
            SELECT
                path,
                project_id,
                name,
                snippet(documents_fts, 3, '<mark>', '</mark>', '...', 40) as snippet,
                rank
            FROM documents_fts
            WHERE documents_fts MATCH ?
        """

        params = [query]

        if project_id:
            sql += " AND project_id = ?"
            params.append(project_id)

        sql += """
            ORDER BY rank
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])

        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                results.append({
                    'path': row['path'],
                    'project_id': row['project_id'],
                    'name': row['name'],
                    'snippet': row['snippet'],
                    'rank': row['rank']
                })

            return results

        except sqlite3.OperationalError as e:
            # Handle FTS5 query syntax errors
            raise ValueError(f"Invalid search query: {str(e)}")

    def get_indexed_document(self, path: str) -> Optional[Dict]:
        """
        Get indexed document metadata.

        Args:
            path: Absolute path to document

        Returns:
            Metadata dict or None if not indexed
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT path, indexed_time, modified_time, size
            FROM indexed_metadata
            WHERE path = ?
        """, (path,))

        row = cursor.fetchone()
        if row:
            return {
                'path': row['path'],
                'indexed_time': datetime.fromisoformat(row['indexed_time']),
                'modified_time': datetime.fromisoformat(row['modified_time']),
                'size': row['size']
            }

        return None

    def get_all_indexed_paths(self) -> List[str]:
        """
        Get list of all indexed document paths.

        Returns:
            List of absolute paths
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT path FROM indexed_metadata")
        rows = cursor.fetchall()

        return [row['path'] for row in rows]

    def clear_index(self):
        """Clear entire search index."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM documents_fts")
        cursor.execute("DELETE FROM indexed_metadata")

        conn.commit()

    def get_stats(self) -> Dict:
        """
        Get index statistics.

        Returns:
            Dict with document count and size info
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM indexed_metadata")
        count = cursor.fetchone()['count']

        cursor.execute("SELECT SUM(size) as total_size FROM indexed_metadata")
        total_size = cursor.fetchone()['total_size'] or 0

        return {
            'document_count': count,
            'total_size': total_size,
            'index_size': self.db_path.stat().st_size if self.db_path.exists() else 0
        }

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None

    def _extract_headers(self, content: str) -> str:
        """
        Extract markdown headers for separate indexing.

        Args:
            content: Markdown content

        Returns:
            Space-separated header text
        """
        headers = []
        for line in content.split('\n'):
            # Match markdown headers (# Header)
            if line.strip().startswith('#'):
                # Remove # symbols and whitespace
                header_text = line.lstrip('#').strip()
                if header_text:
                    headers.append(header_text)

        return ' '.join(headers)

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
