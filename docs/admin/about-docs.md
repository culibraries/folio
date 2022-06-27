# About this documentation

This documentation is using

- [ReadTheDocs](https://readthedocs.org/projects/folio-at-cu/) for publishing and a theme
- [Sphinx](https://www.sphinx-doc.org/en/master/index.html) with both reStructuredText and Markdown for writing and structuring
  - [An introduction to Sphinx and Read the Docs for Technical Writers](https://www.ericholscher.com/blog/2016/jul/1/sphinx-and-rtd-for-writers/)
- [Mermaid](https://mermaid-js.github.io/mermaid/#/) for diagrams

## Contributing to the documentation

### Working locally

Requires

- git

1. Clone Repository or refresh your version with the latest changes

    ```sh
    # Fresh clone
    git clone git@github.com:culibraries/documentation.git
    # Update local version with any changes
    git checkout main
    git pull

    ```

1. Create a new branch. The name of the branch usually relates to the GitHub Issue you are working on. Example: `issue/20`.

    ```sh
    git checkout -n [new-branch-name]
    ```

1. Make your changes and commit your work.

    ```sh
    git add *  # Stages all new and changed files
    git commit -m "Message about what you changed" # Commit your changes to the local copy of your branch
    git push --set-upstream origin [new-branch-name] # Push your changes out to GitHub
    ```

1. Open a Pull (Merge) Request.
    1. Visit the [Compare changes](https://github.com/culibraries/folio/compare) webpage and create a Pull Request with `main` as the base and `[my-new-branch]` as the comparison.
    1. A version of the documentation with your changes is created and linked in the open Pull Request
    1. We recommend having another person review and merge your changes. You can use the `Reviewers` section to request a review and generate a notification to the requested Reviewers.

### Working in your browser

1. Create a new branch. The name of the branch usually relates to the GitHub Issue you are working on. Example: `issue/20`.
    1. Visit the [Branch webpage](https://github.com/culibraries/folio/branches) and create a `New Branch`
1. Return to the [main page for the repository](https://github.com/culibraries/folio) and chose the branch you created.
1. Navigate the file structure and make your changes, committing each file you edit.
1. Open a Pull (Merge) Request.
    1. Visit the [Compare changes](https://github.com/culibraries/folio/compare) webpage and create a Pull Request with `main` as the base and `[my-new-branch]` as the comparison.
    1. A version of the documentation with your changes is created and linked in the open Pull Request
    1. We recommend having another person review and merge your changes. You can use the `Reviewers` section to request a review and generate a notification to the requested Reviewers.

## Building documentation locally

Building the documentation locally will allow you to preview your changes before submitting them. It is **not required** in order to contribute, it can be a helpful tool.

## Installation

Requires

- Python 3.3 or greater
- git

1. Clone Repository

    ```sh
    git clone git@github.com:culibraries/documentation.git
    ```

2. Create Virtual Environment and install packages

    ```sh
    # Enter in this repository
    cd folio
    # Use python to create a virtual environment to build the documentation
    python3 -m venv venv
    # Begin to utilize the new virtual environment
    . venv/bin/activate
    # Install the packages required to build the documentation
    pip install -r requirements.txt
    ```

    On Windows using a cmd.exe shell

    ```sh
    # Enter in this repository
    cd folio
    # Use python to create a virtual environment to build the documentation
    python3 -m venv <dir>
    # Begin to utilize the new virtual environment
    venv\Scripts\activate.bat
    # Install the packages required to build the documentation
    pip install -r requirements.txt
    ```

## Build the documentation

You can open the local `folio/docs/_build/html/index.html` file in a browser and see the documentation. You need to "build" the documentation and refresh the webpage after each change.

```sh
cd docs
make html
```

## FOLIO Apps Documentation Markup Keys

This is a style guide to help deferentiate different actions within the FOLIO LSP documentation

- [App level](/apps/index) interactions should be enclosed with a single grave accent (found on tilde key next to the number 1 key) `` ` ``

    ```md
    `Users App`
    ```

- Dropdown menus and click box titles should be enclosed with a single asterisk `*`

    ```md
    *Dropdown menu and click boxes*
    ```

- Radio buttons should be enclosed in double asterisks `**`

    ```md
    **Radio buttons**
    ```
