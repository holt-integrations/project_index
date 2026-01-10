"""
Export history tracking for PDF exports.

Maintains a record of all PDF exports with metadata.
"""
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional


class ExportHistory:
    """Track PDF export history."""

    def __init__(self, history_path: Path):
        """
        Initialize export history tracker.

        Args:
            history_path: Path to the JSON file storing export history
        """
        self.history_path = history_path
        self.history_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.history_path.exists():
            self._save_history([])

    def add_export(
        self,
        document_path: str,
        project_id: str,
        pdf_path: str,
        pdf_size: int
    ) -> None:
        """
        Record a new export.

        Args:
            document_path: Full path to source markdown document
            project_id: Project identifier
            pdf_path: Full path to generated PDF
            pdf_size: Size of PDF file in bytes
        """
        history = self._load_history()

        export_record = {
            'timestamp': datetime.now().isoformat(),
            'document_path': document_path,
            'document_name': Path(document_path).name,
            'project_id': project_id,
            'pdf_path': pdf_path,
            'pdf_size': pdf_size,
            'pdf_filename': Path(pdf_path).name
        }

        history.append(export_record)
        self._save_history(history)

    def get_history(
        self,
        limit: int = 50,
        project_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Get recent export history.

        Args:
            limit: Maximum number of records to return
            project_id: Optional filter by project ID

        Returns:
            List of export records, sorted by timestamp (newest first)
        """
        history = self._load_history()

        # Filter by project if specified
        if project_id:
            history = [h for h in history if h.get('project_id') == project_id]

        # Sort by timestamp (newest first) and limit
        return sorted(
            history,
            key=lambda x: x['timestamp'],
            reverse=True
        )[:limit]

    def get_export_by_filename(self, filename: str) -> Optional[Dict]:
        """
        Get export record by PDF filename.

        Args:
            filename: PDF filename to search for

        Returns:
            Export record if found, None otherwise
        """
        history = self._load_history()

        for record in history:
            if record.get('pdf_filename') == filename:
                return record

        return None

    def delete_export_record(self, pdf_filename: str) -> bool:
        """
        Delete an export record by PDF filename.

        Args:
            pdf_filename: Filename of the PDF to remove from history

        Returns:
            True if record was found and deleted, False otherwise
        """
        history = self._load_history()
        initial_count = len(history)

        history = [h for h in history if h.get('pdf_filename') != pdf_filename]

        if len(history) < initial_count:
            self._save_history(history)
            return True

        return False

    def get_stats(self) -> Dict:
        """
        Get statistics about exports.

        Returns:
            Dictionary with export statistics
        """
        history = self._load_history()

        if not history:
            return {
                'total_exports': 0,
                'total_size': 0,
                'projects': [],
                'most_exported_project': None
            }

        total_size = sum(h.get('pdf_size', 0) for h in history)

        # Count exports per project
        project_counts = {}
        for record in history:
            project_id = record.get('project_id', 'unknown')
            project_counts[project_id] = project_counts.get(project_id, 0) + 1

        most_exported = max(project_counts.items(), key=lambda x: x[1])[0] if project_counts else None

        return {
            'total_exports': len(history),
            'total_size': total_size,
            'projects': list(project_counts.keys()),
            'most_exported_project': most_exported,
            'exports_by_project': project_counts
        }

    def _load_history(self) -> List[Dict]:
        """
        Load history from file.

        Returns:
            List of export records
        """
        try:
            with open(self.history_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_history(self, history: List[Dict]) -> None:
        """
        Save history to file.

        Args:
            history: List of export records to save
        """
        with open(self.history_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2)
