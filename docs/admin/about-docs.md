# About this documentation

This documentation is using

- [ReadTheDocs](https://readthedocs.org/projects/folio-at-cu/) for publishing and a theme
- [Sphinx](https://www.sphinx-doc.org/en/master/index.html) with both reStructuredText and Markdown for writing and structuring
  - [An introduction to Sphinx and Read the Docs for Technical Writers](https://www.ericholscher.com/blog/2016/jul/1/sphinx-and-rtd-for-writers/)
- [Mermaid](https://mermaid-js.github.io/mermaid/#/) for diagrams

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

## Documentation Markup Keys

1. App level should be enclosed with a single grave accent 
[found on tilde key next to the number 1 key] (`)

             `Users App` displays as 

`Users App`

2. Dropdown menus and click box titles should be enclosed with a single asterisk 

            *Dropdown menu and click boxes* displays as

*Dropdown menu and click boxes*  


1. Radio buttons should be enclosed in double asterisks to mark in bold

            **Radio buttons** displays as 

**Radio buttons**