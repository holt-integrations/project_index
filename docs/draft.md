## Project Viewer

A web application that dynmically scans the contents of `~/Projects` to produce a list of important markdown documents. Allows the user to select a specific markdown document which is rendered to display comfortable formatting that's also able to handle ASCII diagrams, mermaid, etc. 

This would provie a way to easily navigate all projects and documentation in the main Projects folder in one place. 

Features:

- Convert a markdown file to PDF with a single click (saves to a folder in the Project Viewer's scope, not the targeted project).
- When browsing project files/documentation, indicate where in the overall project structure they are located.
- Intuitive navigation and search feature.
- Instead of a database, create a service or a scheduled task that simply updates/refreshes a manifest file that can be used by the main app as a source of truth for the list of projects, their structures, and documentation.
- Uses established conventions such as targeting a `docs` directory in the root of each project.
- Avoids cluttering the interface by skipping directories known to contain librbaries, modules, etc. The app is a way to view documentation and get a sense of project structures, not list out overly verbose content.
- Since the app will be running on the same file system as the projects, it can selectively iterate and display files using file system commands as needed.

Bottom line: its a web app hosted on this Raspberry Pi that let's me navigate, search, and view project documentation in a web browser.